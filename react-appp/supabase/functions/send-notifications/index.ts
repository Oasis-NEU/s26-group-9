// @ts-nocheck
// Supabase Edge Function: send-notifications
// Requires env vars:
// - SUPABASE_URL
// - SUPABASE_SERVICE_ROLE_KEY
// - RESEND_API_KEY (optional, for email)
// - TWILIO_ACCOUNT_SID (optional, for SMS)
// - TWILIO_AUTH_TOKEN (optional, for SMS)
// - TWILIO_FROM_NUMBER (optional, for SMS)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
});

async function sendEmail(subject: string | null, body: string, recipientEmail: string) {
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
        throw new Error("RESEND_API_KEY is not configured");
    }

    const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            from: "notifications@your-domain.com",
            to: [recipientEmail],
            subject: subject || "Productivitea notification",
            html: `<p>${body}</p>`,
        }),
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Email send failed: ${text}`);
    }
}

async function sendSms(body: string, toPhone: string) {
    const sid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const token = Deno.env.get("TWILIO_AUTH_TOKEN");
    const from = Deno.env.get("TWILIO_FROM_NUMBER");

    if (!sid || !token || !from) {
        throw new Error("Twilio credentials are not configured");
    }

    const auth = btoa(`${sid}:${token}`);
    const form = new URLSearchParams({
        To: toPhone,
        From: from,
        Body: body,
    });

    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: "POST",
        headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: form.toString(),
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`SMS send failed: ${text}`);
    }
}

Deno.serve(async () => {
    const nowIso = new Date().toISOString();

    const { data: jobs, error: fetchError } = await supabase
        .from("notification_delivery_queue")
        .select("id, recipient_user_id, channel, subject, body, metadata")
        .eq("status", "queued")
        .lte("scheduled_for", nowIso)
        .order("scheduled_for", { ascending: true })
        .limit(50);

    if (fetchError) {
        return new Response(JSON.stringify({ ok: false, error: fetchError.message }), { status: 500 });
    }

    const processed: Array<{ id: string; ok: boolean; error?: string }> = [];

    for (const job of jobs || []) {
        try {
            const { data: userRow } = await supabase
                .from("users")
                .select("email, phone_number")
                .eq("id", job.recipient_user_id)
                .maybeSingle();

            if (job.channel === "email") {
                const recipient = userRow?.email;
                if (!recipient) throw new Error("Missing recipient email");
                await sendEmail(job.subject, job.body || "", recipient);
            } else {
                const metadataPhone = job?.metadata?.phone;
                const recipient = metadataPhone || userRow?.phone_number;
                if (!recipient) throw new Error("Missing recipient phone number");
                await sendSms(job.body || "", recipient);
            }

            await supabase
                .from("notification_delivery_queue")
                .update({ status: "sent", sent_at: new Date().toISOString() })
                .eq("id", job.id);

            processed.push({ id: job.id, ok: true });
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);

            await supabase
                .from("notification_delivery_queue")
                .update({
                    status: "failed",
                    attempts: 1,
                    last_error: message,
                })
                .eq("id", job.id);

            processed.push({ id: job.id, ok: false, error: message });
        }
    }

    return new Response(JSON.stringify({ ok: true, processed }), {
        headers: { "Content-Type": "application/json" },
    });
});
