import { sql } from "@/lib/neon/db";
import type { Profile } from "@/types/domain";

function accentFor(role: Profile["role"], mode: Profile["experienceMode"]): Profile["accent"] {
  if (role === "parent") return "yellow";
  return mode === "adventure" ? "purple" : "cyan";
}

export function hasConfiguredFamily() {
  return Boolean(sql && process.env.CASA_FAMILY_ID);
}

export async function loadConfiguredProfiles(): Promise<Profile[] | null> {
  if (!hasConfiguredFamily()) return null;
  const currentYear = new Date().getFullYear();
  const rows = await sql!`
    select p.id, p.display_name, p.role, p.experience_mode, p.avatar, c.birth_year
    from public.profiles p
    left join public.children c on c.profile_id = p.id
    where p.family_id = ${process.env.CASA_FAMILY_ID}::uuid
    order by case when p.role = 'parent' then 0 else 1 end, p.display_name
  `;
  return (rows as Array<{ id: string; display_name: string; role: Profile["role"]; experience_mode: Profile["experienceMode"]; avatar: string; birth_year: number | null }>).map((row) => ({
    id: row.id,
    displayName: row.display_name,
    role: row.role,
    age: row.birth_year ? currentYear - row.birth_year : undefined,
    experienceMode: row.experience_mode ?? undefined,
    avatar: row.avatar,
    accent: accentFor(row.role, row.experience_mode ?? undefined),
  }));
}
