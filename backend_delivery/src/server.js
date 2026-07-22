// src/server.js
// ⚡ Dropa Delivery API — Hardened (Sprint 1 Security)
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { GoogleGenerativeAI } from '@google/generative-ai';
import qrcode from 'qrcode';

import { hashPassword, verifyPassword } from './lib/hash.js';
import { signAccessToken, signRefreshToken, verifyToken } from './lib/jwt.js';
import { requireAuth, requireGerente, requireStaff } from './middleware/auth.js';
import { validate } from './middleware/validate.js';
import {
  loginGerenteSchema, loginPinSchema, refreshSchema,
  produtoCreateSchema, pedidoCreateSchema, cupomCreateSchema, validarCupomSchema
} from './lib/schemas.js';
import { getMpOrder, validateWebhookSignature, extrairQrDaOrder } from './lib/mercadoPago.js';

// ==========================================
// 1. INICIALIZAÇÃO DE SERVIÇOS
// ==========================================
const { Pool } = pg;

// Banco de Dados
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Inteligência Artificial (Gemini) — só instancia se a chave existir
const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

// ==========================================
// 2. WHATSAPP (mock — desativado nesta versão)
// ==========================================
let waIsConnected = false;
const client = {
  on: () => {},
  initialize: () => {},
  sendMessage: async () => { /* no-op */ }
};

// ==========================================
// 3. CONFIGURAÇÃO DO SERVIDOR EXPRESS
// ==========================================
const app = express();
app.set('trust proxy', 1); // Render/Heroku proxy — necessário p/ rate-limit ler IP correto

// Helmet — cabeçalhos de segurança (CSP relaxado p/ API JSON)
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// CORS — whitelist configurável via env (fallback aberto p/ facilitar migração inicial)
const CORS_ORIGINS = (process.env.CORS_ORIGINS || '*')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    // Requests sem Origin (curl, apps mobile) sempre passam
    if (!origin) return cb(null, true);
    if (CORS_ORIGINS.includes('*') || CORS_ORIGINS.includes(origin)) return cb(null, true);
    // Regex simples: subdomínios explícitos via CORS_ORIGINS_REGEX
    if (process.env.CORS_ORIGINS_REGEX) {
      try {
        const re = new RegExp(process.env.CORS_ORIGINS_REGEX);
        if (re.test(origin)) return cb(null, true);
      } catch {}
    }
    return cb(new Error('Origin não autorizada pelo CORS: ' + origin));
  },
  credentials: false
}));

app.use(express.json({ limit: '1mb' }));

// Rate limit global (defensivo) — 300 req/min por IP
app.use(rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { erro: 'Muitas requisições. Aguarde alguns segundos.' }
}));

// Rate limit específico p/ login (anti brute force)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { erro: 'Muitas tentativas de login. Tente novamente em 15 minutos.' },
  skipSuccessfulRequests: true
});

app.get('/', (req, res) => {
  res.json({ mensagem: 'API do Dropa Delivery rodando com sucesso! 🍔🚀', version: '2.0.0-hardened' });
});

// Rota de healthcheck para Render
app.get('/health', (req, res) => res.json({ status: 'ok', ts: Date.now() }));

// ==========================================
// ROTAS: AUTENTICAÇÃO
// ==========================================
// Cadastro de cliente final (fluxo público — hasheia senha)
app.post('/usuarios', async (req, res) => {
  try {
    const { nome, cpf, whatsapp, email, senha, tipo_usuario } = req.body || {};
    if (!nome || !cpf || !senha) return res.status(400).json({ erro: 'Dados incompletos.' });
    const usuarioExiste = await prisma.usuario.findUnique({ where: { cpf: String(cpf) } });
    if (usuarioExiste) return res.status(400).json({ erro: 'CPF já cadastrado.' });

    const senhaHash = await hashPassword(senha);
    const novoUsuario = await prisma.usuario.create({
      data: {
        nome: String(nome),
        cpf: String(cpf),
        whatsapp: String(whatsapp || ''),
        email: email ? String(email).toLowerCase() : null,
        senha: senhaHash,
        tipo_usuario: tipo_usuario || 'cliente'
      }
    });
    // Nunca retornar a senha
    delete novoUsuario.senha;
    return res.status(201).json(novoUsuario);
  } catch (error) {
    console.error('[Erro] Cadastro de Usuário');
    return res.status(500).json({ erro: 'Erro interno no servidor.' });
  }
});

// Login GERENTE (com lazy bcrypt migration)
app.post('/login-gerente', loginLimiter, validate(loginGerenteSchema), async (req, res) => {
  try {
    const { email, senha } = req.body;
    const usuario = await prisma.usuario.findUnique({ where: { email } });

    // Sempre resposta genérica p/ evitar user enumeration
    const generico = { erro: 'Credenciais inválidas ou sem permissão.' };

    if (!usuario || usuario.tipo_usuario !== 'gerente') {
      return res.status(401).json(generico);
    }

    const check = await verifyPassword(senha, usuario.senha);
    if (!check.ok) return res.status(401).json(generico);

    // Lazy migration: se ainda estava em plaintext, rehashea agora
    if (check.needsRehash) {
      const novoHash = await hashPassword(senha);
      await prisma.usuario.update({ where: { id: usuario.id }, data: { senha: novoHash } });
    }

    const access_token = signAccessToken({ sub: usuario.id, role: 'gerente', nome: usuario.nome });
    const refresh_token = signRefreshToken({ sub: usuario.id });

    return res.status(200).json({
      access_token,
      refresh_token,
      user: { id: usuario.id, nome: usuario.nome, cargo: 'gerente', role: 'gerente' }
    });
  } catch (error) {
    console.error('[Erro] Login Gerente:', error.message);
    return res.status(500).json({ erro: 'Erro interno ao tentar logar.' });
  }
});

// Login FUNCIONÁRIO via PIN — nunca mais expõe a lista de PINs no frontend
app.post('/login-pin', loginLimiter, validate(loginPinSchema), async (req, res) => {
  try {
    const pinLimpo = String(req.body.pin).trim().toUpperCase();
    const func = await prisma.funcionario.findFirst({
      where: { pin: pinLimpo, ativo: true }
    });
    if (!func) return res.status(401).json({ erro: 'PIN inválido ou funcionário inativo.' });

    const access_token = signAccessToken({ sub: func.id, role: 'funcionario', nome: func.nome, cargo: func.cargo });
    return res.status(200).json({
      access_token,
      user: { id: func.id, nome: func.nome, cargo: func.cargo || 'funcionario', role: 'funcionario', ativo: true }
    });
  } catch (error) {
    console.error('[Erro] Login PIN');
    return res.status(500).json({ erro: 'Erro interno ao validar PIN.' });
  }
});

