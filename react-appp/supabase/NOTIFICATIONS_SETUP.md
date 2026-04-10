# Notification Delivery Setup (Email + SMS)

This project now supports queued delivery for:
- `nudge` notifications
- `deadline_24h` reminders

## 1) Run SQL migration
In Supabase SQL Editor, run:
- `supabase/notifications_delivery.sql`

This adds:
- new fields on `notification_settings`
- `notification_delivery_queue`
- triggers to enqueue nudge and 24h deadline jobs

## 2) Deploy edge function
From project root:

```bash
supabase functions deploy send-notifications
```

Function file:
- `supabase/functions/send-notifications/index.ts`

## 3) Set required secrets
Set these in Supabase project secrets:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY` (for email)
- `TWILIO_ACCOUNT_SID` (for SMS)
- `TWILIO_AUTH_TOKEN` (for SMS)
- `TWILIO_FROM_NUMBER` (for SMS)

## 4) Schedule delivery runner
Use Supabase scheduled functions / cron to call `send-notifications` every minute.

Example cadence:
- every 1 minute

## 5) Enable preferences in app
Users can now configure in Settings -> Notifications:
- Deadline reminders
- Nudge notifications
- Email notifications
- SMS notifications
- SMS phone

## Notes
- The app enqueues jobs; actual sending happens in the edge function.
- If provider secrets are missing, jobs will be marked `failed` with `last_error`.
