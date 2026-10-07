-- Run this once in Supabase > SQL Editor. (Old tables from the first version can stay or be dropped.)
create table public.visits (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  created_at timestamptz not null default now(),       -- when they typed their name (page opened)
  audio_started_at timestamptz,
  audio_completed_at timestamptz,
  replay_count int not null default 0
);
-- RLS on with NO policies: the public can't read or write anything directly.
-- Only the server routes (service-role key) touch this table.
alter table public.visits enable row level security;