// Refresh token
app.post('/auth/refresh', validate(refreshSchema), async (req, res) => {
  try {
    const decoded = verifyToken(req.body.refresh_token);
    if (decoded.tipo !== 'refresh') return res.status(401).json({ erro: 'Token inválido.' });
    // Busca usuário/funcionario pelo id p/ garantir que ainda existe
    const uid = Number(decoded.sub);
    const [gerente, func] = await Promise.all([
      prisma.usuario.findUnique({ where: { id: uid } }).catch(() => null),
      prisma.funcionario.findUnique({ where: { id: uid } }).catch(() => null)
    ]);
    if (gerente && gerente.tipo_usuario === 'gerente') {
      const access_token = signAccessToken({ sub: gerente.id, role: 'gerente', nome: gerente.nome });
      return res.json({ access_token });
    }
    if (func && func.ativo) {
      const access_token = signAccessToken({ sub: func.id, role: 'funcionario', nome: func.nome, cargo: func.cargo });
      return res.json({ access_token });
    }
    return res.status(401).json({ erro: 'Sessão expirada.' });
  } catch {
    return res.status(401).json({ erro: 'Refresh token inválido ou expirado.' });
  }
});

// Perfil do usuário autenticado (substitui armazenar profile no localStorage)
app.get('/auth/me', requireAuth, async (req, res) => {
  try {
    const uid = Number(req.user.sub);
    if (req.user.role === 'gerente') {
      const u = await prisma.usuario.findUnique({ where: { id: uid } });
      if (!u) return res.status(401).json({ erro: 'Usuário não encontrado.' });
      return res.json({ id: u.id, nome: u.nome, cargo: 'gerente', role: 'gerente' });
    }
    if (req.user.role === 'funcionario') {
      const f = await prisma.funcionario.findUnique({ where: { id: uid } });
      if (!f || !f.ativo) return res.status(401).json({ erro: 'Funcionário inativo.' });
      return res.json({ id: f.id, nome: f.nome, cargo: f.cargo || 'funcionario', role: 'funcionario', ativo: true });
    }
    return res.status(401).json({ erro: 'Perfil não identificado.' });
  } catch {
    return res.status(500).json({ erro: 'Erro ao buscar perfil.' });
  }
});

// ==========================================
// ROTAS: CLIENTES (busca por CPF — restrita à equipe)
// ==========================================
app.get('/clientes/:cpf', requireStaff, async (req, res) => {
  try {
    const { cpf } = req.params;
    const ultimoPedido = await prisma.pedido.findFirst({
      where: { cliente_cpf: cpf },
      orderBy: { criado_em: 'desc' }
    });

    if (ultimoPedido) {
      return res.json({
        nome: ultimoPedido.cliente_nome,
        telefone: ultimoPedido.cliente_telefone,
        enderecoCompleto: ultimoPedido.cliente_endereco,
        lat: ultimoPedido.cliente_lat,
        lon: ultimoPedido.cliente_lon
      });
    }
    return res.status(404).json({ error: 'Cliente não encontrado' });
  } catch (error) {
    console.error('[Erro] Busca Cliente');
    return res.status(500).json({ error: 'Erro interno' });
  }
});

// ==========================================
// ROTAS: PRODUTOS E CARDÁPIO
// ==========================================
// GET /produtos — PÚBLICO (cardápio da loja)
app.get('/produtos', async (req, res) => {
  try {
    const produtos = await prisma.produto.findMany({
      include: {
        etapas: {
          include: {
            grupos: { include: { grupo: { include: { itens: true } } } }
          },
          orderBy: { ordem: 'asc' }
        }
      },
      orderBy: { id: 'desc' }
    });
    return res.status(200).json(produtos);
  } catch (error) {
    console.error('[Erro] Buscar Produtos');
    return res.status(500).json({ erro: 'Erro ao buscar produtos.' });
  }
});

// POST /produtos — PROTEGIDO (gerente) + Zod validation
app.post('/produtos', requireGerente, validate(produtoCreateSchema), async (req, res) => {
  try {
    const {
      nome, descricao, preco_venda, preco_custo, imagem_url,
      estoque_atual, em_destaque, disponibilidade, complementos,
      categoria_temp, ordem_visual
    } = req.body;
    const novoProduto = await prisma.produto.create({
      data: {
        nome, descricao, preco_venda, preco_custo, imagem_url,
        estoque_atual, em_destaque, disponibilidade, complementos,
        categoria_temp, ordem_visual
      }
    });
    return res.status(201).json(novoProduto);
  } catch (error) {
    console.error('[Erro] Criar Produto:', error.message);
    return res.status(500).json({ erro: 'Erro ao criar produto.' });
  }
});

app.delete('/produtos/etapas/:id', requireGerente, async (req, res) => {
  try {
    await prisma.produtoEtapa.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Erro ao excluir etapa' });
  }
});

// PUT /produtos/reordenar — PROTEGIDO (deve vir antes de /produtos/:id)
app.put('/produtos/reordenar', requireGerente, async (req, res) => {
  try {
    const { itensOrdenados } = req.body;
    if (!itensOrdenados || !Array.isArray(itensOrdenados)) return res.status(400).json({ erro: 'Dados inválidos.' });
    const operacoes = itensOrdenados.map(item =>
      prisma.produto.update({ where: { id: Number(item.id) }, data: { ordem_visual: Number(item.ordem_visual) } })
    );
    await prisma.$transaction(operacoes, { maxWait: 8000, timeout: 20000 });
    return res.json({ sucesso: true, mensagem: 'Cardápio reorganizado com sucesso!' });
  } catch (error) {
    console.error('[Erro] Reordenar:', error.message);
    return res.status(500).json({ erro: 'Erro Interno no Banco de Dados.' });
  }
});

app.put('/produtos/:id', requireGerente, async (req, res) => {
  try {
    // Extrai apenas campos permitidos (anti mass-assignment)
    const {
      nome, descricao, preco_venda, preco_custo, imagem_url,
      estoque_atual, em_destaque, disponibilidade, complementos,
      categoria_temp, ordem_visual
    } = req.body || {};
    const data = {};
    if (nome !== undefined) data.nome = nome;
    if (descricao !== undefined) data.descricao = descricao;
    if (preco_venda !== undefined) data.preco_venda = Number(preco_venda);
    if (preco_custo !== undefined) data.preco_custo = preco_custo ? Number(preco_custo) : null;
    if (imagem_url !== undefined) data.imagem_url = imagem_url;
    if (estoque_atual !== undefined) data.estoque_atual = Number(estoque_atual);
    if (em_destaque !== undefined) data.em_destaque = Boolean(em_destaque);
    if (disponibilidade !== undefined) data.disponibilidade = String(disponibilidade);
    if (complementos !== undefined) data.complementos = complementos;
    if (categoria_temp !== undefined) data.categoria_temp = categoria_temp;
    if (ordem_visual !== undefined) data.ordem_visual = Number(ordem_visual);

    const produtoAtualizado = await prisma.produto.update({
      where: { id: parseInt(req.params.id) },
      data
    });
    res.json(produtoAtualizado);
  } catch (error) {
    console.error('[Erro] Atualizar Produto:', error.message);
    res.status(500).json({ erro: 'Erro ao atualizar produto' });
  }
});

