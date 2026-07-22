// src/lib/hash.js
// ⚡ Password hashing utilities (bcrypt + lazy migration compat)
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

// Bcrypt hashes always start with $2a$, $2b$ or $2y$ + cost + salt
const BCRYPT_REGEX = /^\$2[aby]\$\d{2}\$/;

/** Returns true if the string looks like a bcrypt hash */
export function isBcryptHash(value) {
  return typeof value === 'string' && BCRYPT_REGEX.test(value);
}

export async function hashPassword(plain) {
  return bcrypt.hash(String(plain), SALT_ROUNDS);
}

/**
 * Verifies a password against a stored hash OR plaintext (legacy).
 * Returns:
 *   { ok: true, needsRehash: true  }  → legacy plaintext matched → must rehash and save
 *   { ok: true, needsRehash: false }  → bcrypt matched normally
 *   { ok: false }                     → no match
 */
export async function verifyPassword(plain, stored) {
  if (!stored || plain == null) return { ok: false };

  if (isBcryptHash(stored)) {
    const ok = await bcrypt.compare(String(plain), stored);
    return { ok, needsRehash: false };
  }

  // Legacy: plaintext comparison (constant-time-ish)
  const a = Buffer.from(String(plain));
  const b = Buffer.from(String(stored));
  if (a.length !== b.length) return { ok: false };
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0 ? { ok: true, needsRehash: true } : { ok: false };
}
