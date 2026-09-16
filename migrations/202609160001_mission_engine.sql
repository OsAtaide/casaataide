-- Etapa 2: ocorrências, regras de atraso, auditoria, evidências e Cofre Semanal.
alter table public.families add column if not exists timezone text not null default 'America/Fortaleza';
create or replace function public.family_current_date() returns date language sql stable as $$
  select coalesce((now() at time zone f.timezone)::date, now()::date) from public.families f where f.id = public.current_family_id()
$$;

alter table public.tasks add column if not exists penalty_amount integer not null default 0 check (penalty_amount >= 0);
alter table public.tasks add column if not exists is_required boolean not null default false;
alter table public.tasks add column if not exists allow_late_completion boolean not null default true;
alter table public.tasks add column if not exists late_reward_percentage smallint not null default 50 check (late_reward_percentage between 0 and 100);
alter table public.tasks add column if not exists start_date date;
alter table public.tasks add column if not exists end_date date;
alter table public.tasks add column if not exists archived_at timestamptz;
alter table public.tasks add column if not exists is_recovery boolean not null default false;
alter table public.tasks add column if not exists recovery_amount integer not null default 0 check (recovery_amount >= 0);
alter table public.tasks add column if not exists related_assignment_id uuid references public.task_assignments(id);
alter table public.tasks add column if not exists recurrence_type text not null default 'once' check (recurrence_type in ('once', 'daily', 'weekdays', 'weekends', 'weekly', 'specific_days', 'monthly', 'custom'));

update public.tasks set penalty_amount = penalty_coins where penalty_amount = 0 and penalty_coins > 0;
update public.tasks set recurrence_type = case coalesce(recurrence->>'frequency', 'none') when 'none' then 'once' else coalesce(recurrence->>'frequency', 'once') end
where recurrence_type = 'once' and recurrence is not null;

alter table public.task_assignments add column if not exists reward_xp integer;
alter table public.task_assignments add column if not exists reward_coins integer;
alter table public.task_assignments add column if not exists penalty_amount integer;
alter table public.task_assignments add column if not exists returned_at timestamptz;
alter table public.task_assignments add column if not exists return_reason text;
alter table public.task_assignments add column if not exists excused_at timestamptz;
alter table public.task_assignments add column if not exists excused_reason text;
alter table public.task_assignments add column if not exists excused_by uuid references public.profiles(id);
create index if not exists idx_assignments_child_schedule_status on public.task_assignments(child_id, scheduled_for, status);

update public.task_assignments ta
set reward_xp = coalesce(ta.reward_xp, t.xp),
    reward_coins = coalesce(ta.reward_coins, t.coins),
    penalty_amount = coalesce(ta.penalty_amount, t.penalty_amount, t.penalty_coins)
from public.tasks t where t.id = ta.task_id;

alter table public.task_evidence add column if not exists child_id uuid references public.children(id);
alter table public.task_evidence add column if not exists storage_key text;
alter table public.task_evidence add column if not exists mime_type text not null default 'image/jpeg';
alter table public.task_evidence add column if not exists file_size integer not null default 0;
alter table public.task_evidence add column if not exists file_name text not null default 'evidencia';
alter table public.task_evidence add column if not exists content_base64 text;
update public.task_evidence set storage_key = coalesce(storage_key, storage_path) where storage_key is null;
update public.task_evidence te set child_id = ta.child_id from public.task_assignments ta where ta.id = te.assignment_id and te.child_id is null;
alter table public.task_evidence alter column storage_key set not null;
create index if not exists idx_task_evidence_assignment on public.task_evidence(assignment_id, created_at desc);

create table if not exists public.weekly_vaults (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  week_start date not null,
  balance integer not null default 30 check (balance >= 0),
  max_balance integer not null default 30 check (max_balance > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (child_id, week_start)
);

create table if not exists public.vault_transactions (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  weekly_vault_id uuid not null references public.weekly_vaults(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  amount integer not null,
  balance_after integer not null check (balance_after >= 0),
  source_type text not null,
  source_id uuid,
  created_at timestamptz not null default now()
);
create unique index if not exists uq_vault_transactions_source on public.vault_transactions(child_id, source_type, source_id) where source_id is not null;
create index if not exists idx_weekly_vault_child_week on public.weekly_vaults(child_id, week_start desc);
create index if not exists idx_vault_transactions_child_date on public.vault_transactions(child_id, created_at desc);
alter table public.weekly_vaults enable row level security;
alter table public.vault_transactions enable row level security;
create policy "members can access weekly vaults" on public.weekly_vaults for select using (public.is_family_member(family_id));
create policy "members can access vault ledger" on public.vault_transactions for select using (public.is_family_member(family_id));

create or replace function public.apply_vault_transaction(p_child_id uuid, p_amount integer, p_source_type text, p_source_id uuid default null, p_week_start date default null)
returns public.vault_transactions language plpgsql security definer set search_path = public as $$
declare vault public.weekly_vaults; result public.vault_transactions; next_balance integer; target_week date := coalesce(p_week_start, date_trunc('week', public.family_current_date())::date);
begin
  if p_amount = 0 or not exists (select 1 from public.children where id = p_child_id and family_id = public.current_family_id()) then raise exception 'Transação de Cofre inválida'; end if;
  insert into public.weekly_vaults (family_id, child_id, week_start) values (public.current_family_id(), p_child_id, target_week)
    on conflict (child_id, week_start) do nothing;
  select * into vault from public.weekly_vaults where child_id = p_child_id and family_id = public.current_family_id() and week_start = target_week for update;
  if p_source_id is not null then
    select * into result from public.vault_transactions where child_id = p_child_id and source_type = p_source_type and source_id = p_source_id limit 1;
    if result.id is not null then return result; end if;
  end if;
  next_balance := greatest(0, least(vault.max_balance, vault.balance + p_amount));
  update public.weekly_vaults set balance = next_balance, updated_at = now() where id = vault.id;
  insert into public.vault_transactions (family_id, weekly_vault_id, child_id, amount, balance_after, source_type, source_id)
    values (public.current_family_id(), vault.id, p_child_id, next_balance - vault.balance, next_balance, p_source_type, p_source_id)
    returning * into result;
  return result;
exception when unique_violation then
  select * into result from public.vault_transactions where child_id = p_child_id and source_type = p_source_type and source_id = p_source_id limit 1;
  return result;
end; $$;
