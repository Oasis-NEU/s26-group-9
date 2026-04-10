-- In-app notifications only mode
-- Run this in Supabase SQL Editor when you want to prioritize in-app Inbox nudges
-- and temporarily disable email/SMS delivery triggers.

-- Disable delivery triggers so inserting into public.nudge_notifications never fails
-- because of notification_settings schema drift.
drop trigger if exists trg_enqueue_nudge_delivery_jobs on public.nudge_notifications;
drop trigger if exists trg_enqueue_deadline_24h_delivery_jobs on public.tasks;

-- Optional cleanup: leave functions installed, but not active.
-- drop function if exists public.enqueue_nudge_delivery_jobs();
-- drop function if exists public.enqueue_deadline_24h_delivery_jobs();