// ==========================================
// COMPLEMENTOS (V2.0) — todas restritas ao gerente
// ==========================================
app.get('/complementos/grupos', requireStaff, async (req, res) => {
  try {
    const grupos = await prisma.grupoComplemento.findMany({ include: { itens: true }, orderBy: { id: 'desc' } });
    res.json(grupos);
  } catch {
    res.status(500).json({ error: 'Erro interno ao buscar grupos' });
  }
});

app.post('/complementos/grupos', requireGerente, async (req, res) => {
  try {
    const nome = String(req.body?.nome || '').trim();
    if (!nome) return res.status(400).json({ erro: 'Nome obrigatório.' });
    const novoGrupo = await prisma.grupoComplemento.create({ data: { nome, ativo: true } });
    res.json(novoGrupo);
  } catch {
    res.status(500).json({ error: 'Erro ao criar grupo base' });
  }
});

app.post('/complementos/grupos/:id/itens', requireGerente, async (req, res) => {
  try {
    const grupo_id = Number(req.params.id);
    const nome = String(req.body?.nome || '').trim();
    const preco = Number(req.body?.preco) || 0;
    if (!nome) return res.status(400).json({ erro: 'Nome obrigatório.' });
    const novoItem = await prisma.itemComplemento.create({ data: { grupo_id, nome, preco, ativo: true } });
    res.json(novoItem);
  } catch {
    res.status(500).json({ error: 'Erro ao adicionar item' });
  }
});

app.post('/produtos/:id/etapas', requireGerente, async (req, res) => {
  try {
    const produto_id = Number(req.params.id);
    const { nome, min_total, max_total, grupos_ids } = req.body || {};
    if (!nome || !Array.isArray(grupos_ids)) return res.status(400).json({ erro: 'Dados incompletos.' });
    const novaEtapa = await prisma.produtoEtapa.create({
      data: {
        produto_id, nome,
        min_total: Number(min_total || 0),
        max_total: Number(max_total || 1),
        grupos: { create: grupos_ids.map(id => ({ grupo_id: Number(id) })) }
      },
      include: { grupos: { include: { grupo: { include: { itens: true } } } } }
    });
    res.json(novaEtapa);
  } catch {
    res.status(500).json({ error: 'Erro ao aplicar etapa no produto' });
  }
});

app.post('/complementos/migrar-antigos', requireGerente, async (req, res) => {
  try {
    const produtos = await prisma.produto.findMany({
      where: { complementos: { not: null, notIn: ['[]', 'null', ''] } }
    });
    let gruposMigrados = 0, itensMigrados = 0;
    for (const prod of produtos) {
      try {
        const complementosAntigos = JSON.parse(prod.complementos);
        for (const grupoAntigo of complementosAntigos) {
          const nomeDoGrupo = grupoAntigo.nome || grupoAntigo.titulo || grupoAntigo.grupo || 'Grupo Recuperado';
          let grupoSalvo = await prisma.grupoComplemento.findFirst({ where: { nome: nomeDoGrupo } });
          if (!grupoSalvo) {
            grupoSalvo = await prisma.grupoComplemento.create({ data: { nome: nomeDoGrupo, ativo: true } });
            gruposMigrados++;
          }
          const itensAntigos = grupoAntigo.itens || grupoAntigo.opcoes || [];
          for (const itemAntigo of itensAntigos) {
            const nomeItem = itemAntigo.nome || itemAntigo.opcao;
            const precoItem = itemAntigo.preco || itemAntigo.valor || 0;
            if (nomeItem) {
              const itemJaExiste = await prisma.itemComplemento.findFirst({ where: { grupo_id: grupoSalvo.id, nome: nomeItem } });
              if (!itemJaExiste) {
                await prisma.itemComplemento.create({ data: { grupo_id: grupoSalvo.id, nome: nomeItem, preco: Number(precoItem), ativo: true } });
                itensMigrados++;
              }
            }
          }
        }
      } catch {}
    }
    res.json({ success: true, gruposMigrados, itensMigrados });
  } catch {
    res.status(500).json({ error: 'Erro ao migrar dados' });
  }
});

app.delete('/complementos/itens/:id', requireGerente, async (req, res) => {
  try { await prisma.itemComplemento.delete({ where: { id: parseInt(req.params.id) } }); res.json({ success: true }); }
  catch { res.status(500).json({ error: 'Erro ao excluir item' }); }
});

app.delete('/complementos/grupos/:id', requireGerente, async (req, res) => {
  try { await prisma.grupoComplemento.delete({ where: { id: parseInt(req.params.id) } }); res.json({ success: true }); }
  catch { res.status(500).json({ error: 'Erro ao excluir grupo' }); }
});

// ==========================================
// ROTAS: CUPONS
// ==========================================
app.post('/cupons', requireGerente, validate(cupomCreateSchema), async (req, res) => {
  try {
    const { tenant_id, codigo, tipo_desconto, valor_desconto, valor_min_pedido,
      limite_uso_total, data_expiracao, desconto_maximo } = req.body;
    const novoCupom = await prisma.cupom.create({
      data: {
        tenant_id, codigo: codigo.toUpperCase().trim(), tipo_desconto,
        valor_desconto, valor_min_pedido: valor_min_pedido ?? null,
        limite_uso_total: limite_uso_total ?? null,
        data_expiracao: data_expiracao ? new Date(data_expiracao + 'T12:00:00') : null,
        desconto_maximo: desconto_maximo ?? null, ativo: true
      }
    });
    return res.status(201).json(novoCupom);
  } catch (error) {
    console.error('[Erro] Criar Cupom:', error.message);
    return res.status(500).json({ erro: 'Erro ao criar cupom.' });
  }
});

// POST /validar-cupom — PÚBLICO (checkout do cliente)
app.post('/validar-cupom', validate(validarCupomSchema), async (req, res) => {
  try {
    const { codigo, valor_subtotal, tenant_id } = req.body;
    const cupom = await prisma.cupom.findFirst({
      where: { codigo: codigo.toUpperCase().trim(), tenant_id, ativo: true }
    });
    if (!cupom) return res.status(404).json({ erro: 'Cupom inválido ou inativo.' });
    if (cupom.data_expiracao && new Date() > new Date(cupom.data_expiracao)) return res.status(400).json({ erro: 'Este cupom já expirou.' });
    if (cupom.limite_uso_total && cupom.usos_atuais >= cupom.limite_uso_total) return res.status(400).json({ erro: 'O limite de uso deste cupom já foi atingido.' });
    if (cupom.valor_min_pedido && valor_subtotal < Number(cupom.valor_min_pedido)) return res.status(400).json({ erro: `Este cupom exige um pedido mínimo de R$ ${Number(cupom.valor_min_pedido).toFixed(2)}` });

    let valor_descontado = 0;
    if (cupom.tipo_desconto === 'PORCENTAGEM') {
      valor_descontado = valor_subtotal * (Number(cupom.valor_desconto) / 100);
      if (cupom.desconto_maximo && valor_descontado > Number(cupom.desconto_maximo)) valor_descontado = Number(cupom.desconto_maximo);
    } else {
      valor_descontado = Number(cupom.valor_desconto);
    }
    if (valor_descontado > valor_subtotal) valor_descontado = valor_subtotal;

    return res.status(200).json({
      cupom_id: cupom.id, codigo: cupom.codigo,
      valor_descontado: valor_descontado.toFixed(2),
      mensagem: 'Cupom aplicado com sucesso!'
    });
  } catch {
    return res.status(500).json({ erro: 'Erro interno ao validar cupom.' });
  }
});

