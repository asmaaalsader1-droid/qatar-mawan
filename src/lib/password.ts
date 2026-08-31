import { scrypt, randomBytes, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: string,
  keylen: number,
) => Promise<Buffer>;

/** تجزئة كلمة المرور قبل التخزين — لا نخزّن النص الصريح أبداً. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
  const hash = derivedKey.toString("hex");
  return `scrypt$${salt}$${hash}`;
}

/** تحقق ثابت الزمن من كلمة المرور مقابل التجزئة المخزّنة. */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
  const expected = Buffer.from(hash, "hex");
 
 return derivedKey.length === expected.length && timingSafeEqual(derivedKey, expected);
}