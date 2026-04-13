-- Single user dashboard (user_id = 'yumi' hardcoded, no auth needed)

-- Habits
create table if not exists habits (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz default now()
);

-- Health
create table if not exists health (
  id text primary key default 'singleton',
  data jsonb not null,
  updated_at timestamptz default now()
);

-- Goals
create table if not exists goals (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz default now()
);

-- Points log
create table if not exists points_log (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz default now()
);

-- Rewards
create table if not exists rewards (
  id text primary key default 'singleton',
  data jsonb not null,
  updated_at timestamptz default now()
);

-- Home data
create table if not exists home_data (
  id text primary key default 'singleton',
  data jsonb not null,
  updated_at timestamptz default now()
);

-- Hobbies data
create table if not exists hobbies_data (
  id text primary key default 'singleton',
  data jsonb not null,
  updated_at timestamptz default now()
);

-- Personal tasks
create table if not exists personal_tasks (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz default now()
);

-- Card benefits (stored as single blob)
create table if not exists card_benefits (
  id text primary key default 'singleton',
  data jsonb not null,
  updated_at timestamptz default now()
);

-- Tax filing status
create table if not exists tax_filing (
  id text primary key default 'singleton',
  data jsonb not null,
  updated_at timestamptz default now()
);

-- EE Bonds
create table if not exists ee_bonds (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz default now()
);

-- Savings goals
create table if not exists savings_goals (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz default now()
);

-- Net worth trend
create table if not exists networth_trend (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz default now()
);

-- Cleaning checklist
create table if not exists cleaning_checklist (
  id text primary key default 'singleton',
  data jsonb not null,
  updated_at timestamptz default now()
);

-- Enable RLS but allow all access (single user, no auth)
alter table habits enable row level security;
alter table health enable row level security;
alter table goals enable row level security;
alter table points_log enable row level security;
alter table rewards enable row level security;
alter table home_data enable row level security;
alter table hobbies_data enable row level security;
alter table personal_tasks enable row level security;
alter table card_benefits enable row level security;
alter table tax_filing enable row level security;
alter table ee_bonds enable row level security;
alter table savings_goals enable row level security;
alter table networth_trend enable row level security;
alter table cleaning_checklist enable row level security;

-- Allow all operations for anon key (single user dashboard)
create policy "Allow all" on habits for all using (true) with check (true);
create policy "Allow all" on health for all using (true) with check (true);
create policy "Allow all" on goals for all using (true) with check (true);
create policy "Allow all" on points_log for all using (true) with check (true);
create policy "Allow all" on rewards for all using (true) with check (true);
create policy "Allow all" on home_data for all using (true) with check (true);
create policy "Allow all" on hobbies_data for all using (true) with check (true);
create policy "Allow all" on personal_tasks for all using (true) with check (true);
create policy "Allow all" on card_benefits for all using (true) with check (true);
create policy "Allow all" on tax_filing for all using (true) with check (true);
create policy "Allow all" on ee_bonds for all using (true) with check (true);
create policy "Allow all" on savings_goals for all using (true) with check (true);
create policy "Allow all" on networth_trend for all using (true) with check (true);
create policy "Allow all" on cleaning_checklist for all using (true) with check (true);
