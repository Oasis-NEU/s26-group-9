-- Run this in Supabase SQL Editor.
-- Creates: profiles, tasks, subtasks, sessions, friendships.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
    id uuid primary key references auth.users (id) on delete cascade,
    full_name text,
    avatar_url text,
    created_at timestamptz not null default now()
);

create table if not exists public.tasks (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users (id) on delete cascade,
    title text not null,
    status text not null default 'in_progress',
    time_spent_mins integer not null default 0,
    created_at timestamptz not null default now()
);

create table if not exists public.subtasks (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users (id) on delete cascade,
    task_id uuid not null references public.tasks (id) on delete cascade,
    title text not null,
    is_done boolean not null default false,
    created_at timestamptz not null default now()
);

create table if not exists public.sessions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users (id) on delete cascade,
    task_id uuid references public.tasks (id) on delete set null,
    duration_mins integer not null default 0,
    started_at timestamptz,
    created_at timestamptz not null default now()
);

create table if not exists public.friendships (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users (id) on delete cascade,
    friend_id uuid not null references auth.users (id) on delete cascade,
    status text not null default 'accepted',
    created_at timestamptz not null default now(),
    constraint friendships_no_self_friend check (user_id <> friend_id),
    constraint friendships_unique_pair unique (user_id, friend_id)
);

create table subtasks (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references tasks(id) on delete cascade,
  text text not null,
  done boolean default false
);

create table if not exists public.notification_settings (
    user_id uuid primary key references auth.users (id) on delete cascade,
    deadline_reminders boolean not null default true,
    nudge_notifications boolean not null default true,
    friend_request_notifications boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.tasks enable row level security;
alter table public.subtasks enable row level security;
alter table public.sessions enable row level security;
alter table public.friendships enable row level security;
alter table public.notification_settings enable row level security;

create policy if not exists "profiles_select_own" on public.profiles
for select using (auth.uid() = id);

create policy if not exists "profiles_update_own" on public.profiles
for update using (auth.uid() = id);

create policy if not exists "profiles_insert_own" on public.profiles
for insert with check (auth.uid() = id);

create policy if not exists "tasks_owner_all" on public.tasks
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy if not exists "subtasks_owner_all" on public.subtasks
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy if not exists "sessions_owner_all" on public.sessions
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy if not exists "friendships_participant_select" on public.friendships
for select using (auth.uid() = user_id or auth.uid() = friend_id);

create policy if not exists "friendships_owner_insert" on public.friendships
for insert with check (auth.uid() = user_id);

create policy if not exists "friendships_owner_update" on public.friendships
for update using (auth.uid() = user_id);

create policy if not exists "friendships_owner_delete" on public.friendships
for delete using (auth.uid() = user_id);

create policy if not exists "notification_settings_select_own" on public.notification_settings
for select using (auth.uid() = user_id);

create policy if not exists "notification_settings_update_own" on public.notification_settings
for update using (auth.uid() = user_id);

create policy if not exists "notification_settings_insert_own" on public.notification_settings
for insert with check (auth.uid() = user_id);
