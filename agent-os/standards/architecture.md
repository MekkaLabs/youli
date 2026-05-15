# Architecture Standards — Youli

## Monorepo Structure
```
Youli/
  apps/
    mobile/     → Expo 54 + React Native 0.81.5 (iOS/Android/Web)
    api/        → Next.js 15 (App Router, TypeScript)
  packages/     → shared libs (future)
  node_modules/ → root hoisted deps (npm workspaces)
```

## Key Rules
- Run from root: `npm run dev:api` / `npm run dev:mobile` / `npm run dev`
- Mobile deps: add to `apps/mobile/package.json`, install with `npm install -w @youli/mobile`
- DEDUPE in `metro.config.js` points to `apps/mobile/node_modules/*` (NOT root) for react/react-native
- react-native version: **0.81.5** (SDK 54 compatible — do NOT upgrade to root's 0.85.3)

## API Base
- Framework: Next.js 15 App Router
- All routes: `apps/api/app/api/[route]/route.ts`
- Anthropic Claude API via `@anthropic-ai/sdk`
- Supabase for DB + auth + realtime

## Mobile Base
- Expo SDK 54 / expo-router 6
- Entry: `apps/mobile/app/(tabs)/` (file-based routing)
- Custom BottomNav — tab bar hidden, navigation via `router.push()`
- Active tab inferred from `usePathname()`
