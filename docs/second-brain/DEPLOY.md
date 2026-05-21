# Deploy — Youli (host com disco persistente)

> Alvo: **Railway / Render / Fly.io** (processo longo + volume persistente).
> Decisão: **NÃO usamos Vercel** — o design atual grava estado em disco
> (`.data/`: users, db por-usuário, tokens). Serverless apagaria isso.
> Mobile no beta: **Expo Go via tunnel**.

---

## 1. API — o que sobe

- **Build context:** raiz do repo (precisa de `packages/*` + `package.json` raiz).
- **Dockerfile:** na raiz (já versionado). `apps/mobile` é excluído via `.dockerignore`.
- **Build validado:** `npm run build -w @youli/api` compila 91 rotas com sucesso.
- **Porta:** a API lê `process.env.PORT` (o host injeta), fallback 3002.

## 2. Volume persistente (OBRIGATÓRIO)

Monte um volume em:
```
/app/apps/api/src/repositories/.data
```
Guarda: `users.json`, `users/{id}.json` (db por-usuário), `strava/`, `zepp/`, `google/`.
Sem o volume, **os dados somem a cada deploy/restart**.

> Obs: tasks/goals/habits/insights/memória já vivem no **Supabase**
> (`YOULI_USE_SUPABASE=true`). O volume cobre o resto (auth, profile,
> calendar, fitness, tokens de integração).

## 3. Variáveis de ambiente (produção)

| Var | Obrigatória | Notas |
|-----|-------------|-------|
| `YOULI_SESSION_SECRET` | **SIM** | `auth.ts` LANÇA erro em produção sem ela. `openssl rand -hex 32`. |
| `NEXT_PUBLIC_SUPABASE_URL` | sim | `https://zpzwqpowvkavregozioz.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | sim | a secret (`sb_secret_...`) |
| `YOULI_USE_SUPABASE` | sim | `true` |
| `ANTHROPIC_API_KEY` | recomendada | sem ela, agentes caem no fallback |
| `CORS_ALLOWED_ORIGINS` | se houver web externa | CSV. Web é same-origin (não precisa); mobile RN não usa CORS. |
| `GOOGLE_CLIENT_ID/SECRET` | opcional | Google Calendar |
| `STRAVA_CLIENT_ID/SECRET` | opcional | Strava |
| `ZEPP_CLIENT_ID/SECRET` | opcional | Zepp |
| `NODE_ENV` | auto | `production` (já no Dockerfile) |

## 4. Passo a passo — Railway (recomendado, mais simples)

1. railway.app → **New Project → Deploy from GitHub repo** → selecione `MekkaLabs/youli`, branch `claude/priceless-cray-231c32`.
2. **Settings → Build:** "Dockerfile" (raiz). Root directory = repo root.
3. **Variables:** cole as env vars da seção 3.
4. **Volumes:** adicione um volume montado em `/app/apps/api/src/repositories/.data`.
5. Deploy. A URL pública sai em **Settings → Networking → Generate Domain**.
6. **Healthcheck:** `GET /api/auth/me` deve responder 401 (sem sessão) — sinal de que está no ar.

> **Render:** New → Web Service → Docker → mesmo Dockerfile; adicione **Disk** em
> `/app/apps/api/src/repositories/.data`. **Fly.io:** `fly launch` (usa o Dockerfile)
> + `fly volumes create youli_data` montado no mesmo path (`fly.toml`).

## 5. OAuth em produção (Strava/Google)

Os callbacks devem usar o **domínio de produção**, não localhost:
- Strava → Authorization Callback Domain = `<seu-dominio>` (sem path).
- Google → Authorized redirect URI = `https://<seu-dominio>/api/integrations/google/callback`.

## 6. Mobile (Expo Go via tunnel)

Aponte o app para a API publicada:
```
# apps/mobile/.env (ou EXPO_PUBLIC_API_URL no ambiente do Expo)
EXPO_PUBLIC_API_URL=https://<sua-api>.up.railway.app
```
Suba com `npx expo start --tunnel` e escaneie o QR. A amiga instala o **Expo Go**
e abre pelo QR. Login: a conta dela (`amiga@youli.app`) ou uma criada no painel admin.

## 7. Checklist pós-deploy

- [ ] `GET /api/auth/me` → 401 (no ar).
- [ ] login do admin → 200 + token.
- [ ] criar meta → persiste (Supabase).
- [ ] restart do serviço → dados continuam (volume ok).
- [ ] rate limit: 11 logins seguidos → 429.
