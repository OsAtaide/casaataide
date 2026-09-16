alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists password_hash text;

create unique index if not exists idx_profiles_email on public.profiles (lower(email)) where email is not null;

create table if not exists public.auth_sessions (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  family_id uuid not null references public.families(id) on delete cascade,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_auth_sessions_profile on public.auth_sessions(profile_id, expires_at);
create index if not exists idx_auth_sessions_family on public.auth_sessions(family_id, expires_at);

comment on table public.auth_sessions is 'Server-only sessions. Never expose token_hash to the browser.';
