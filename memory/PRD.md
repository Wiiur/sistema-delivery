# 📋 PRD — Dropa Delivery / D'Varano OS

## Problema original
Sistema SaaS de delivery ativo em produção. Análise nos 4 pilares:
1. **Segurança & Estabilidade** — Bugs, falhas e vulnerabilidades
2. **Modernização UX/UI** — Interface clean, inovadora, 100% responsiva
3. **Otimização** — Funções mais robustas e fluidas
4. **Inovação** — Novas funcionalidades avançadas

**Regra de Ouro:** Manter arquitetura e componentes estruturais originais intactos.

## Arquitetura
- **Frontend:** React 19 + Vite + Tailwind v4 (deploy: GitHub Pages)
- **Backend:** Node.js + Express + Prisma 7 + PostgreSQL (deploy: Render)
- **Banco:** Supabase Postgres (produção)
- **Integrações:** whatsapp-web.js (mock), @google/generative-ai (Gemini 1.5 Flash), leaflet (maps), qrcode

## Personas
- **Cliente final** — pedidos via loja digital, tracking, cupons
- **Funcionário PDV** — login por PIN, cozinha, caixa local, atendimento
- **Gerente** — email/senha, tudo do funcionário + gestão de cardápio, estoque, equipe, motoboys, financeiro, IA
- **Motoboy** — recebe rota via WhatsApp (ainda sem interface própria)

## Core Requirements (estáticos)
- Cardápio público com etapas de complementos (V2)
- Carrinho + checkout com endereço/geolocalização/frete calculado por km
- Comanda para consumo local (mesa/balcão)
- Painel Cozinha em kanban (recebido → preparo → saiu → entregue)
- Sistema de cupons com validação server-side
- Baixa automática de estoque no "entregue"
- Fechamento de caixa com conciliação (Pix/dinheiro/cartão)
- Multi-tema (5 paletas × 5 estilos = 25 combinações) + dark/light/system
- IA (Gemini) para relatório de vendas e sugestão de preço
- Notificação sonora + browser Notification API para novo pedido
- Tracking do pedido por URL pública `?tracking=ID`

## Progresso

### ✅ Sprint 1 — Segurança (COMPLETO — Jan 2026)
- bcryptjs com migração LAZY (sem forçar reset de senha em usuários existentes)
- JWT access (2h) + refresh (7d)
- Middleware `requireAuth` / `requireStaff` / `requireGerente` em endpoints admin
- Rate limit: 5 tentativas/15min em login; 300 req/min global
- Zod validation em endpoints críticos (login, pedidos, produtos, cupons)
- Helmet (HSTS, X-Frame, CSP relaxado p/ API)
- CORS whitelist configurável via `CORS_ORIGINS`
- Novo endpoint `POST /login-pin` (não expõe mais lista de PINs no frontend)
- API client centralizado com refresh automático em 401
- Substituição de 30+ `alert()` por toast `sonner`
- Bug fix: `.env.production` corrompido, `X` faltando em LojaTracking, `setModalProduto` fantasma
- Testes unitários passando (hash, JWT, schemas)
- Build de frontend passando (5.4MB → 150KB main gzip)

### 🟠 Sprint 2 — Performance & UX Core (COMPLETO — Jan 2026)
- `useApiCache` hook (SWR-lite ~100 linhas) com cache TTL + Page Visibility API
- Polling 10s → 15s + pausa quando aba oculta (redução ~50% req/min)
- `GET /pedidos` com filtros `?desde=`, `?status_in=`, `?ativos_apenas=`, `?limit=` (backward-compatible)
- Índices Prisma em `pedidos` (criado_em, status, cliente_cpf, tipo_pedido+status), `produtos` (ordem_visual, disponibilidade), `cupons` (codigo, ativo)
- Componentes reutilizáveis: `<Dialog>` (Esc + focus trap + scroll-lock), `<Skeleton>`, `<SkeletonCard>`, `<SkeletonGrid>`, `<SkeletonRow>`, `<EmptyState>`
- App.jsx: `buscarGeral` só carrega pedidos dos últimos 7 dias (`?desde=`) — antes trazia tudo
- `useMemo` em derived values (pedidosDeHoje, pedidosFiltrados)
- Suspense fallback substituído por SkeletonGrid — perceived perf muito melhor
- Empty State novo no PainelCozinha
- Modal PIN refatorado com `<Dialog>` (Esc funciona, Enter confirma, foco preservado)
- Fonte Montserrat removida (-80KB gzip). Só Inter default carrega
- CSS global: `@keyframes shimmer`, `:focus-visible` outline consistente, `prefers-reduced-motion` respeitado
- Contraste WCAG: paleta `sorveteria` reajustada de 3.9:1 → ≥4.7:1

