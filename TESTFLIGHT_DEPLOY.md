# 🚀 Youli → TestFlight: Guia Completo

> **Objetivo:** App funcionando no iPhone da sua amiga amanhã.  
> **Tempo estimado:** ~2–3 horas (a maior parte é tempo de build da Apple)

---

## ✅ O que já está pronto

- [x] Todos os 15 itens de UX/dados (Sprint P1)
- [x] Assets criados: `icon.png`, `splash.png`, `adaptive-icon.png`, `favicon.png`
- [x] `vercel.json` configurado para deploy do API
- [x] `eas.json` com perfil `preview` para iOS
- [x] TypeScript: 0 erros

---

## PASSO 1 — Vercel (API no ar)

O app mobile precisa de uma URL real para chamar `/api/copilot`, `/api/dashboard`, etc.

### 1.1 — Crie conta e conecte o repositório

1. Acesse **[vercel.com](https://vercel.com)** → faça login com GitHub
2. Clique em **"Add New Project"**
3. Selecione o repositório **`MekkaLabs/youli`**
4. Em **"Root Directory"**, troque de `/` para **`apps/api`**
5. Framework será detectado automaticamente como **Next.js**

### 1.2 — Variáveis de ambiente no Vercel

Antes de fazer deploy, adicione essas variáveis em **Settings → Environment Variables**:

| Variável | Valor |
|---|---|
| `ANTHROPIC_API_KEY` | Sua chave real (obtenha em [console.anthropic.com](https://console.anthropic.com)) |
| `NEXT_PUBLIC_SUPABASE_URL` | URL do seu projeto Supabase (ou deixe vazio por enquanto) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key do Supabase (ou deixe vazio) |
| `NODE_ENV` | `production` |

> **Atenção:** Sem `ANTHROPIC_API_KEY` real, o copilot IA não vai funcionar — mas o resto do app funciona normalmente.

### 1.3 — Faça o primeiro deploy

Clique em **Deploy**. Em ~3 minutos o Vercel vai te dar uma URL como:

```
https://youli-api-xxxxxxxx.vercel.app
```

**Copie essa URL — você vai precisar no Passo 2.**

> Dica: Adicione também um domínio customizado depois (ex: `api.youli.app`), mas isso não é necessário para os testes de amanhã.

---

## PASSO 2 — Atualizar URL da API no app

Abra o arquivo `apps/mobile/eas.json` e troque a URL do perfil `preview`:

```json
"preview": {
  "env": {
    "EXPO_PUBLIC_API_URL": "https://youli-api-xxxxxxxx.vercel.app"
  }
}
```

Substitua `youli-api-xxxxxxxx.vercel.app` pela URL real que o Vercel te deu.

---

## PASSO 3 — Conta Apple Developer (necessária para TestFlight)

> Se você já tem conta Apple Developer ativa, pule para o Passo 4.

1. Acesse **[developer.apple.com/programs](https://developer.apple.com/programs)**
2. Clique em **"Enroll"**
3. Siga o processo com seu Apple ID — custa **US$ 99/ano**
4. A aprovação pode levar até 48h, mas geralmente é imediata

> **Alternativa gratuita para testar HOJE:** Use o perfil `development` com `"simulator": true` — roda no simulador iOS do Mac sem precisar da conta paga. Mas para instalar no iPhone da sua amiga, precisa de TestFlight, que requer a conta.

---

## PASSO 4 — Inicializar EAS no projeto

No terminal, dentro da pasta `apps/mobile`:

```bash
cd /Users/gustavovicente/Documents/Youli/apps/mobile

# Login na sua conta Expo
npx eas-cli login

# Inicializar o projeto EAS (gera um Project ID real)
npx eas-cli init
```

O comando `eas init` vai perguntar se você quer criar um novo projeto — diga **sim**. Ele vai atualizar o `app.json` automaticamente com o `projectId` real.

---

## PASSO 5 — Commitar e fazer push das mudanças

```bash
cd /Users/gustavovicente/Documents/Youli

git add -A
git commit -m "Sprint P1: UX improvements + assets + Vercel config"
git push origin main
```

O EAS Build vai usar o código do GitHub (não precisa do código local).

---

## PASSO 6 — Build iOS para TestFlight

```bash
cd /Users/gustavovicente/Documents/Youli/apps/mobile

# Build de preview (vai para o iPhone real via TestFlight)
npx eas-cli build --profile preview --platform ios
```

O EAS vai te fazer algumas perguntas:
- **Apple ID:** `gustav0.v1c3nt3@gmail.com`
- **Team ID:** (aparece no Apple Developer dashboard)
- **Certificados:** EAS cria e gerencia automaticamente

O build fica pronto em **~20–40 minutos** nos servidores da Apple/Expo.

---

## PASSO 7 — Distribuição pelo TestFlight

Quando o build terminar, o EAS vai te dar um link direto para o App Store Connect.

### Opção A: Link de convite direto (mais fácil)
1. No [App Store Connect](https://appstoreconnect.apple.com) → seu app → TestFlight
2. Clique em **"External Testing"** → **"Add External Testers"**
3. Adicione o email da sua amiga
4. Ela vai receber um email com convite para baixar via TestFlight

### Opção B: Link público
1. Ative **"Public Link"** no TestFlight
2. Compartilhe o link — qualquer pessoa pode instalar via link

---

## PASSO 8 — Verificar se a API está funcionando

Depois que o Vercel deployar, teste no browser:

```
https://youli-api-xxxxxxxx.vercel.app/api/dashboard
https://youli-api-xxxxxxxx.vercel.app/api/copilot/life-health
```

Se retornar JSON (mesmo que com dados mockados), está tudo certo.

---

## 🛟 Troubleshooting comum

| Problema | Solução |
|---|---|
| EAS Build falha com "no bundle identifier" | Confirme `com.youli.app` no `app.json` → `expo.ios.bundleIdentifier` |
| "Invalid credentials" no EAS | Rode `eas credentials --platform ios` para recriar |
| API retorna 500 | Verifique os logs no Vercel → Deployments → Functions |
| App não carrega dados | Confirme que `EXPO_PUBLIC_API_URL` no `eas.json` aponta para a URL Vercel correta |
| TestFlight "processing" | Normal — Apple leva 15–30 min para processar o build |

---

## 📋 Checklist final antes do build

- [ ] URL da Vercel atualizada no `eas.json` (preview)
- [ ] `ANTHROPIC_API_KEY` real no Vercel (para o copilot funcionar)
- [ ] `npx eas init` rodado (substitui o projectId placeholder)
- [ ] Push para o GitHub feito
- [ ] Conta Apple Developer ativa

---

## 🔮 Depois dos testes: próximos passos

1. **Supabase real:** criar projeto em [app.supabase.com](https://app.supabase.com), rodar `supabase/migrations/001_youli_schema.sql`, adicionar vars no Vercel
2. **Strava OAuth:** registrar callback URL com a URL do Vercel em [strava.com/settings/api](https://www.strava.com/settings/api)
3. **Domínio customizado:** apontar `api.youli.app` para o Vercel
