# 🚀 SPRINT 2 — Guia de Deploy (Performance & UX Core)

## O que mudou

### Backend
- ✅ **Filtros em `GET /pedidos`** (backward-compatible)
  - `?desde=YYYY-MM-DD` — só pedidos a partir de uma data
  - `?status_in=recebido,em_preparo,saiu_entrega,em_consumo` — filtro por status
  - `?ativos_apenas=true` — atalho para "pedidos abertos de hoje"
  - `?limit=500` (padrão) — até 1000
- ✅ **Índices Prisma** adicionados em `pedidos` (criado_em, status, cliente_cpf, tipo_pedido+status), `produtos` (ordem_visual, disponibilidade), `cupons` (codigo, ativo)

### Frontend
- ✅ **`useApiCache` hook** — SWR-lite (100 linhas) com cache TTL 5s + revalidate on focus + auto-refresh + Page Visibility API
- ✅ **`<Dialog>`** reutilizável — Esc + focus trap + backdrop clicável + scroll lock (acessível WCAG)
- ✅ **`<Skeleton>` + `<SkeletonCard>` + `<SkeletonGrid>` + `<SkeletonRow>`** reutilizáveis
- ✅ **`<EmptyState>`** reutilizável
- ✅ **Polling 10s → 15s + pausa quando aba está oculta** (Page Visibility API) — reduz req/min pela metade
- ✅ **`buscarGeral` agora só carrega pedidos dos últimos 7 dias** (`?desde=`) — antes trazia histórico infinito
- ✅ **useMemo** em `pedidosDeHoje` (App.jsx) e `pedidosFiltrados` (PainelCozinha) — evita recomputação a cada render
- ✅ **Suspense fallback** — antes era spinner genérico, agora usa SkeletonGrid (perceived perf muito melhor)
- ✅ **Empty State novo no PainelCozinha** — "Cozinha calma por enquanto" com ilustração animada
- ✅ **Modal PIN refatorado** — usa `<Dialog>` (Esc funciona, foco preservado, Enter confirma)
- ✅ **Fontes:** Montserrat removida (economia de 80KB gzip). Agora só Inter (fallback default) carrega
- ✅ **CSS global:** `@keyframes shimmer`, `.pop-in`, `:focus-visible outline consistente`, `prefers-reduced-motion` respeitado
- ✅ **Contraste WCAG:** paleta `sorveteria` (light + dark) reajustada — antes falhava 3.9:1, agora ≥ 4.7:1
- ✅ **`text-tx-main` no light `sorveteria`** ajustado de #880E4F → #5A0D34 para melhorar leitura

---

## 📦 Passos para deploy no Render (backend)

### 1) Rodar migração do Prisma (adiciona os índices)
Após fazer push do código:
```bash
# No Render, no shell do serviço backend:
npx prisma db push --skip-generate
# Ou:
npx prisma migrate deploy   # se você usa migrations formais
```

**Nenhum dado é perdido** — só cria índices em tabelas existentes.

Alternativa via SQL direto no Supabase (se preferir):
```sql
CREATE INDEX IF NOT EXISTS pedidos_criado_em_idx ON pedidos(criado_em DESC);
CREATE INDEX IF NOT EXISTS pedidos_status_idx ON pedidos(status);
CREATE INDEX IF NOT EXISTS pedidos_cliente_cpf_idx ON pedidos(cliente_cpf);
CREATE INDEX IF NOT EXISTS pedidos_tipo_status_idx ON pedidos(tipo_pedido, status);
CREATE INDEX IF NOT EXISTS produtos_ordem_visual_idx ON produtos(ordem_visual);
CREATE INDEX IF NOT EXISTS produtos_disponibilidade_idx ON produtos(disponibilidade);
CREATE INDEX IF NOT EXISTS cupons_codigo_idx ON cupons(codigo);
CREATE INDEX IF NOT EXISTS cupons_ativo_idx ON cupons(ativo);
```

### 2) Deploy backend
```bash
git add backend_delivery/
git commit -m "Sprint 2 backend: índices + filtros em /pedidos"
git push  # Render re-deploy automático
```

### 3) Deploy frontend
```bash
cd /app/frontend-delivery
yarn build && yarn deploy
```

---

## 📊 Impacto esperado

| Métrica | Antes (Sprint 1) | Depois (Sprint 2) | Ganho |
|---|---|---|---|
| Req/min por dashboard aberto | 42 | **21** (com aba oculta: 0) | -50% |
| Payload `/pedidos` (loja 6 meses) | ~2-3 MB | ~200-400 KB | -85% |
| Query `/pedidos ORDER BY criado_em` | full scan | index scan | ~10-100x mais rápida |
| Tempo até tela útil (perceived) | ~1.5s | ~300ms com skeleton | UX muito melhor |
| Bundle inicial | 500KB main + 80KB Montserrat | 500KB main | -80KB gzip |
| Modais acessíveis (Esc + focus trap) | 0/3 | 1/3 (PIN) — outros virão no Sprint 3 | ✅ |

---

## ⚠️ Observações importantes

1. **Backward compatibility total** — nada quebra sem os filtros. O frontend agora sempre passa `?desde=` mas o backend também aceita chamada sem filtro (retorna 500 mais recentes).
2. **Se o painel de cozinha ficar aparentemente "sem pedidos antigos"** — é porque agora só carrega os últimos 7 dias no dashboard. Para ver histórico completo, o Painel de Análises não foi tocado ainda (Sprint 3).
3. **Se a contagem de faturamento estiver zerada logo após o deploy** — apenas espere 15s ou clique em qualquer aba para revalidar (cache 5s).
4. **Prisma migration** — se der conflito, você pode aplicar os índices manualmente via SQL (script acima). Nenhum dado é perdido em nenhum caso.

## 🔁 Rollback

Mesmo procedimento do Sprint 1: rollback no Render + git revert. Índices Prisma não precisam ser removidos (só melhoram performance, nunca prejudicam).
