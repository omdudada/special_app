create table public.creator_accounts (
  id uuid primary key references auth.users(id) on delete cascade,
  email text, created_at timestamptz not null default now());
create function public.handle_new_creator() returns trigger language plpgsql security definer set search_path = public as $$
begin insert into public.creator_accounts(id,email) values (new.id,new.email); return new; end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_creator();

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  public_id text unique not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  recipient_name text not null, title text not null, message_text text not null,
  closing_line text, audio_url text not null,
  character_id text not null default 'default', theme text not null default 'sunny',
  created_at timestamptz not null default now(), expires_at timestamptz, active boolean not null default true);

create table public.message_events (
  id bigint generated always as identity primary key,
  message_id uuid not null references public.messages(id) on delete cascade,
  event_type text not null check (event_type in ('OPENED','AUDIO_STARTED','AUDIO_COMPLETED','REPLAYED')),
  created_at timestamptz not null default now());
create index on public.message_events(message_id);

alter table public.creator_accounts enable row level security;
alter table public.messages enable row level security;
alter table public.message_events enable row level security;
-- Creators only see their own rows. There is NO anon policy: recipients are served
-- by server routes (service role) that return only the public fields.
create policy "own account" on public.creator_accounts for select using (id = auth.uid());
create policy "own messages select" on public.messages for select using (owner_id = auth.uid());
create policy "own messages insert" on public.messages for insert with check (owner_id = auth.uid());
create policy "own messages update" on public.messages for update using (owner_id = auth.uid());
create policy "own messages delete" on public.messages for delete using (owner_id = auth.uid());
create policy "own events select" on public.message_events for select
  using (exists (select 1 from public.messages m where m.id = message_id and m.owner_id = auth.uid()));

insert into storage.buckets (id,name,public) values ('audio','audio',true) on conflict do nothing;