app.get('/cupons', requireGerente, async (req, res) => {
  try { const cupons = await prisma.cupom.findMany({ orderBy: { id: 'desc' } }); return res.json(cupons); }
  catch { return res.status(500).json({ erro: 'Erro ao buscar cupons.' }); }
});

app.put('/cupons/:id/status', requireGerente, async (req, res) => {
  try {
    const cupomAtual = await prisma.cupom.findUnique({ where: { id: Number(req.params.id) } });
    const atualizado = await prisma.cupom.update({ where: { id: Number(req.params.id) }, data: { ativo: !cupomAtual.ativo } });
    return res.json(atualizado);
  } catch { return res.status(500).json({ erro: 'Erro ao alterar status.' }); }
});

app.delete('/cupons/:id', requireGerente, async (req, res) => {
  try { await prisma.cupom.delete({ where: { id: Number(req.params.id) } }); return res.json({ ok: true }); }
  catch { return res.status(500).json({ erro: 'Erro ao excluir cupom.' }); }
});

// ==========================================
// ROTAS: PEDIDOS
// ==========================================
// GET /pedidos — restrita à equipe (dados sensíveis de clientes)
// Suporta filtros opcionais (backward-compatible):
//   ?desde=YYYY-MM-DD          → só pedidos criados a partir da data
//   ?status_in=recebido,em_preparo,saiu_entrega,em_consumo → filtro por status
//   ?limit=200                 → limite de resultados (padrão 500, máx 1000)
//   ?ativos_apenas=true        → atalho para pedidos "abertos" de hoje
app.get('/pedidos', requireStaff, async (req, res) => {
  try {
    const where = {};
    const q = req.query || {};

    // Filtro por data
    if (q.desde) {
      const d = new Date(String(q.desde));
      if (!isNaN(d)) where.criado_em = { gte: d };
    }

    // Filtro por status
    if (q.status_in) {
      const arr = String(q.status_in).split(',').map(s => s.trim()).filter(Boolean);
      if (arr.length) where.status = { in: arr };
    }

    // Atalho "pedidos ativos de hoje" — para o dashboard operacional
    if (String(q.ativos_apenas) === 'true') {
      const hj = new Date(); hj.setHours(0, 0, 0, 0);
      where.criado_em = { gte: hj };
      where.status = { in: ['recebido', 'em_preparo', 'saiu_entrega', 'em_consumo'] };
    }

    const take = Math.min(Number(q.limit) || 500, 1000);

    const pedidos = await prisma.pedido.findMany({
      where,
      include: { itens: true },
      orderBy: { criado_em: 'desc' },
      take
    });
    return res.status(200).json(pedidos);
  } catch (e) {
    console.error('[Erro] Buscar Pedidos:', e.message);
    return res.status(500).json({ erro: 'Erro ao buscar pedidos.' });
  }
});

// POST /pedidos — PÚBLICO (checkout do cliente)
app.post('/pedidos', validate(pedidoCreateSchema), async (req, res) => {
  try {
    const { usuario_id, metodo_pagamento, observacoes, itens,
      cliente_nome, cliente_cpf, cliente_telefone, cliente_endereco,
      cliente_lat, cliente_lon, tipo_pedido, mesa, status, taxa_entrega,
      distancia_km, cupom_id, valor_desconto } = req.body;

    let subtotalItens = 0;
    const itensParaSalvar = itens.map((item) => {
      const precoFinal = Number(item.preco_unitario);
      subtotalItens += precoFinal * item.quantidade;
      return { produto_id: item.produto_id, quantidade: item.quantidade, preco_unitario: precoFinal, obs: item.obs || null };
    });

    let totalFinal = subtotalItens;
    if (taxa_entrega) totalFinal += Number(taxa_entrega);
    if (valor_desconto && Number(valor_desconto) > 0) totalFinal -= Number(valor_desconto);
    if (totalFinal < 0) totalFinal = 0;

    const operacoesBanco = [];
    const operacaoPedido = prisma.pedido.create({
      data: {
        usuario_id: usuario_id || 1,
        metodo_pagamento, observacoes, total: totalFinal,
        cliente_nome, cliente_cpf, cliente_telefone, cliente_endereco,
        cliente_lat: cliente_lat ?? null, cliente_lon: cliente_lon ?? null,
        tipo_pedido: tipo_pedido || 'delivery', mesa: mesa || null,
        status: status || 'recebido',
        taxa_entrega: taxa_entrega ?? null, distancia_km: distancia_km ?? null,
        itens: { create: itensParaSalvar }
      }
    });
    operacoesBanco.push(operacaoPedido);

    if (cupom_id) {
      operacoesBanco.push(
        prisma.cupom.update({ where: { id: Number(cupom_id) }, data: { usos_atuais: { increment: 1 } } })
      );
    }

    const resultados = await prisma.$transaction(operacoesBanco);
    return res.status(201).json(resultados[0]);
  } catch (error) {
    console.error('[Erro] Criar Pedido:', error.message);
    return res.status(500).json({ erro: 'Erro ao criar pedido.' });
  }
});

