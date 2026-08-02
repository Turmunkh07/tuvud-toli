import "server-only";
import { randomBytes, randomInt, scryptSync, timingSafeEqual } from "crypto";

const KEY_LENGTH = 64;

/**
 * Passwords are emailed in plaintext once at invite time and never stored that
 * way — only this digest is kept, so a copy of the database does not hand over
 * everyone's password.
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, KEY_LENGTH).toString("hex");
  return `scrypt:${salt}:${derived}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, salt, expectedHex] = stored.split(":");
  if (scheme !== "scrypt" || !salt || !expectedHex) return false;

  const expected = Buffer.from(expectedHex, "hex");
  if (expected.length !== KEY_LENGTH) return false;

  const derived = scryptSync(password, salt, KEY_LENGTH);
  return timingSafeEqual(derived, expected);
}

// Excludes characters that are easily confused when retyped from an email.
const ALPHABET = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generatePassword(length = 16): string {
  let password = "";
  for (let i = 0; i < length; i++) {
    // randomInt is rejection-sampled, so no modulo bias across the alphabet.
    password += ALPHABET[randomInt(0, ALPHABET.length)];
  }
  return password;
}
