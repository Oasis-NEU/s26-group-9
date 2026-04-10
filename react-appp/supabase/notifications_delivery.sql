-- Notification delivery migration (email + SMS)
-- Run this in Supabase SQL Editor.
-- This creates a delivery queue and trigger-based enqueue for:
-- 1) Nudge notifications (immediate)
-- 2) Deadline reminders (24 hours before due date)

create extension if not exists pgcrypto;

alter table public.notification_settings
  add column if not exists email_notifications boolean not null default true,
  add column if not exists sms_notifications boolean not null default false,
  add column if not exists sms_phone text;

create table if not exists public.notification_delivery_queue (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid not null references auth.users(id) on delete cascade,
  channel text not null check (channel in ('email', 'sms')),
  event_type text not null check (event_type in ('nudge', 'deadline_24h')),
  subject text,
  body text,
  metadata jsonb not null default '{}'::jsonb,
  scheduled_for timestamptz not null default now(),
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed', 'canceled')),
  attempts integer not null default 0,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_notification_delivery_queue_due
  on public.notification_delivery_queue (status, scheduled_for);

alter table public.notification_delivery_queue enable row level security;

drop policy if exists notification_delivery_queue_select_own on public.notification_delivery_queue;
create policy notification_delivery_queue_select_own
on public.notification_delivery_queue
for select
using (auth.uid() = recipient_user_id);

-- Trigger: enqueue outgoing delivery jobs for new nudges.
create or replace function public.enqueue_nudge_delivery_jobs()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  prefs record;
  delivery_phone text;
begin
  select ns.*, u.email, u.phone_number
  into prefs
  from public.notification_settings ns
  left join public.users u on u.id = new.receiver_id
  where ns.user_id = new.receiver_id;

  if coalesce(prefs.nudge_notifications, true) = false then
    return new;
  end if;

  delivery_phone := coalesce(nullif(trim(prefs.sms_phone), ''), nullif(trim(prefs.phone_number), ''));

  if coalesce(prefs.email_notifications, true) and prefs.email is not null then
    insert into public.notification_delivery_queue (
      recipient_user_id,
      channel,
      event_type,
      subject,
      body,
      metadata,
      scheduled_for
    ) values (
      new.receiver_id,
      'email',
      'nudge',
      'You received a nudge',
      coalesce(new.message, 'A friend nudged you to get back to studying.'),
      jsonb_build_object('nudge_id', new.id, 'sender_id', new.sender_id),
      now()
    );
  end if;

  if coalesce(prefs.sms_notifications, false) and delivery_phone is not null then
    insert into public.notification_delivery_queue (
      recipient_user_id,
      channel,
      event_type,
      subject,
      body,
      metadata,
      scheduled_for
    ) values (
      new.receiver_id,
      'sms',
      'nudge',
      null,
      coalesce(new.message, 'A friend nudged you to get back to studying.'),
      jsonb_build_object('nudge_id', new.id, 'sender_id', new.sender_id, 'phone', delivery_phone),
      now()
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enqueue_nudge_delivery_jobs on public.nudge_notifications;
create trigger trg_enqueue_nudge_delivery_jobs
after insert on public.nudge_notifications
for each row
execute procedure public.enqueue_nudge_delivery_jobs();

-- Trigger: enqueue 24-hour deadline reminders when task due date/time changes.
create or replace function public.enqueue_deadline_24h_delivery_jobs()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  prefs record;
  delivery_phone text;
  due_at timestamptz;
  reminder_at timestamptz;
  effective_due_time time;
  clean_status text;
begin
  clean_status := lower(coalesce(new.status, ''));

  delete from public.notification_delivery_queue q
  where q.recipient_user_id = new.user_id
    and q.event_type = 'deadline_24h'
    and q.status = 'queued'
    and (q.metadata ->> 'task_id') = new.id::text;

  if new.due_date is null then
    return new;
  end if;

  if clean_status in ('completed', 'done') then
    return new;
  end if;

  select ns.*, u.email, u.phone_number
  into prefs
  from public.notification_settings ns
  left join public.users u on u.id = new.user_id
  where ns.user_id = new.user_id;

  if coalesce(prefs.deadline_reminders, true) = false then
    return new;
  end if;

  effective_due_time := coalesce(new.due_time, time '09:00:00');
  due_at := (new.due_date::timestamp + effective_due_time);
  reminder_at := due_at - interval '24 hour';

  if reminder_at <= now() then
    return new;
  end if;

  delivery_phone := coalesce(nullif(trim(prefs.sms_phone), ''), nullif(trim(prefs.phone_number), ''));

  if coalesce(prefs.email_notifications, true) and prefs.email is not null then
    insert into public.notification_delivery_queue (
      recipient_user_id,
      channel,
      event_type,
      subject,
      body,
      metadata,
      scheduled_for
    ) values (
      new.user_id,
      'email',
      'deadline_24h',
      'Task due in 24 hours',
      format('Reminder: "%s" is due in 24 hours.', coalesce(new.title, 'A task')),
      jsonb_build_object('task_id', new.id, 'title', coalesce(new.title, 'A task')),
      reminder_at
    );
  end if;

  if coalesce(prefs.sms_notifications, false) and delivery_phone is not null then
    insert into public.notification_delivery_queue (
      recipient_user_id,
      channel,
      event_type,
      subject,
      body,
      metadata,
      scheduled_for
    ) values (
      new.user_id,
      'sms',
      'deadline_24h',
      null,
      format('Reminder: "%s" is due in 24 hours.', coalesce(new.title, 'A task')),
      jsonb_build_object('task_id', new.id, 'title', coalesce(new.title, 'A task'), 'phone', delivery_phone),
      reminder_at
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enqueue_deadline_24h_delivery_jobs on public.tasks;
create trigger trg_enqueue_deadline_24h_delivery_jobs
after insert or update of title, status, due_date, due_time on public.tasks
for each row
execute procedure public.enqueue_deadline_24h_delivery_jobs();