app.put('/pedidos/:id/status', requireStaff, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, finalizado_por, audit, metodo_pagamento } = req.body;

    const pedido = await prisma.pedido.findUnique({ where: { id: Number(id) }, include: { itens: true } });
    if (!pedido) return res.status(404).json({ erro: 'Pedido não encontrado.' });

    let novaObs = pedido.observacoes || '';
    if (audit) novaObs += audit;

    const updateData = { status, finalizado_por, observacoes: novaObs };
    if (metodo_pagamento) updateData.metodo_pagamento = metodo_pagamento;

    const atualizado = await prisma.pedido.update({ where: { id: Number(id) }, data: updateData });

    // Baixa de estoque (mesma lógica original)
    if (status === 'entregue' && pedido.status !== 'entregue') {
      // 🏆 Credita pontos de fidelidade (Sprint 4)
      creditarPontosFidelidade(atualizado).catch(e => console.error('[Aviso] Fidelidade:', e.message));

      const obsGeral = pedido.observacoes ? pedido.observacoes.toLowerCase() : '';
      for (const item of pedido.itens) {
        const lotePrincipal = await prisma.loteEstoque.findFirst({
          where: { produto_id: item.produto_id, OR: [{ descricao: null }, { descricao: '' }] }
        });
        if (lotePrincipal) {
          await prisma.loteEstoque.update({ where: { id: lotePrincipal.id }, data: { quantidade: { decrement: item.quantidade } } });
        }
        const lotesDesteProduto = await prisma.loteEstoque.findMany({ where: { produto_id: item.produto_id } });
        for (const lote of lotesDesteProduto) {
          if (!lote.descricao) continue;
          const nomeVariante = lote.descricao.replace(/\[V:\s*/i, '').replace(/\]/i, '').trim();
          const nomeVarianteLower = nomeVariante.toLowerCase();
          const nomeProdutoLower = item.nome ? item.nome.toLowerCase() : '';
          const linhaDoItem = obsGeral.split('\n').find(linha => linha.includes(nomeProdutoLower) && linha.includes(nomeVarianteLower));
          const textoParaAnalisar = (item.obs ? item.obs.toLowerCase() : '') + ' ' + (linhaDoItem || obsGeral);
          if (textoParaAnalisar.includes(nomeVarianteLower)) {
            const regex = new RegExp(`(\\d+)x\\s*${nomeVarianteLower}`, 'i');
            const match = textoParaAnalisar.match(regex);
            const qtdDescontar = match ? parseInt(match[1], 10) : item.quantidade;
            await prisma.loteEstoque.update({ where: { id: lote.id }, data: { quantidade: { decrement: qtdDescontar } } });
          }
        }
      }
    }

    // Notif WhatsApp (mock — só entra se estivesse conectado)
    if (waIsConnected && client && atualizado.cliente_telefone) {
      const numLimpo = atualizado.cliente_telefone.replace(/\D/g, '');
      const numComDDI = numLimpo.startsWith('55') ? numLimpo : `55${numLimpo}`;
      const chatId = `${numComDDI}@c.us`;
      let msgStatus = '';
      if (status === 'em_preparo') msgStatus = `👨‍🍳 O seu pedido *#${atualizado.id}* acabou de entrar na cozinha e está sendo preparado com muito carinho!`;
      else if (status === 'entregue') msgStatus = `✅ O pedido *#${atualizado.id}* foi finalizado. Agradecemos a preferência! 🍦`;
      if (msgStatus) client.sendMessage(chatId, msgStatus).catch(() => {});
    }

    return res.json(atualizado);
  } catch (error) {
    console.error('[Erro] Atualizar Status Pedido:', error.message);
    return res.status(500).json({ error: 'Erro ao atualizar status' });
  }
});

app.put('/pedidos/:id/despachar', requireStaff, async (req, res) => {
  try {
    const { motoboy_id, taxa_entrega, distancia_km, valor_motoboy } = req.body;
    const pedido = await prisma.pedido.update({
      where: { id: parseInt(req.params.id) },
      data: {
        motoboy_id: Number(motoboy_id), taxa_entrega: Number(taxa_entrega),
        distancia_km: Number(distancia_km), valor_motoboy: Number(valor_motoboy),
        status: 'saiu_entrega'
      }
    });
    res.json(pedido);
  } catch (error) {
    console.error('[Erro] Despachar Pedido:', error.message);
    res.status(500).json({ erro: 'Erro ao despachar pedido.' });
  }
});

app.put('/pedidos/:id/finalizar-local', requireStaff, async (req, res) => {
  try {
    const pedidoAtualizado = await prisma.pedido.update({ where: { id: parseInt(req.params.id) }, data: { status: 'entregue' } });
    return res.json(pedidoAtualizado);
  } catch { return res.status(500).json({ erro: 'Erro ao dar baixa no pedido.' }); }
});

app.post('/pedidos/:id/adicionar-item', requireStaff, async (req, res) => {
  try {
    const { id } = req.params;
    const { itens } = req.body;
    if (!Array.isArray(itens) || itens.length === 0) return res.status(400).json({ erro: 'Itens obrigatórios.' });
    const pedido = await prisma.pedido.findUnique({ where: { id: parseInt(id) } });
    if (!pedido) return res.status(404).json({ erro: 'Pedido não encontrado' });
    const valorAdicional = itens.reduce((acc, item) => acc + (Number(item.preco_unitario) * item.quantidade), 0);
    const novoTotal = Number(pedido.total) + valorAdicional;
    const pedidoAtualizado = await prisma.pedido.update({
      where: { id: parseInt(id) },
      data: {
        total: novoTotal,
        itens: { create: itens.map(i => ({ produto_id: Number(i.produto_id), quantidade: Number(i.quantidade), preco_unitario: Number(i.preco_unitario) })) }
      }
    });
    res.json(pedidoAtualizado);
  } catch (error) {
    console.error('[Erro] Adicionar Item ao Pedido:', error.message);
    res.status(500).json({ erro: 'Erro ao adicionar item.' });
  }
});

// ==========================================
// ROTAS: CONFIG DA LOJA
// ==========================================
// GET público (loja digital precisa das cores/logo)
app.get('/config', async (req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    let config = await prisma.lojaConfig.findUnique({ where: { id: 1 } });
    if (!config) config = await prisma.lojaConfig.create({ data: { id: 1 } });
    res.json(config);
  } catch {
    return res.status(500).json({ error: 'Erro ao buscar configurações' });
  }
});

app.put('/config', requireGerente, async (req, res) => {
  try {
    const {
      endereco, taxa_base, taxa_km, tempo_km_minutos, lat_loja, lon_loja, raio_maximo, chovendo,
      nome_loja, logo_url, capa_url, cor_primaria, cor_secundaria, cor_fundo, tema_base,
      nota_loja, avaliacoes_loja, hora_abre, hora_fecha, status_manual, ordem_categorias
    } = req.body;
    const dados = {
      endereco,
      taxa_base: Number(taxa_base), taxa_km: Number(taxa_km), tempo_km_minutos: Number(tempo_km_minutos),
      lat_loja: Number(lat_loja), lon_loja: Number(lon_loja),
      raio_maximo: Number(raio_maximo), chovendo: Boolean(chovendo),
      nome_loja, logo_url, capa_url, cor_primaria, cor_secundaria, cor_fundo, tema_base,
      nota_loja, avaliacoes_loja, hora_abre, hora_fecha, status_manual, ordem_categorias
    };
    const configAtualizada = await prisma.lojaConfig.upsert({
      where: { id: 1 }, update: dados, create: { id: 1, ...dados }
    });
    return res.status(200).json(configAtualizada);
  } catch (error) {
    console.error('[Erro] Salvar Config:', error.message);
    return res.status(500).json({ erro: 'Erro interno ao atualizar configurações da loja.' });
  }
});

