import { randomBytes, scryptSync } from "node:crypto";
import { neon } from "@neondatabase/serverless";

const required = ["DATABASE_URL", "CASA_PARENT_EMAIL", "CASA_PARENT_PASSWORD", "CASA_JENNIFER_PIN", "CASA_RICHARDSON_PIN"];
for (const name of required) {
  if (!process.env[name]) throw new Error(`${name} não configurada.`);
}

function hashSecret(secret) {
  const salt = randomBytes(16).toString("hex");
  const key = scryptSync(secret, salt, 64, { N: 16_384, r: 8, p: 1 });
  return `scrypt:v1:${salt}:${key.toString("hex")}`;
}

function verifySecret(secret, encoded) {
  if (!encoded?.startsWith("scrypt:v1:")) return false;
  const [, , salt, expectedHex] = encoded.split(":");
  if (!salt || !expectedHex) return false;
  const expected = Buffer.from(expectedHex, "hex");
  const actual = scryptSync(secret, salt, expected.length, { N: 16_384, r: 8, p: 1 });
  return expected.length === actual.length && expected.equals(actual);
}

const sql = neon(process.env.DATABASE_URL);
const existing = await sql`select id, family_id, password_hash from public.profiles where lower(email) = lower(${process.env.CASA_PARENT_EMAIL}) limit 1`;

if (existing.length) {
  const familyId = existing[0].family_id;
  const children = await sql`select p.id, p.display_name, p.pin_hash, c.birth_year from public.profiles p left join public.children c on c.profile_id = p.id where p.family_id = ${familyId} and p.role = 'child'`;
  const jennifer = children.find((profile) => profile.display_name === "Jennifer Ataide");
  const richardson = children.find((profile) => profile.display_name === "Richardson Ataide");
  const credentialRepairs = [];
  const profileDataRepairs = [];
  if (jennifer && jennifer.birth_year === null) profileDataRepairs.push(sql`update public.children set birth_year = 2017, updated_at = now() where profile_id = ${jennifer.id} and family_id = ${familyId}`);
  if (richardson && richardson.birth_year === null) profileDataRepairs.push(sql`update public.children set birth_year = 2013, updated_at = now() where profile_id = ${richardson.id} and family_id = ${familyId}`);
  if (!verifySecret(process.env.CASA_PARENT_PASSWORD, existing[0].password_hash)) {
    credentialRepairs.push(sql`update public.profiles set password_hash = ${hashSecret(process.env.CASA_PARENT_PASSWORD)}, updated_at = now() where id = ${existing[0].id} and family_id = ${familyId}`);
  }
  if (jennifer && !verifySecret(process.env.CASA_JENNIFER_PIN, jennifer.pin_hash)) {
    credentialRepairs.push(sql`update public.profiles set pin_hash = ${hashSecret(process.env.CASA_JENNIFER_PIN)}, updated_at = now() where id = ${jennifer.id} and family_id = ${familyId}`);
  }
  if (richardson && !verifySecret(process.env.CASA_RICHARDSON_PIN, richardson.pin_hash)) {
    credentialRepairs.push(sql`update public.profiles set pin_hash = ${hashSecret(process.env.CASA_RICHARDSON_PIN)}, updated_at = now() where id = ${richardson.id} and family_id = ${familyId}`);
  }
  const repairs = [...credentialRepairs, ...profileDataRepairs];
  if (repairs.length) await sql.transaction(repairs);
  console.log(JSON.stringify({ created: false, familyId, credentialsRepaired: credentialRepairs.length > 0, profileDataRepaired: profileDataRepairs.length > 0, reason: "parent_email_exists" }));
} else {
  const parentPasswordHash = hashSecret(process.env.CASA_PARENT_PASSWORD);
  const jenniferPinHash = hashSecret(process.env.CASA_JENNIFER_PIN);
  const richardsonPinHash = hashSecret(process.env.CASA_RICHARDSON_PIN);
  const created = await sql`
    with new_family as (
      insert into public.families (name)
      values (${process.env.CASA_FAMILY_NAME || "Família Ataide"})
      returning id
    ),
    new_parent as (
      insert into public.profiles (family_id, email, display_name, role, password_hash, avatar)
      select id, ${process.env.CASA_PARENT_EMAIL}, 'Guardião Principal', 'parent', ${parentPasswordHash}, '🛡️'
      from new_family
    ),
    new_jennifer as (
      insert into public.profiles (family_id, display_name, role, experience_mode, pin_hash, avatar)
      select id, 'Jennifer Ataide', 'child', 'adventure', ${jenniferPinHash}, '🧭'
      from new_family
      returning id, family_id
    ),
    new_richardson as (
      insert into public.profiles (family_id, display_name, role, experience_mode, pin_hash, avatar)
      select id, 'Richardson Ataide', 'child', 'pro', ${richardsonPinHash}, '⚡'
      from new_family
      returning id, family_id
    ),
    new_children as (
      insert into public.children (profile_id, family_id, birth_year)
      select id, family_id, 2017 from new_jennifer
      union all
      select id, family_id, 2013 from new_richardson
      returning id, family_id
    ),
    new_progress as (
      insert into public.family_progress (family_id)
      select id from new_family
    ),
    new_streaks as (
      insert into public.streaks (child_id, family_id)
      select id, family_id from new_children
    )
    select id as family_id from new_family
  `;
  console.log(JSON.stringify({ created: true, familyId: created[0].family_id, profiles: 3, children: 2 }));
}
