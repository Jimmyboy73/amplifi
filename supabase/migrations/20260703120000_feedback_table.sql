-- Feedback feature (apps/web): in-app feedback form.
-- Run in the Supabase SQL Editor (migrations are applied manually in this project).
--
-- Note: the one-time welcome flag is stored in auth user metadata
-- (has_seen_welcome), so it needs NO schema change — only this table is required.

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  email text,
  message text not null,
  created_at timestamptz not null default now()
);

-- RLS: a logged-in user may insert only their own feedback row.
alter table public.feedback enable row level security;

grant insert on public.feedback to authenticated;

drop policy if exists "Users can insert own feedback" on public.feedback;
create policy "Users can insert own feedback"
  on public.feedback
  for insert
  to authenticated
  with check (auth.uid() = user_id);