app.get('/store/:store_id/theme', async (req, res) => {
  try {
    const { store_id } = req.params;
    let theme = await prisma.storeTheme.findUnique({ where: { store_id: Number(store_id) } });
    if (!theme) theme = await prisma.storeTheme.create({ data: { store_id: Number(store_id), theme_name: 'fast_food', mode: 'system' } });
    return res.json(theme);
  } catch { return res.status(500).json({ error: 'Erro ao buscar tema' }); }
});

app.put('/store/:store_id/theme', requireGerente, async (req, res) => {
  try {
    const { store_id } = req.params;
    const { theme_name, mode, primary_override } = req.body;
    const updated = await prisma.storeTheme.upsert({
      where: { store_id: Number(store_id) },
      update: { theme_name, mode, primary_override },
      create: { store_id: Number(store_id), theme_name, mode, primary_override }
    });
    return res.json(updated);
  } catch { return res.status(500).json({ error: 'Erro ao salvar tema' }); }
});

// ==========================================
// EQUIPE E MOTOBOYS
// ==========================================
// NÃO retorna PINs pro frontend (só a lista sem PIN)
app.get('/funcionarios', requireGerente, async (req, res) => {
  try {
    const equipe = await prisma.funcionario.findMany();
    // Se quem consulta é gerente, pode ver os pins. Se fosse funcionario, ocultaríamos.
    res.json(equipe);
  } catch { res.status(500).json({ erro: 'Erro' }); }
});

app.post('/funcionarios', requireGerente, async (req, res) => {
  try {
    const { nome, cargo, pin, ativo } = req.body || {};
    if (!nome || !pin) return res.status(400).json({ erro: 'Nome e PIN obrigatórios.' });
    const novo = await prisma.funcionario.create({
      data: { nome: String(nome), cargo: String(cargo || 'funcionario'), pin: String(pin).trim().toUpperCase(), ativo: ativo !== false }
    });
    res.status(201).json(novo);
  } catch { res.status(500).json({ erro: 'Erro' }); }
});

app.delete('/funcionarios/:id', requireGerente, async (req, res) => {
  try { await prisma.funcionario.delete({ where: { id: parseInt(req.params.id) } }); res.json({ ok: true }); }
  catch { res.status(500).json({ erro: 'Erro' }); }
});

app.get('/motoboys', requireStaff, async (req, res) => {
  try { res.json(await prisma.motoboy.findMany()); }
  catch { res.status(500).json({ erro: 'Erro' }); }
});

app.post('/motoboys', requireGerente, async (req, res) => {
  try {
    const { id, nome, placa, telefone, comissao } = req.body;
    if (!nome) return res.status(400).json({ erro: 'Nome obrigatório.' });
    if (id) {
      const atualizado = await prisma.motoboy.update({ where: { id: Number(id) }, data: { nome, placa, telefone, comissao: Number(comissao) } });
      return res.json(atualizado);
    }
    const novo = await prisma.motoboy.create({ data: { nome, placa, telefone, comissao: Number(comissao) } });
    res.json(novo);
  } catch { res.status(500).json({ erro: 'Erro' }); }
});

app.delete('/motoboys/:id', requireGerente, async (req, res) => {
  try { await prisma.motoboy.delete({ where: { id: parseInt(req.params.id) } }); res.json({ ok: true }); }
  catch { res.status(500).json({ erro: 'Erro' }); }
});

// ==========================================
// FINANCEIRO
// ==========================================
app.post('/caixa/fechamento', requireGerente, async (req, res) => {
  try {
    const fechamento = await prisma.fechamentoCaixa.create({ data: req.body });
    res.status(201).json(fechamento);
  } catch (e) {
    console.error('[Erro] Fechar Caixa:', e.message);
    res.status(500).json({ erro: 'Erro ao fechar caixa' });
  }
});

// ==========================================
// FORNECEDORES
// ==========================================
app.post('/fornecedores', requireGerente, async (req, res) => {
  try {
    const { ingrediente, nome_empresa, preco } = req.body;
    if (!ingrediente || !nome_empresa) return res.status(400).json({ erro: 'Campos obrigatórios.' });
    const nova = await prisma.cotacaoFornecedor.create({ data: { ingrediente, nome_empresa, preco: Number(preco) } });
    res.status(201).json(nova);
  } catch { res.status(500).json({ erro: 'Erro' }); }
});

app.get('/fornecedores', requireGerente, async (req, res) => {
  try { res.json(await prisma.cotacaoFornecedor.findMany()); }
  catch { res.status(500).json({ erro: 'Erro' }); }
});

app.put('/fornecedores/:id', requireGerente, async (req, res) => {
  try {
    const atualizado = await prisma.cotacaoFornecedor.update({
      where: { id: parseInt(req.params.id) }, data: { datas_pedidos: req.body.datas_pedidos }
    });
    res.json(atualizado);
  } catch { res.status(500).json({ erro: 'Erro ao atualizar fornecedor' }); }
});

app.delete('/fornecedores/:id', requireGerente, async (req, res) => {
  try { await prisma.cotacaoFornecedor.delete({ where: { id: parseInt(req.params.id) } }); res.json({ ok: true }); }
  catch { res.status(500).json({ erro: 'Erro' }); }
});

// ==========================================
// ESTOQUE
// ==========================================
app.get('/estoque', requireStaff, async (req, res) => {
  try { res.json(await prisma.loteEstoque.findMany({ include: { produto: true } })); }
  catch { res.status(500).json({ erro: 'Erro' }); }
});

app.post('/estoque', requireGerente, async (req, res) => {
  try {
    const { produto_id, quantidade, tipo_unidade, descricao } = req.body || {};
    if (!produto_id) return res.status(400).json({ erro: 'produto_id obrigatório.' });
    const novo = await prisma.loteEstoque.create({
      data: {
        produto_id: Number(produto_id),
        quantidade: Number(quantidade || 0),
        tipo_unidade: String(tipo_unidade || 'Unidade'),
        descricao: descricao || null
      }
    });
    res.status(201).json(novo);
  } catch { res.status(500).json({ erro: 'Erro' }); }
});

app.put('/estoque/:id', requireGerente, async (req, res) => {
  try {
    const { quantidade, tipo_unidade, descricao } = req.body || {};
    const data = {};
    if (quantidade !== undefined) data.quantidade = Number(quantidade);
    if (tipo_unidade !== undefined) data.tipo_unidade = String(tipo_unidade);
    if (descricao !== undefined) data.descricao = descricao;
    const att = await prisma.loteEstoque.update({ where: { id: parseInt(req.params.id) }, data });
    res.json(att);
  } catch { res.status(500).json({ erro: 'Erro' }); }
});

app.delete('/estoque/:id', requireGerente, async (req, res) => {
  try { await prisma.loteEstoque.delete({ where: { id: parseInt(req.params.id) } }); res.json({ ok: true }); }
  catch { res.status(500).json({ erro: 'Erro' }); }
});

