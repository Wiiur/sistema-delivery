// src/lib/jwt.js
// ⚡ JWT sign & verify — access token (2h) + refresh token (7d)
import jwt from 'jsonwebtoken';

const ALG = 'HS256';
const ACCESS_TTL = '2h';
const REFRESH_TTL = '7d';

function getSecret() {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 32) {
    throw new Error('JWT_SECRET missing or too short (min 32 chars). Set it in .env');
  }
  return s;
}

/**
 * subject: { id, role, tipo }
 *   role   → 'gerente' | 'funcionario' | 'cliente'
 *   tipo   → 'access' | 'refresh'
 */
export function signAccessToken(payload) {
  return jwt.sign({ ...payload, tipo: 'access' }, getSecret(), { algorithm: ALG, expiresIn: ACCESS_TTL });
}

export function signRefreshToken(payload) {
  return jwt.sign({ sub: payload.sub, tipo: 'refresh' }, getSecret(), { algorithm: ALG, expiresIn: REFRESH_TTL });
}

export function verifyToken(token) {
  return jwt.verify(token, getSecret(), { algorithms: [ALG] });
}
