create extension if not exists "pgcrypto";

create table if not exists public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  streak_threshold smallint not null default 80 check (streak_threshold between 1 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  auth_subject text unique,
  display_name text not null,
  role text not null check (role in ('parent', 'child')),
  experience_mode text check (experience_mode in ('adventure', 'pro')),
  avatar text not null default '🛡️',
  pin_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.children (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  family_id uuid not null references public.families(id) on delete cascade,
  birth_year smallint,
  total_xp integer not null default 0 check (total_xp >= 0),
  coin_balance integer not null default 0 check (coin_balance >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  created_by uuid not null references public.profiles(id),
  name text not null,
  description text not null default '',
  category text not null default 'Base',
  difficulty text not null default 'normal' check (difficulty in ('easy', 'normal', 'important', 'challenge', 'special')),
  xp integer not null default 20 check (xp >= 0),
  coins integer not null default 5 check (coins >= 0),
  penalty_coins integer not null default 0 check (penalty_coins >= 0),
  recurrence jsonb,
  due_time time,
  requires_approval boolean not null default false,
  requires_photo boolean not null default false,
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.task_assignments (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  scheduled_for date not null,
  status text not null default 'pending' check (status in ('pending', 'completed', 'waiting_approval', 'approved', 'returned', 'late', 'missed', 'excused')),
  completed_at timestamptz,
  approved_at timestamptz,
  approved_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (task_id, child_id, scheduled_for)
);

create table if not exists public.task_evidence (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  assignment_id uuid not null references public.task_assignments(id) on delete cascade,
  submitted_by uuid not null references public.profiles(id),
  storage_path text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.xp_transactions (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  amount integer not null check (amount > 0),
  source_type text not null,
  source_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.coin_transactions (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  amount integer not null,
  balance_after integer not null check (balance_after >= 0),
  source_type text not null,
  source_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.rewards (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  created_by uuid not null references public.profiles(id),
  name text not null,
  description text not null default '',
  cost integer not null check (cost > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reward_redemptions (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  reward_id uuid not null references public.rewards(id),
  child_id uuid not null references public.children(id),
  cost integer not null check (cost > 0),
  status text not null default 'requested' check (status in ('requested', 'approved', 'rejected')),
  requested_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles(id)
);

create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(),
  family_id uuid references public.families(id) on delete cascade,
  slug text not null,
  name text not null,
  description text not null default '',
  icon text not null default '🏆',
  created_at timestamptz not null default now(),
  unique (family_id, slug)
);

create table if not exists public.child_achievements (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  achievement_id uuid not null references public.achievements(id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  unique (child_id, achievement_id)
);

create table if not exists public.streaks (
  child_id uuid primary key references public.children(id) on delete cascade,
  family_id uuid not null references public.families(id) on delete cascade,
  current_streak integer not null default 0 check (current_streak >= 0),
  best_streak integer not null default 0 check (best_streak >= 0),
  shield_count integer not null default 0 check (shield_count >= 0),
  last_valid_date date,
  updated_at timestamptz not null default now()
);

create table if not exists public.family_progress (
  family_id uuid primary key references public.families(id) on delete cascade,
  daily_completion numeric(5,2) not null default 0 check (daily_completion between 0 and 100),
  weekly_completion numeric(5,2) not null default 0 check (weekly_completion between 0 and 100),
  updated_at timestamptz not null default now()
);

create index if not exists idx_profiles_family on public.profiles(family_id);
create index if not exists idx_children_family on public.children(family_id);
create index if not exists idx_tasks_family_active on public.tasks(family_id, is_active);
create index if not exists idx_assignments_child_date on public.task_assignments(child_id, scheduled_for);
create index if not exists idx_assignments_family_status on public.task_assignments(family_id, status);
create index if not exists idx_coin_transactions_child_date on public.coin_transactions(child_id, created_at desc);
create index if not exists idx_xp_transactions_child_date on public.xp_transactions(child_id, created_at desc);

create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

do $$ declare table_name text; begin foreach table_name in array array['families','profiles','children','tasks','task_assignments','rewards'] loop execute format('drop trigger if exists %I_updated_at on public.%I', table_name, table_name); execute format('create trigger %I_updated_at before update on public.%I for each row execute function public.set_updated_at()', table_name, table_name); end loop; end $$;

create or replace function public.current_family_id() returns uuid language sql stable as $$
  select nullif(current_setting('app.family_id', true), '')::uuid
$$;

create or replace function public.apply_xp_transaction(p_child_id uuid, p_amount integer, p_source_type text, p_source_id uuid default null) returns public.xp_transactions language plpgsql security definer set search_path = public as $$
declare result public.xp_transactions;
begin
  if p_amount <= 0 or not exists (select 1 from public.children where id = p_child_id and family_id = public.current_family_id()) then raise exception 'Operação de XP inválida'; end if;
  insert into public.xp_transactions (family_id, child_id, amount, source_type, source_id) values (public.current_family_id(), p_child_id, p_amount, p_source_type, p_source_id) returning * into result;
  update public.children set total_xp = total_xp + p_amount where id = p_child_id;
  return result;
end; $$;

create or replace function public.apply_coin_transaction(p_child_id uuid, p_amount integer, p_source_type text, p_source_id uuid default null) returns public.coin_transactions language plpgsql security definer set search_path = public as $$
declare current_balance integer; result public.coin_transactions;
begin
  select coin_balance into current_balance from public.children where id = p_child_id and family_id = public.current_family_id() for update;
  if current_balance is null or current_balance + p_amount < 0 then raise exception 'Saldo de moedas insuficiente ou criança inválida'; end if;
  update public.children set coin_balance = coin_balance + p_amount where id = p_child_id;
  insert into public.coin_transactions (family_id, child_id, amount, balance_after, source_type, source_id) values (public.current_family_id(), p_child_id, p_amount, current_balance + p_amount, p_source_type, p_source_id) returning * into result;
  return result;
end; $$;

create or replace function public.is_family_member(target_family_id uuid) returns boolean language sql stable as $$ select target_family_id = public.current_family_id() $$;

alter table public.families enable row level security;
alter table public.profiles enable row level security;
alter table public.children enable row level security;
alter table public.tasks enable row level security;
alter table public.task_assignments enable row level security;
alter table public.task_evidence enable row level security;
alter table public.xp_transactions enable row level security;
alter table public.coin_transactions enable row level security;
alter table public.rewards enable row level security;
alter table public.reward_redemptions enable row level security;
alter table public.achievements enable row level security;
alter table public.child_achievements enable row level security;
alter table public.streaks enable row level security;
alter table public.family_progress enable row level security;

create policy "family members can access family data" on public.families for select using (public.is_family_member(id));
create policy "members can access profiles" on public.profiles for select using (public.is_family_member(family_id));
create policy "members can access children" on public.children for select using (public.is_family_member(family_id));
create policy "members can access tasks" on public.tasks for select using (public.is_family_member(family_id));
create policy "members can access assignments" on public.task_assignments for select using (public.is_family_member(family_id));
create policy "members can access evidence" on public.task_evidence for select using (public.is_family_member(family_id));
create policy "members can access xp ledger" on public.xp_transactions for select using (public.is_family_member(family_id));
create policy "members can access coin ledger" on public.coin_transactions for select using (public.is_family_member(family_id));
create policy "members can access rewards" on public.rewards for select using (public.is_family_member(family_id));
create policy "members can access redemptions" on public.reward_redemptions for select using (public.is_family_member(family_id));
create policy "members can access achievements" on public.achievements for select using (family_id is null or public.is_family_member(family_id));
create policy "members can access child achievements" on public.child_achievements for select using (public.is_family_member(family_id));
create policy "members can access streaks" on public.streaks for select using (public.is_family_member(family_id));
create policy "members can access progress" on public.family_progress for select using (public.is_family_member(family_id));