### 🎨 Sprint 3 — Redesign UI (COMPLETO — Jan 2026)
- Novos primitivos UI: `<Button>`, `<Badge>` (com helper `tomStatusPedido`), `<StatCard>`, `<Sparkline>`
- Loja Digital: hero cinematográfico (overlay duplo + grain texture), pill badges com backdrop blur, ações flutuantes, logo com ring shadow
- Chips de categoria com contador de itens
- Cards de produto: border 2px, hover lift, fita "TOP" para destaques, botão + em círculo
- Carrinho flutuante moderno com badge de quantidade animado
- Tela "Pedido Enviado" com animação de sucesso (ping ring)
- Painel Cozinha: filtros pill + contador, **timer de urgência por pedido** (verde/azul/amarelo/vermelho pulsante conforme tempo)
- Painel Analises: 4 KPIs como StatCard com sparklines 7d + trend % vs média
- Animações CSS: `pop-in`, `shimmer`, `focus-visible` consistente, `prefers-reduced-motion`
- Zero breaking change — todas paletas customizadas do lojista continuam funcionando

### 🚀 Sprint 4 — Inovação (PENDENTE)
- Loja pública (LojaDigital.jsx 39KB → subcomponentes)
- Checkout one-page com stepper visual
- Painel Cozinha kanban drag-and-drop + timer por pedido
- Painel Analises com sparklines + comparativo vs semana anterior
- Onboarding wizard para novos lojistas

### 🚀 Sprint 4 — Inovação (COMPLETO — Jan 2026)
- **💳 Pix integrado (Mercado Pago)**: 3 endpoints backend (`/pagamentos/pix/criar`, `/pagamentos/webhook`, `/pagamentos/status/:id`), validação de assinatura HMAC, componente `<PixCheckout>` frontend com QR + copia-e-cola + countdown 30min + polling 5s
- **🏆 Dropa Points (fidelidade)**: models `FidelidadeConta` + `FidelidadeTransacao`, crédito automático 1pt/R$ na entrega, endpoint público `GET /fidelidade/:cpf` (saldo + histórico), resgate 100pts=R$10 via `POST /fidelidade/resgatar`
- **📱 PWA**: manifest.webmanifest + service worker com stale-while-revalidate no `/produtos` e `/config` (cardápio funciona offline!), registro automático em produção HTTPS
- Nova dep backend: `mercadopago@^2.9.0`
- Backward compatible: sistema funciona sem MERCADO_PAGO_ACCESS_TOKEN configurado (rotas Pix retornam 503, resto intacto)
- Migrations Prisma prontas (via `prisma db push` ou SQL direto documentado)

## 🏁 Sistema completo — Backlog remanescente
| P | Item | Sprint |
|---|---|---|
| P0 | Migrar PINs para bcrypt também (opcional) | 2 |
| P0 | Página política de privacidade + LGPD | 2 |
| P0 | Endpoint DELETE /me (direito ao esquecimento) | 2 |
| P1 | Rastreamento GPS motoboy | 4 |
| P1 | Pix integrado | 4 |
| P1 | PWA cardápio | 3 |
| P2 | Multi-tenant real | 4 |
| P2 | iFood/Rappi API oficial | 4 |

## Arquivos-chave
- Backend: `backend_delivery/src/server.js` (main), `src/lib/{hash,jwt,schemas}.js`, `src/middleware/{auth,validate}.js`
- Frontend: `frontend-delivery/src/App.jsx`, `src/services/api.js`, `src/pages/Admin/Login.jsx`, `src/theme/ThemeProvider.jsx`
- Auditoria: `/app/AUDITORIA_DROPA_DELIVERY.md`
- Deploy: `/app/DEPLOY_SPRINT1.md`
