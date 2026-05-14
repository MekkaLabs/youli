# 🎤 Youli Voice — Configuração com Handy

> Configure o Handy para falar diretamente com o Youli e seus agentes históricos no macOS.

---

## O que é o Handy?

O **Handy** é um app de transcrição de voz local para macOS. Ele captura sua voz com um atalho de teclado, transcreve localmente (sem nuvem) e pode processar o texto via Claude Haiku antes de colar no campo ativo.

**Site:** https://handy.computer

---

## Por que usar com o Youli?

| Cenário | Sem Handy | Com Handy |
|---------|-----------|-----------|
| Criar tarefa | Digitar no app | "Franklin, tarefa: reunião às 15h" |
| Registrar gasto | Abrir tela, digitar | "Gastei R$50 no almoço" |
| Morning briefing | Tocar botão | "Bom dia" → briefing completo |
| Consultar agente | Digitar pergunta | "Alexandre, como estão minhas metas?" |
| Simulação | Navegar para tela | "E se eu dormisse 8h por dia?" |

---

## Instalação

1. Baixe o Handy em **https://handy.computer**
2. Abra o `.dmg` e arraste para `/Applications`
3. Na primeira abertura, conceda permissão de **microfone** e **acessibilidade**

---

## Configuração passo a passo

### 1. Escolha o modelo de transcrição

No menu do Handy (barra de status) → **Settings → Model**:

- **Parakeet V3** — recomendado, 25 idiomas incluindo Português 🇧🇷
- **Whisper Large** — mais lento, mas suporta 99+ idiomas

> Use Parakeet V3 para melhor performance em português.

---

### 2. Configure o atalho de teclado

**Settings → Shortcut**

Opções recomendadas para o Youli:
- `Option + Space` — padrão do Handy (não conflita com o macOS)
- `Fn` — tecla dedicada (configure em "Use Fn key")
- `Cmd + Shift + V` — se preferir algo mais explícito de "Voice"

---

### 3. Configure o pós-processamento (⭐ essencial)

Esta é a etapa mais importante. O Handy vai enviar a transcrição para o Claude Haiku e formatar como comando Youli antes de colar.

**Settings → Post-processing → Enable AI post-processing ✓**

**Provider:** Anthropic

**API Key:** sua chave da Anthropic (a mesma do `.env.local`)

**Prompt (cole exatamente assim):**

```
Você é o assistente de voz do Youli, um app de gestão de vida.

Transforme o texto transcrito abaixo em um comando claro e direto para o Youli.

Regras:
- Se o usuário mencionar um agente histórico (Franklin, Aristóteles, Alexandre, Adam, Hipócrates, Newton, Sócrates, Tesla, Marco Aurélio, Leonardo), mantenha o nome no início
- Corrija gírias e informalidade para português claro
- Se for criação de tarefa/hábito/meta, comece com o verbo no imperativo: "Adicionar tarefa: X"
- Se for pergunta, formule como pergunta direta
- Se for valor monetário, mantenha o formato R$ XX,00
- Máximo de 2 frases

Texto transcrito: "${output}"

Comando Youli:
```

> Obtenha o prompt via API: `GET /api/voice/command` retorna o campo `handyPrompt`

---

### 4. Configure o auto-envio (opcional)

**Settings → Advanced → Auto-submit**

- **Enter** — envia ao pressionar Enter (recomendado com o Youli web)
- **Cmd+Enter** — envia com Cmd+Enter
- **Off** — você revisa antes de enviar

---

### 5. Posição do overlay

**Settings → Overlay position**

Escolha onde o indicador de gravação aparece na tela. Recomendado: **Bottom center** para não cobrir o Youli.

---

## Como usar com o Youli

### No navegador (app web)

1. Abra o Youli no Chrome: `http://localhost:3000`
2. Clique no campo de texto do Copilot
3. Pressione `Option + Space` (ou seu atalho)
4. Fale o comando
5. O texto aparece já formatado — pressione Enter para enviar

### No app mobile (Expo Go)

O Youli mobile tem um botão de microfone **🎤** integrado diretamente no CopilotBar. Toque para ativar a gravação nativa do iOS/Android.

---

## Comandos de voz disponíveis

### Agentes por nome