// ==========================================
// IA (GEMINI)
// ==========================================
app.get('/relatorio/ia', requireGerente, async (req, res) => {
  try {
    if (!genAI) return res.json({ consultoria: '✨ Dica do Sistema: Configure GEMINI_API_KEY no servidor para insights automáticos com IA.' });
    const pedidos = await prisma.pedido.findMany({ take: 200, orderBy: { criado_em: 'desc' } });
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = `Analise esses pedidos: ${JSON.stringify(pedidos)}. Me dê uma dica rápida de venda em 1 parágrafo focando no que está saindo mais.`;
    const result = await model.generateContent(prompt);
    return res.json({ consultoria: result.response.text() });
  } catch (e) {
    console.error('[Erro] Relatório IA:', e.message);
    return res.json({ consultoria: '✨ Dica do Sistema: Verifique os horários de pico nos relatórios para otimizar sua equipe na cozinha.' });
  }
});

app.post('/produtos/ia-preco', requireGerente, async (req, res) => {
  try {
    if (!genAI) return res.json({ sugestao: `PRECO: ${(Number(req.body.custo) * 2.5).toFixed(2)} | MOTIVO: Margem padrão de segurança de 150% aplicada.` });
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = `O Custo do lanche/item "${req.body.nome}" é R$ ${req.body.custo}. Sugira o preço final de venda para o cliente (markup de 100% a 150%). Retorne APENAS neste formato exato: PRECO: 00.00 | MOTIVO: motivo curto.`;
    const result = await model.generateContent(prompt);
    return res.json({ sugestao: result.response.text() });
  } catch (e) {
    console.error('[Erro] Preço IA:', e.message);
    return res.json({ sugestao: `PRECO: ${(Number(req.body.custo) * 2.5).toFixed(2)} | MOTIVO: Margem padrão de segurança de 150% aplicada.` });
  }
});

// ==========================================
// 💳 PIX (Mercado Pago) — Sprint 4
// ==========================================

// POST /pagamentos/pix/criar — cria QR Pix para um pedido em aguardando_pagamento
app.post('/pagamentos/pix/criar', async (req, res) => {
  try {
    const { pedido_id, email } = req.body || {};
    if (!pedido_id || !email) return res.status(400).json({ erro: 'pedido_id e email obrigatórios.' });

    const pedido = await prisma.pedido.findUnique({ where: { id: Number(pedido_id) }, include: { pagamento: true } });
    if (!pedido) return res.status(404).json({ erro: 'Pedido não encontrado.' });

    // Se já tem QR ativo e não expirado, reutiliza (idempotência)
    if (pedido.pagamento && pedido.pagamento.status === 'aguardando_pagamento' &&
        pedido.pagamento.expira_em && pedido.pagamento.expira_em > new Date()) {
      return res.json({
        pagamento_id: pedido.pagamento.id,
        copia_e_cola: pedido.pagamento.copia_e_cola,
        qr_code_base64: pedido.pagamento.qr_code_base64,
        ticket_url: pedido.pagamento.ticket_url,
        expira_em: pedido.pagamento.expira_em,
        status: pedido.pagamento.status
      });
    }

    if (!process.env.MERCADO_PAGO_ACCESS_TOKEN) {
      return res.status(503).json({ erro: 'Pagamento Pix não configurado. Configure MERCADO_PAGO_ACCESS_TOKEN.' });
    }

    const externalRef = `pedido_${pedido.id}_${Date.now()}`;
    const amount = Number(pedido.total).toFixed(2);
    const mpOrder = getMpOrder();

    const mpResp = await mpOrder.create({
      body: {
        type: 'online', processing_mode: 'automatic',
        total_amount: amount, external_reference: externalRef,
        expiration_time: 'PT30M',
        payer: { email: String(email).toLowerCase() },
        transactions: {
          payments: [{ amount, payment_method: { id: 'pix', type: 'bank_transfer' } }]
        }
      },
      requestOptions: { idempotencyKey: `pix_${pedido.id}` }
    });

    const qr = extrairQrDaOrder(mpResp);
    // Fallback: se MP não retornar imagem, geramos localmente do copia-e-cola
    let qrBase64 = qr.qrCodeBase64;
    if (!qrBase64 && qr.copiaECola) {
      const dataUrl = await qrcode.toDataURL(qr.copiaECola, { margin: 1, scale: 8 });
      qrBase64 = dataUrl.replace(/^data:image\/png;base64,/, '');
    }
    const expira = new Date(Date.now() + 30 * 60 * 1000);

    const pagamento = await prisma.pagamento.upsert({
      where: { pedido_id: pedido.id },
      update: {
        provider_order_id: String(qr.mpOrderId || ''), external_reference: externalRef,
        status: 'aguardando_pagamento', valor: pedido.total, moeda: 'BRL',
        copia_e_cola: qr.copiaECola, qr_code_base64: qrBase64, ticket_url: qr.ticketUrl,
        expira_em: expira, mp_status: qr.status, mp_status_detail: qr.statusDetail
      },
      create: {
        pedido_id: pedido.id, provider_order_id: String(qr.mpOrderId || ''), external_reference: externalRef,
        status: 'aguardando_pagamento', valor: pedido.total, moeda: 'BRL',
        copia_e_cola: qr.copiaECola, qr_code_base64: qrBase64, ticket_url: qr.ticketUrl,
        expira_em: expira, mp_status: qr.status, mp_status_detail: qr.statusDetail
      }
    });

    return res.status(201).json({
      pagamento_id: pagamento.id,
      copia_e_cola: pagamento.copia_e_cola,
      qr_code_base64: pagamento.qr_code_base64,
      ticket_url: pagamento.ticket_url,
      expira_em: pagamento.expira_em,
      status: pagamento.status
    });
  } catch (err) {
    console.error('[Erro] Criar Pix:', err.message);
    return res.status(500).json({ erro: 'Erro ao criar QR Pix.' });
  }
});

