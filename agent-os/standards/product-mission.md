# Product Mission — Youli

## What it is
Youli is a **Personal Cognitive OS** — an AI-powered life management system.
Not a productivity app. A second brain that thinks, plans, and acts alongside the user.

## Core Pillars
1. **Life Areas**: saúde, finanças, hábitos, metas, tarefas, carreira, relacionamentos, espiritualidade
2. **Copilot AI**: conversational AI (powered by Claude) accessible from any screen
3. **Memory**: persistent user context via MemoryEngine (Supabase + pgvector)
4. **Multi-agent**: specialized squads per life area, orchestrated by a named AI (default: "Jarvis")
5. **Simulation**: life trajectory projection 30/60/90 days

## Users
- Self-directed individuals who want AI to help them grow intentionally
- Primary: Brasil market (PT-BR interface)
- Secondary: global (EN support planned)

## Tech Philosophy
- Mobile-first (Expo Go / native)
- Offline-aware (OfflineBanner, graceful degradation)
- Privacy-first (no ads, no data selling)
- Agent-native: AI is core UX, not a feature bolt-on

## Current Status (May 2026)
- 59 features implemented
- Expo SDK 54, React Native 0.81.5
- aios-core + squads multi-agent system active
- Targeting MVP launch