| Diga | Vai para |
|------|----------|
| "Franklin, ..." | Tarefas |
| "Aristóteles, ..." | Hábitos |
| "Alexandre, ..." | Metas |
| "Adam, ..." | Financeiro |
| "Hipócrates, ..." | Fitness |
| "Newton, ..." | Calendário |
| "Sócrates, ..." | Insights |
| "Tesla, ..." | Foco |
| "Marco Aurélio, ..." | Perfil |
| "Leonardo, ..." | Dashboard |

### Comandos diretos

| Frase | Ação |
|-------|------|
| `"Bom dia"` / `"Morning briefing"` | Briefing matinal completo |
| `"Adicionar tarefa: [nome]"` | Cria tarefa via Franklin |
| `"Novo hábito: [nome]"` | Cria hábito via Aristóteles |
| `"Criar meta: [nome]"` | Cria meta via Alexandre |
| `"Gastei R$X em [categoria]"` | Registra gasto via Adam |
| `"Recebi R$X de [fonte]"` | Registra receita via Adam |
| `"Treinei [atividade] por [tempo]"` | Registra treino via Hipócrates |
| `"E se eu [mudança]?"` | Simulação what-if |
| `"Simular 90 dias"` | Projeta trajetória atual |
| `"Como estão minhas [área]?"` | Consulta status da área |

---

## Controle via linha de comando

O Handy suporta controle por sinal UNIX — útil para scripts e automações:

```bash
# Iniciar/parar transcrição
kill -USR2 $(pgrep -x Handy)

# Via CLI (se instalado)
handy --toggle-transcription

# Ativar com flag
handy --start
handy --stop
```

### Atalho no macOS (Automator)

Crie um Quick Action no Automator com:
```bash
kill -USR2 $(pgrep -x Handy)
```
E atribua um atalho global em **System Settings → Keyboard → Shortcuts → Services**.

---

## Integração avançada: API direta

O Youli expõe a rota `/api/voice/command` para integração direta:

```bash
# Teste via curl
curl -X POST http://localhost:3000/api/voice/command \
  -H "Content-Type: application/json" \
  -d '{"text": "Franklin, adicionar tarefa: revisar proposta"}'

# Resposta esperada:
# {
#   "intent": { "type": "create_task", "area": "tarefas", "agentName": "Franklin", "confidence": 0.9 },
#   "action": "create_task",
#   "success": true,
#   "message": "✅ Franklin registrou: \"revisar proposta\"",
#   "redirectTo": "/(tabs)/tarefas"
# }

# Ver prompt Handy gerado automaticamente
curl http://localhost:3000/api/voice/command
```

---

## Modelos de transcrição disponíveis no Handy

| Modelo | Idiomas | Velocidade | Qualidade |
|--------|---------|------------|-----------|
| Parakeet V3 | 25 (🇧🇷 ✓) | Rápido | Alta |
| Whisper Tiny | 99+ | Muito rápido | Básica |
| Whisper Base | 99+ | Rápido | Boa |
| Whisper Large | 99+ | Lento | Excelente |
| Moonshine | EN apenas | Ultra-rápido | Boa |

> **Recomendação Youli:** Parakeet V3 para uso diário em PT-BR. Whisper Large para comandos complexos ou sotaque regional.

---

## Troubleshooting

**O texto não aparece no campo do Youli**
→ Certifique que o campo de texto está focado antes de ativar o Handy.

**A transcrição está em inglês**
→ Em Settings → Model, confirme que selecionou Parakeet V3 ou Whisper Large.

**O pós-processamento não está funcionando**
→ Verifique se a API key Anthropic está correta e se você tem créditos disponíveis.

**O Handy não abre depois de atualizar macOS**
→ Re-conceda permissão em System Settings → Privacy & Security → Accessibility.

---

## Roadmap de voz Youli

- [x] Endpoint `/api/voice/command` com parser de intenções
- [x] Integração Handy (desktop)
- [x] VoiceInput nativo no CopilotBar (mobile)
- [ ] `/api/voice/transcribe` com Whisper local (semana 5)
- [ ] Wake word "Hey Youli" via Picovoice Porcupine
- [ ] Resposta em áudio (TTS via expo-speech)
- [ ] Comandos de voz offline com Moonshine
