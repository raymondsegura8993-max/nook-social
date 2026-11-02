create table if not exists public.nook_battles (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 100),
  details text not null default '' check (char_length(details) <= 2000),
  ends_at timestamptz,
  status text not null default 'open' check (status in ('open','closed')),
  created_at timestamptz not null default now()
);
create table if not exists public.nook_battle_entries (
  id uuid primary key default gen_random_uuid(),
  battle_id uuid not null references public.nook_battles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_text text not null check (char_length(entry_text) between 1 and 1000),
  created_at timestamptz not null default now(),
  unique (battle_id, user_id)
);
create table if not exists public.nook_supporters (
  id uuid primary key default gen_random_uuid(),
  supporter_id uuid not null references auth.users(id) on delete cascade,
  creator_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (supporter_id, creator_id),
  check (supporter_id <> creator_id)
);
create index if not exists nook_battles_created_idx on public.nook_battles(created_at desc);
create index if not exists nook_battle_entries_battle_idx on public.nook_battle_entries(battle_id, created_at);
create index if not exists nook_supporters_creator_idx on public.nook_supporters(creator_id, created_at desc);
alter table public.nook_battles enable row level security;
alter table public.nook_battle_entries enable row level security;
alter table public.nook_supporters enable row level security;
grant select, insert, update, delete on public.nook_battles to authenticated;
grant select, insert, update, delete on public.nook_battle_entries to authenticated;
grant select, insert, delete on public.nook_supporters to authenticated;
create policy "Signed-in users can view Nook battles" on public.nook_battles for select to authenticated using (true);
create policy "Users can create their own Nook battles" on public.nook_battles for insert to authenticated with check ((select auth.uid()) = creator_id);
create policy "Creators can update their own Nook battles" on public.nook_battles for update to authenticated using ((select auth.uid()) = creator_id) with check ((select auth.uid()) = creator_id);
create policy "Creators can delete their own Nook battles" on public.nook_battles for delete to authenticated using ((select auth.uid()) = creator_id);
create policy "Signed-in users can view battle entries" on public.nook_battle_entries for select to authenticated using (true);
create policy "Users can enter open battles as themselves" on public.nook_battle_entries for insert to authenticated with check ((select auth.uid()) = user_id and exists (select 1 from public.nook_battles b where b.id = battle_id and b.status = 'open' and (b.ends_at is null or b.ends_at > now())));
create policy "Users can edit their own battle entry" on public.nook_battle_entries for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users can remove their own battle entry" on public.nook_battle_entries for delete to authenticated using ((select auth.uid()) = user_id);
create policy "Signed-in users can view Nook supporters" on public.nook_supporters for select to authenticated using (true);
create policy "Users can support creators as themselves" on public.nook_supporters for insert to authenticated with check ((select auth.uid()) = supporter_id and supporter_id <> creator_id);
create policy "Users can remove their own support" on public.nook_supporters for delete to authenticated using ((select auth.uid()) = supporter_id);