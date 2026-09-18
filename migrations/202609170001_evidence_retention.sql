alter table public.task_evidence add column if not exists viewed_at timestamptz;
alter table public.task_evidence add column if not exists expires_at timestamptz;
alter table public.task_evidence add column if not exists purged_at timestamptz;

create index if not exists idx_task_evidence_retention
  on public.task_evidence(expires_at)
  where expires_at is not null and purged_at is null;
