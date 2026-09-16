import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const KEY_LENGTH = 64;
const SCRYPT_OPTIONS = { N: 16_384, r: 8, p: 1 } as const;

export function hashSecret(secret: string) {
  const salt = randomBytes(16).toString("hex");
  const key = scryptSync(secret, salt, KEY_LENGTH, SCRYPT_OPTIONS).toString("hex");
  return `scrypt:v1:${salt}:${key}`;
}

export function verifySecret(secret: string, encoded: string | null | undefined) {
  if (!encoded?.startsWith("scrypt:v1:")) return false;
  const [, , salt, expectedHex] = encoded.split(":");
  if (!salt || !expectedHex) return false;
  const expected = Buffer.from(expectedHex, "hex");
  const actual = scryptSync(secret, salt, KEY_LENGTH, SCRYPT_OPTIONS);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