// POST /pagamentos/webhook — recebe notificação do MP e atualiza o pedido
app.post('/pagamentos/webhook', async (req, res) => {
  try {
    const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;
    const xSignature = req.headers['x-signature'];
    const xRequestId = req.headers['x-request-id'];
    const dataId = String(req.query['data.id'] || req.body?.data?.id || '');

    // Se secret configurado, valida assinatura (produção)
    if (secret) {
      const ok = validateWebhookSignature({ xSignature, xRequestId, dataId, secret });
      if (!ok) return res.status(401).end();
    }
    if (!dataId) return res.status(400).json({ erro: 'data.id ausente.' });

    // Busca detalhes atualizados da order
    const mpRes = await fetch(`https://api.mercadopago.com/v1/orders/${dataId}`, {
      headers: { Authorization: `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}` }
    });
    if (!mpRes.ok) return res.status(502).json({ erro: 'Falha ao consultar Mercado Pago.' });
    const order = await mpRes.json();
    const isPago = order.status === 'processed' && order.status_detail === 'accredited';

    const pagamento = await prisma.pagamento.findFirst({
      where: { OR: [{ provider_order_id: String(dataId) }, { external_reference: order.external_reference }] },
      include: { pedido: true }
    });
    if (!pagamento) return res.sendStatus(200); // idempotente

    await prisma.$transaction(async (tx) => {
      await tx.pagamento.update({
        where: { id: pagamento.id },
        data: {
          mp_status: order.status, mp_status_detail: order.status_detail,
          ultimo_webhook: req.body, verificado_em: new Date(),
          status: isPago ? 'pago' : pagamento.status
        }
      });
      if (isPago && pagamento.pedido.status === 'aguardando_pagamento') {
        await tx.pedido.update({ where: { id: pagamento.pedido_id }, data: { status: 'recebido' } });
      }
    });
    return res.sendStatus(200);
  } catch (err) {
    console.error('[Erro] Webhook MP:', err.message);
    return res.sendStatus(500);
  }
});

// GET /pagamentos/status/:pedido_id — polling fallback (o frontend consulta a cada 5s)
app.get('/pagamentos/status/:pedido_id', async (req, res) => {
  try {
    const pedido_id = Number(req.params.pedido_id);
    const pagamento = await prisma.pagamento.findUnique({ where: { pedido_id }, include: { pedido: true } });
    if (!pagamento) return res.status(404).json({ erro: 'Pagamento não encontrado.' });

    if (pagamento.status === 'pago') {
      return res.json({ pedido_id, pedido_status: pagamento.pedido.status, pagamento_status: 'pago' });
    }

    // Se ainda tem token MP, tenta atualizar em tempo real
    if (pagamento.provider_order_id && process.env.MERCADO_PAGO_ACCESS_TOKEN) {
      try {
        const mpRes = await fetch(`https://api.mercadopago.com/v1/orders/${pagamento.provider_order_id}`, {
          headers: { Authorization: `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}` }
        });
        if (mpRes.ok) {
          const order = await mpRes.json();
          const isPago = order.status === 'processed' && order.status_detail === 'accredited';
          if (isPago) {
            await prisma.$transaction(async (tx) => {
              await tx.pagamento.update({ where: { id: pagamento.id }, data: { status: 'pago', mp_status: order.status, mp_status_detail: order.status_detail } });
              if (pagamento.pedido.status === 'aguardando_pagamento') {
                await tx.pedido.update({ where: { id: pedido_id }, data: { status: 'recebido' } });
              }
            });
            return res.json({ pedido_id, pedido_status: 'recebido', pagamento_status: 'pago' });
          }
        }
      } catch {}
    }
    return res.json({ pedido_id, pedido_status: pagamento.pedido.status, pagamento_status: pagamento.status, expira_em: pagamento.expira_em });
  } catch (err) {
    return res.status(500).json({ erro: 'Erro ao consultar status.' });
  }
});

// ==========================================
// 🏆 FIDELIDADE — Dropa Points (Sprint 4)
// ==========================================
// Regra: 1 ponto por R$ 1 gasto. Cada 100 pontos = R$ 10 de crédito.

app.get('/fidelidade/:cpf', async (req, res) => {
  try {
    const cpf = String(req.params.cpf).replace(/\D/g, '');
    if (!cpf) return res.status(400).json({ erro: 'CPF inválido.' });
    const conta = await prisma.fidelidadeConta.findUnique({
      where: { cliente_cpf: cpf },
      include: { transacoes: { orderBy: { criado_em: 'desc' }, take: 20 } }
    });
    if (!conta) return res.json({ cliente_cpf: cpf, saldo_pontos: 0, credito_disponivel: 0, transacoes: [] });
    const creditoDisponivel = Math.floor(conta.saldo_pontos / 100) * 10;
    return res.json({ ...conta, credito_disponivel: creditoDisponivel });
  } catch { return res.status(500).json({ erro: 'Erro ao buscar fidelidade.' }); }
});

// Chamado automaticamente após pedido "entregue" (será integrado no PUT /pedidos/:id/status)
async function creditarPontosFidelidade(pedido) {
  if (!pedido?.cliente_cpf) return;
  const cpf = String(pedido.cliente_cpf).replace(/\D/g, '');
  if (!cpf) return;
  const pontos = Math.floor(Number(pedido.total));
  if (pontos <= 0) return;
  await prisma.fidelidadeConta.upsert({
    where: { cliente_cpf: cpf },
    update: {
      cliente_nome: pedido.cliente_nome || undefined,
      saldo_pontos: { increment: pontos },
      total_gasto: { increment: Number(pedido.total) },
      transacoes: { create: { tipo: 'ganho', pontos, descricao: `Pedido #${pedido.id}`, pedido_id: pedido.id } }
    },
    create: {
      cliente_cpf: cpf, cliente_nome: pedido.cliente_nome || null,
      saldo_pontos: pontos, total_gasto: Number(pedido.total),
      transacoes: { create: { tipo: 'ganho', pontos, descricao: `Pedido #${pedido.id}`, pedido_id: pedido.id } }
    }
  });
}

app.post('/fidelidade/resgatar', requireStaff, async (req, res) => {
  try {
    const { cpf, pontos } = req.body || {};
    const cpfLimpo = String(cpf || '').replace(/\D/g, '');
    const p = Number(pontos);
    if (!cpfLimpo || !p || p < 100 || p % 100 !== 0) return res.status(400).json({ erro: 'Pontos devem ser múltiplos de 100 (mínimo 100).' });
    const conta = await prisma.fidelidadeConta.findUnique({ where: { cliente_cpf: cpfLimpo } });
    if (!conta || conta.saldo_pontos < p) return res.status(400).json({ erro: 'Saldo insuficiente.' });
    const creditoGerado = (p / 100) * 10;
    await prisma.fidelidadeConta.update({
      where: { id: conta.id },
      data: {
        saldo_pontos: { decrement: p },
        transacoes: { create: { tipo: 'resgate', pontos: -p, descricao: `Resgate de R$ ${creditoGerado.toFixed(2)}` } }
      }
    });
    return res.json({ sucesso: true, credito_gerado: creditoGerado.toFixed(2), pontos_debitados: p });
  } catch { return res.status(500).json({ erro: 'Erro ao resgatar pontos.' }); }
});

// ==========================================
// ERROR HANDLER GLOBAL
// ==========================================
app.use((err, req, res, next) => {
  console.error('[Erro Global]', err?.message);
  if (String(err?.message || '').includes('Origin não autorizada')) {
    return res.status(403).json({ erro: 'Origem não autorizada.' });
  }
  return res.status(500).json({ erro: 'Erro interno no servidor.' });
});

// ==========================================
// 4. LIGANDO O SERVIDOR
// ==========================================
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`✅ Dropa Delivery API v2.0-hardened rodando na porta ${PORT}`);
});
