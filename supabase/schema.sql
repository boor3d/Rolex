-- ============================================================================
-- The Collection — database schema (Phase 1)
-- Run once in Supabase: Dashboard → SQL Editor → New query → paste → Run.
-- Safe to re-run: every statement is idempotent.
--
-- Privacy model: every row belongs to one user and Row Level Security limits
-- reads and writes to that user. Prices live in their own table so a future
-- public-profile view can expose watches without ever touching financials.
-- ============================================================================

-- ---------- profiles --------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  handle      text unique check (handle ~ '^[a-z0-9_-]{3,30}$'),
  name        text not null default 'My Collection',
  owner       text,
  tagline     text,
  currency    text not null default 'USD',
  is_public   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------- watches ---------------------------------------------------------
create table if not exists public.watches (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  ref          text,
  family       text,
  model        text,
  nickname     text,
  year         int check (year between 1900 and 2100),
  size         numeric,
  metal        text,
  bezel        text,
  dial         text,
  bracelet     text,
  caliber      text,
  box_papers   text,          -- full | papers | box | none
  condition    text,
  last_service date,
  notes        text,
  featured     boolean not null default false,
  is_public    boolean not null default true,  -- for future public profiles
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists watches_user_idx on public.watches (user_id);

-- ---------- private financials (owner-only, never public) -------------------
create table if not exists public.watch_finance (
  watch_id        uuid primary key references public.watches (id) on delete cascade,
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  purchase_date   date,
  purchase_price  numeric check (purchase_price >= 0),
  purchased_from  text,
  estimated_value numeric check (estimated_value >= 0),
  valuation_date  date,
  updated_at      timestamptz not null default now()
);
create index if not exists watch_finance_user_idx on public.watch_finance (user_id);

-- ---------- valuation history ----------------------------------------------
create table if not exists public.valuations (
  id         bigint generated always as identity primary key,
  watch_id   uuid not null references public.watches (id) on delete cascade,
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  valued_on  date not null default current_date,
  value      numeric not null check (value >= 0),
  created_at timestamptz not null default now()
);
create index if not exists valuations_watch_idx on public.valuations (watch_id, valued_on);
create index if not exists valuations_user_idx on public.valuations (user_id);

-- ---------- photos (files live in Storage bucket 'watch-photos') ------------
create table if not exists public.watch_photos (
  id         uuid primary key default gen_random_uuid(),
  watch_id   uuid not null references public.watches (id) on delete cascade,
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  path       text not null,           -- <user_id>/<watch_id>/<uuid>.jpg
  sort       int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists watch_photos_watch_idx on public.watch_photos (watch_id, sort);
create index if not exists watch_photos_user_idx on public.watch_photos (user_id);

-- ---------- references a user adds to their own catalog ---------------------
create table if not exists public.custom_references (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  ref        text not null,
  data       jsonb not null,
  created_at timestamptz not null default now(),
  unique (user_id, ref)
);

-- ---------- updated_at triggers ---------------------------------------------
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();
drop trigger if exists watches_touch on public.watches;
create trigger watches_touch before update on public.watches for each row execute function public.touch_updated_at();
drop trigger if exists watch_finance_touch on public.watch_finance;
create trigger watch_finance_touch before update on public.watch_finance for each row execute function public.touch_updated_at();

-- ---------- create a profile for every new account --------------------------
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill profiles for any accounts created before this script ran.
insert into public.profiles (id) select id from auth.users on conflict (id) do nothing;

-- ---------- Row Level Security ----------------------------------------------
alter table public.profiles          enable row level security;
alter table public.watches           enable row level security;
alter table public.watch_finance     enable row level security;
alter table public.valuations        enable row level security;
alter table public.watch_photos      enable row level security;
alter table public.custom_references enable row level security;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles for all to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

drop policy if exists "own watches" on public.watches;
create policy "own watches" on public.watches for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "own finance" on public.watch_finance;
create policy "own finance" on public.watch_finance for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid())
              and exists (select 1 from public.watches w where w.id = watch_id and w.user_id = (select auth.uid())));

drop policy if exists "own valuations" on public.valuations;
create policy "own valuations" on public.valuations for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid())
              and exists (select 1 from public.watches w where w.id = watch_id and w.user_id = (select auth.uid())));

drop policy if exists "own photos" on public.watch_photos;
create policy "own photos" on public.watch_photos for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid())
              and exists (select 1 from public.watches w where w.id = watch_id and w.user_id = (select auth.uid())));

drop policy if exists "own references" on public.custom_references;
create policy "own references" on public.custom_references for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Explicit grants: signed-in users only; anonymous visitors get nothing.
revoke all on public.profiles, public.watches, public.watch_finance, public.valuations,
              public.watch_photos, public.custom_references from anon;
grant select, insert, update, delete on public.profiles, public.watches, public.watch_finance,
              public.valuations, public.watch_photos, public.custom_references to authenticated;

-- ---------- Storage: private bucket, one folder per user --------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('watch-photos', 'watch-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
                                allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "watch photos: read own" on storage.objects;
create policy "watch photos: read own" on storage.objects for select to authenticated
  using (bucket_id = 'watch-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "watch photos: upload own" on storage.objects;
create policy "watch photos: upload own" on storage.objects for insert to authenticated
  with check (bucket_id = 'watch-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "watch photos: update own" on storage.objects;
create policy "watch photos: update own" on storage.objects for update to authenticated
  using (bucket_id = 'watch-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "watch photos: delete own" on storage.objects;
create policy "watch photos: delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'watch-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
