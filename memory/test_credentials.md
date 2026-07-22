# 🔐 Credenciais de Teste — Dropa Delivery

## Sistema em produção (usuário)
As credenciais de produção são do próprio usuário. Este arquivo é para **ambiente de desenvolvimento local** apenas.

## Como testar o login localmente (após Sprint 1)

### 1) Backend rodando localmente (opcional — o dev usa Render remoto por padrão)
Se você quiser rodar backend local:
```bash
cd /app/backend_delivery
# Configure o .env (veja .env.example)
cp .env.example .env
# Edite o JWT_SECRET (gere um novo com o comando abaixo)
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
# Rode
yarn install
yarn dev
```

### 2) Endpoints de autenticação
| Método | Endpoint | Auth | Body |
|---|---|---|---|
| POST | `/login-gerente` | Público (rate-limited) | `{ email, senha }` |
| POST | `/login-pin` | Público (rate-limited) | `{ pin }` |
| POST | `/auth/refresh` | Público | `{ refresh_token }` |
| GET | `/auth/me` | Bearer JWT | — |

### 3) Fluxo de login gerente (exemplo)
```bash
API=https://api-dropa-delivery.onrender.com  # ou http://localhost:10000 se local

# 1. Login
curl -X POST $API/login-gerente -H "Content-Type: application/json" \
  -d '{"email":"seu@email.com","senha":"suasenha"}'
# → { "access_token": "eyJ...", "refresh_token": "eyJ...", "user": {...} }

# 2. Usar o token
TOKEN="eyJ..."
curl $API/auth/me -H "Authorization: Bearer $TOKEN"

# 3. Refresh quando expirar
curl -X POST $API/auth/refresh -H "Content-Type: application/json" \
  -d '{"refresh_token":"eyJ..."}'
```

### 4) Como criar/promover um gerente no banco (Supabase SQL Editor)
```sql
-- Ver gerentes existentes
SELECT id, nome, email, tipo_usuario FROM usuarios WHERE tipo_usuario = 'gerente';

-- Promover um usuário existente a gerente
UPDATE usuarios SET tipo_usuario = 'gerente' WHERE email = 'seu@email.com';

-- OU criar um gerente novo (senha em texto puro — sistema rehasheia no 1º login)
INSERT INTO usuarios (nome, cpf, whatsapp, email, senha, tipo_usuario)
VALUES ('Admin', '00000000000', '11999999999', 'admin@dropa.local', 'senha123', 'gerente');
```

### 5) Como criar um PIN de funcionário
```sql
INSERT INTO funcionarios (nome, cargo, pin, ativo, criado_em)
VALUES ('João PDV', 'funcionario', '1234', true, NOW());
```
No painel de login → usar PIN `1234`.

## ⚠️ Observações
- Os PINs continuam em texto puro no banco por enquanto (design original preservado).
- No 1º login bem-sucedido de gerente, o sistema **automaticamente rehasheia** a senha em bcrypt (migração lazy).
- Access token dura 2h. Refresh token dura 7d. Após 7d sem uso → precisa relogar.
