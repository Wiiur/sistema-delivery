// src/middleware/auth.js
// ⚡ Auth middleware — extracts Bearer token, verifies JWT, injects req.user
import { verifyToken } from '../lib/jwt.js';

/**
 * Requires ANY authenticated user (funcionario, gerente OR cliente).
 */
export function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    if (!header.startsWith('Bearer ')) {
      return res.status(401).json({ erro: 'Não autenticado. Faça login novamente.' });
    }
    const token = header.slice(7);
    const decoded = verifyToken(token);
    if (decoded.tipo !== 'access') {
      return res.status(401).json({ erro: 'Token inválido.' });
    }
    req.user = decoded; // { sub, role, nome, ... }
    return next();
  } catch (err) {
    if (err && err.name === 'TokenExpiredError') {
      return res.status(401).json({ erro: 'Sessão expirada. Faça login novamente.', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ erro: 'Token inválido.' });
  }
}

/**
 * Requires role === 'gerente' (admin only).
 */
export function requireGerente(req, res, next) {
  return requireAuth(req, res, () => {
    if (req.user?.role !== 'gerente') {
      return res.status(403).json({ erro: 'Acesso restrito ao gerente.' });
    }
    return next();
  });
}

/**
 * Requires role === 'gerente' OR role === 'funcionario' (any staff).
 */
export function requireStaff(req, res, next) {
  return requireAuth(req, res, () => {
    const r = req.user?.role;
    if (r !== 'gerente' && r !== 'funcionario') {
      return res.status(403).json({ erro: 'Acesso restrito à equipe.' });
    }
    return next();
  });
}
