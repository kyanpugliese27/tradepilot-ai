-- Run this in the Supabase SQL Editor after creating the project.

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  risk_preference text default 'moderate',
  subscription_tier text default 'free',
  created_at timestamptz default now()
);

create table public.watchlists (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  ticker text not null,
  created_at timestamptz default now(),
  unique(user_id, ticker)
);

create table public.portfolio_positions (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  ticker text not null,
  shares numeric not null check (shares >= 0),
  average_cost numeric check (average_cost >= 0),
  created_at timestamptz default now()
);

create table public.alerts (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  ticker text not null,
  alert_type text not null,
  threshold numeric,
  enabled boolean default true,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;
alter table public.watchlists enable row level security;
alter table public.portfolio_positions enable row level security;
alter table public.alerts enable row level security;

create policy "Users read own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users update own profile" on public.profiles for update using (auth.uid() = id);

create policy "Users manage own watchlist" on public.watchlists
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own positions" on public.portfolio_positions
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own alerts" on public.alerts
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
