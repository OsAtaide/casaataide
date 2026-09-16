-- Idades iniciais informadas para a família CASAQUEST.
-- A atualização é limitada aos perfis com estes nomes e só preenche valores ausentes.
update public.children c
set birth_year = 2017, updated_at = now()
from public.profiles p
where p.id = c.profile_id
  and p.display_name = 'Jennifer Ataide'
  and c.birth_year is null;

update public.children c
set birth_year = 2013, updated_at = now()
from public.profiles p
where p.id = c.profile_id
  and p.display_name = 'Richardson Ataide'
  and c.birth_year is null;
