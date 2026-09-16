create or replace function public.refresh_child_streak(p_child_id uuid)
returns public.streaks
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.streaks;
  threshold smallint;
  cursor_date date := current_date;
  valid_today boolean;
  streak_value integer := 0;
  existing_shields integer := 0;
begin
  if not exists (select 1 from public.children where id = p_child_id and family_id = public.current_family_id()) then
    raise exception 'Criança inválida para atualização de streak';
  end if;

  select f.streak_threshold into threshold from public.families f where f.id = public.current_family_id();
  select coalesce(s.shield_count, 0) into existing_shields from public.streaks s where s.child_id = p_child_id for update;

  loop
    select case when count(*) = 0 then false else round(100.0 * count(*) filter (where ta.status in ('completed', 'approved')) / count(*)) >= threshold end
      into valid_today
    from public.task_assignments ta
    where ta.child_id = p_child_id and ta.family_id = public.current_family_id() and ta.scheduled_for = cursor_date;
    exit when not valid_today;
    streak_value := streak_value + 1;
    cursor_date := cursor_date - 1;
  end loop;

  insert into public.streaks (child_id, family_id, current_streak, best_streak, shield_count, last_valid_date)
  values (p_child_id, public.current_family_id(), streak_value, streak_value, existing_shields, case when streak_value > 0 then current_date else null end)
  on conflict (child_id) do update set
    current_streak = excluded.current_streak,
    best_streak = greatest(public.streaks.best_streak, excluded.current_streak),
    last_valid_date = excluded.last_valid_date,
    updated_at = now()
  returning * into result;
  return result;
end;
$$;
