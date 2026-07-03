-- TripBoard V1 Supabase schema
-- 用途：把整份 TripBoard App 狀態以 JSONB 儲存在每個登入使用者名下。
-- 優點：V1 設定簡單、適合個人多裝置同步。
-- 注意：請在 Supabase SQL Editor 執行。

create table if not exists public.tripboard_app_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  app_state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.tripboard_app_state enable row level security;

drop policy if exists "TripBoard users can read own state" on public.tripboard_app_state;
drop policy if exists "TripBoard users can insert own state" on public.tripboard_app_state;
drop policy if exists "TripBoard users can update own state" on public.tripboard_app_state;
drop policy if exists "TripBoard users can delete own state" on public.tripboard_app_state;

create policy "TripBoard users can read own state"
on public.tripboard_app_state
for select
to authenticated
using (auth.uid() = user_id);

create policy "TripBoard users can insert own state"
on public.tripboard_app_state
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "TripBoard users can update own state"
on public.tripboard_app_state
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "TripBoard users can delete own state"
on public.tripboard_app_state
for delete
to authenticated
using (auth.uid() = user_id);

create or replace function public.set_tripboard_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_tripboard_app_state_updated_at on public.tripboard_app_state;
create trigger set_tripboard_app_state_updated_at
before update on public.tripboard_app_state
for each row
execute function public.set_tripboard_updated_at();
