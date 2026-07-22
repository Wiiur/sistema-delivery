// src/lib/schemas.js
// ⚡ Zod schemas for critical endpoints
import { z } from 'zod';

// ── AUTH ──────────────────────────────────────────
export const loginGerenteSchema = z.object({
  email: z.string().trim().toLowerCase().email('E-mail inválido').max(150),
  senha: z.string().min(4, 'Senha muito curta').max(200)
});

export const loginPinSchema = z.object({
  pin: z.string().trim().min(3).max(8)
});

export const refreshSchema = z.object({
  refresh_token: z.string().min(10)
});

// ── PRODUTO ───────────────────────────────────────
export const produtoCreateSchema = z.object({
  nome: z.string().trim().min(1).max(120),
  descricao: z.string().max(2000).optional().nullable(),
  preco_venda: z.coerce.number().nonnegative().max(99999),
  preco_custo: z.coerce.number().nonnegative().max(99999).optional().nullable(),
  imagem_url: z.string().url().optional().nullable(),
  estoque_atual: z.coerce.number().int().min(0).optional().default(0),
  em_destaque: z.coerce.boolean().optional().default(false),
  disponibilidade: z.enum(['ambos', 'delivery', 'local', 'local_peso', 'inativo']).optional().default('ambos'),
  complementos: z.string().optional().nullable(),
  categoria_temp: z.string().max(60).optional().default('Geral'),
  ordem_visual: z.coerce.number().int().optional().default(0)
}).passthrough(); // Deixa campos extras passarem sem quebrar, mas os campos-alvo são estritos

// ── PEDIDO ────────────────────────────────────────
const pedidoItemSchema = z.object({
  produto_id: z.coerce.number().int().positive(),
  quantidade: z.coerce.number().int().positive().max(999),
  preco_unitario: z.coerce.number().nonnegative().max(99999),
  obs: z.string().max(500).optional().nullable(),
  nome: z.string().optional() // used server-side only
});

export const pedidoCreateSchema = z.object({
  usuario_id: z.coerce.number().int().positive().optional(),
  metodo_pagamento: z.string().max(30),
  observacoes: z.string().max(2000).optional().nullable(),
  itens: z.array(pedidoItemSchema).min(1, 'Pedido precisa de pelo menos 1 item').max(200),
  cliente_nome: z.string().max(120).optional().nullable(),
  cliente_cpf: z.string().max(20).optional().nullable(),
  cliente_telefone: z.string().max(30).optional().nullable(),
  cliente_endereco: z.string().max(500).optional().nullable(),
  cliente_lat: z.coerce.number().optional().nullable(),
  cliente_lon: z.coerce.number().optional().nullable(),
  tipo_pedido: z.enum(['delivery', 'local', 'retirada']).optional().default('delivery'),
  mesa: z.string().max(20).optional().nullable(),
  status: z.string().max(30).optional(),
  taxa_entrega: z.coerce.number().nonnegative().optional().nullable(),
  distancia_km: z.coerce.number().nonnegative().optional().nullable(),
  cupom_id: z.coerce.number().int().positive().optional().nullable(),
  valor_desconto: z.coerce.number().nonnegative().optional().nullable()
});

// ── CUPOM ─────────────────────────────────────────
export const cupomCreateSchema = z.object({
  tenant_id: z.coerce.number().int().positive().optional().default(1),
  codigo: z.string().trim().min(3).max(30),
  tipo_desconto: z.enum(['PORCENTAGEM', 'FIXO']),
  valor_desconto: z.coerce.number().positive().max(100000),
  valor_min_pedido: z.coerce.number().nonnegative().optional().nullable(),
  limite_uso_total: z.coerce.number().int().positive().optional().nullable(),
  data_expiracao: z.string().optional().nullable(),
  desconto_maximo: z.coerce.number().nonnegative().optional().nullable()
});

export const validarCupomSchema = z.object({
  codigo: z.string().trim().min(1).max(30),
  valor_subtotal: z.coerce.number().nonnegative(),
  tenant_id: z.coerce.number().int().positive().optional().default(1)
});
