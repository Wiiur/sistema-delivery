# 🚀 SPRINT 1 — Guia de Deploy (Segurança)

## O que mudou

### Backend (`backend_delivery/`)
- ✅ **bcryptjs** — senhas são hasheadas com bcrypt (custo 10)
- ✅ **jsonwebtoken** — JWT access (2h) + refresh (7d)
- ✅ **express-rate-limit** — 5 tentativas/15min no `/login-gerente` e `/login-pin`, 300 req/min global
- ✅ **helmet** — cabeçalhos de segurança (HSTS, X-Frame-Options, etc.)
- ✅ **zod** — validação de schema em `/login-gerente`, `/login-pin`, `/pedidos`, `/produtos`, `/cupons`
- ✅ **CORS whitelist** configurável via `CORS_ORIGINS`
- ✅ **Migração lazy do bcrypt** — usuários existentes com senha em texto puro continuam logando; sistema rehashea no 1º login
- ✅ **Sem mais lista de PINs no frontend** — validação via novo endpoint `POST /login-pin`
- ✅ **Endpoints protegidos** com middleware `requireGerente` / `requireStaff` / `requireAuth`
- ✅ **`console.log` de senha removido**
- ✅ **Mass assignment corrigido** em `POST /produtos`, `PUT /produtos/:id`, `POST /estoque` etc.
- ✅ **Fallback de Gemini API key falsa removido**
- ✅ **`/pedidos` protegido** (dados sensíveis de clientes — LGPD)

### Frontend (`frontend-delivery/`)
- ✅ **API client centralizado** (`services/api.js`) com token auto-injetado e refresh automático em 401
- ✅ **JWT em localStorage** (`dropa_access_token` + `dropa_refresh_token`) — nunca mais o perfil inteiro
- ✅ **Login.jsx** usa novo endpoint `/login-pin` (não recebe mais lista de PINs)
- ✅ **App.jsx** carrega perfil de `/auth/me` na montagem
- ✅ **Logout global automático** em 401 (sessão expirada)
- ✅ **Substituição de `alert()` por `toast`** (sonner) — 30+ ocorrências
- ✅ **`.env.production` corrompido** corrigido

### Endpoints públicos (não exigem token)
- `GET  /health`
- `GET  /produtos` — cardápio
- `POST /pedidos` — checkout do cliente
- `POST /validar-cupom`
- `GET  /config` — cores/logo da loja
- `GET  /store/:id/theme`
- `POST /usuarios` — cadastro de cliente final

### Endpoints protegidos (`requireStaff` = gerente OU funcionário)
- `GET /pedidos`, `PUT /pedidos/:id/status`, `PUT /pedidos/:id/despachar`, `POST /pedidos/:id/adicionar-item`, `PUT /pedidos/:id/finalizar-local`
- `GET /motoboys`, `GET /estoque`
- `GET /clientes/:cpf`
- `GET /complementos/grupos`

### Endpoints admin (`requireGerente`)
- Tudo relacionado a criar/editar/deletar: `/produtos`, `/cupons`, `/funcionarios`, `/motoboys`, `/estoque`, `/fornecedores`, `/config`, `/complementos`, `/caixa/fechamento`, `/relatorio/ia`, `/produtos/ia-preco`

---

## 📦 Passos para deploy no Render (backend)

### 1) Gerar o JWT_SECRET
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```
Copie o hash gerado (96 caracteres).

### 2) Adicionar variáveis de ambiente no Render (dashboard)
No painel do serviço backend em `render.com`:

| Chave | Valor |
|---|---|
| `JWT_SECRET` | (cole o hash do passo 1) |
| `CORS_ORIGINS` | `https://<seu-frontend>.pages.dev,https://dropa-delivery.com,http://localhost:5173` |
| `CORS_ORIGINS_REGEX` | (opcional) `^https://[a-z0-9-]+\.dropa-delivery\.com$` para subdomínios |
| `DATABASE_URL` | (já configurado) |
| `GEMINI_API_KEY` | (já configurado, opcional) |

### 3) Fazer push do código
```bash
cd /app
git add backend_delivery/ frontend-delivery/ AUDITORIA_DROPA_DELIVERY.md memory/
git commit -m "Sprint 1: segurança (bcrypt, JWT, rate limit, Zod, helmet)"
git push
```
O Render vai detectar, instalar `bcryptjs jsonwebtoken helmet express-rate-limit zod` automaticamente e re-deploy.

### 4) 🧪 Teste após deploy
```bash
# Health check
curl https://api-dropa-delivery.onrender.com/health

# Login gerente (troque email/senha)
curl -X POST https://api-dropa-delivery.onrender.com/login-gerente \
  -H "Content-Type: application/json" \
  -d '{"email":"seu@email.com","senha":"suasenha"}'
# → deve retornar { access_token, refresh_token, user }

# Tentativa sem token em rota protegida
curl -X GET https://api-dropa-delivery.onrender.com/pedidos
# → deve retornar 401 { erro: "Não autenticado..." }

# Com token
curl -X GET https://api-dropa-delivery.onrender.com/pedidos \
  -H "Authorization: Bearer <token>"
# → deve retornar array de pedidos

# Rate limit
for i in {1..7}; do curl -s -X POST https://api-dropa-delivery.onrender.com/login-gerente \
  -H "Content-Type: application/json" -d '{"email":"x@x.com","senha":"nada"}' | head -1; done
# → nas últimas 2 tentativas deve retornar 429 "Muitas tentativas"
```

### 5) 1º login de gerente após deploy (migração automática do bcrypt)
- Use o mesmo email e a mesma senha atuais
- No 1º login bem-sucedido, o backend **automaticamente rehasheia** a senha em bcrypt
- Logins subsequentes já usam bcrypt
- **Zero perda de acesso, zero downtime**

## 🌐 Frontend (GitHub Pages / Cloudflare Pages)
```bash
cd /app/frontend-delivery
yarn build
yarn deploy  # já configurado no package.json (gh-pages)
```

---

## ⚠️ CUIDADOS

1. **Ao configurar `CORS_ORIGINS`**, use o domínio EXATO do frontend em produção (sem barra no final)
2. **Se esquecer o `JWT_SECRET`**, todos os tokens ativos ficam inválidos → usuários precisam relogar (não é bug, é o esperado)
3. **`GEMINI_API_KEY` opcional** — se não configurar, rotas de IA voltam ao fallback estático (não crasham)
4. Os **PINs continuam armazenados em texto puro** no banco (pequeno risco, mas prático — quem tem acesso ao banco tem acesso ao sistema todo mesmo). Se quiser evoluir isso no Sprint 2, posso hashear os PINs também com bcrypt.

## 🔁 Rollback

Se algo der errado em produção:
```bash
# No dashboard do Render → Deploys → clique no deploy anterior → "Rollback to this deploy"
```
Frontend: `gh-pages` guarda o histórico — reverta o commit e re-deploy.
