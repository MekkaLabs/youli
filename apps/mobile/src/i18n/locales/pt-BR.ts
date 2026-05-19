/**
 * Youli — Traduções PT-BR (base / referência)
 * Todas as strings do aplicativo catalogadas aqui.
 */
export default {
  // ─── App global ───────────────────────────────────────────────────────────
  app: {
    name: 'Youli',
    tagline: 'Seu agente pessoal de vida',
    loading: 'Carregando...',
    error: 'Ocorreu um erro',
    retry: 'Tentar novamente',
    save: 'Salvar',
    cancel: 'Cancelar',
    confirm: 'Confirmar',
    delete: 'Excluir',
    edit: 'Editar',
    close: 'Fechar',
    back: 'Voltar',
    next: 'Próximo',
    done: 'Concluído',
    yes: 'Sim',
    no: 'Não',
    ok: 'OK',
    search: 'Buscar',
    refresh: 'Atualizar',
    connect: 'Conectar',
    disconnect: 'Desconectar',
    sync: 'Sincronizar',
    settings: 'Configurações',
    soon: 'Em breve',
    new: 'Novo',
    viewAll: 'Ver todos',
    viewDetails: 'Ver detalhes',
    tapForDetails: 'Toque para ver detalhes →',
    never: 'Nunca',
    today: 'Hoje',
    yesterday: 'Ontem',
    week: 'Semana',
    month: 'Mês',
    days: 'dias',
    hours: 'horas',
    minutes: 'minutos',
  },

  // ─── Navigation ───────────────────────────────────────────────────────────
  nav: {
    dashboard: 'Dashboard',
    habits: 'Hábitos',
    tasks: 'Tarefas',
    goals: 'Metas',
    finances: 'Financeiro',
    fitness: 'Fitness',
    calendar: 'Calendário',
    insights: 'Insights',
    focus: 'Foco',
    simulate: 'Simular',
    profile: 'Perfil',
  },

  // ─── Dashboard ────────────────────────────────────────────────────────────
  dashboard: {
    title: 'Dashboard',
    subtitle: 'Visão geral do seu universo',
    lifeHealth: 'Life Health',
    ancScore: 'ANC Score',
    sustainability: 'Sustentabilidade',
    critical: '⚠️ Crítico:',
    tapForDetails: 'Toque para ver detalhes →',
  },

  // ─── Habits ───────────────────────────────────────────────────────────────
  habits: {
    title: 'Hábitos',
    subtitle: 'Consistência gera excelência',
    streak: 'streak',
    days: 'dias',
    complete: 'Concluir',
    completed: 'Concluído',
    addHabit: 'Novo Hábito',
    noHabits: 'Nenhum hábito ainda',
    noHabitsHint: 'Crie seu primeiro hábito e comece a construir sua melhor versão.',
    weeklyConsistency: 'Consistência Semanal',
    bestStreak: 'Maior Streak',
    completedToday: 'Concluídos Hoje',
  },

  // ─── Tasks ────────────────────────────────────────────────────────────────
  tasks: {
    title: 'Tarefas',
    subtitle: 'Execute com precisão',
    newTask: 'Nova Tarefa',
    noTasks: 'Nenhuma tarefa',
    noTasksHint: 'Adicione tarefas para organizar seu dia.',
    complete: 'Concluir',
    delete: 'Excluir',
    priority: {
      high: 'Alta',
      medium: 'Média',
      low: 'Baixa',
    },
    status: {
      pending: 'Pendente',
      inProgress: 'Em andamento',
      completed: 'Concluída',
    },
  },

  // ─── Goals ────────────────────────────────────────────────────────────────
  goals: {
    title: 'Metas',
    subtitle: 'Construa o futuro que você merece',
    newGoal: 'Nova Meta',
    progress: 'Progresso',
    noGoals: 'Nenhuma meta ainda',
    noGoalsHint: 'Defina metas claras e deixe o Youli te ajudar a alcançá-las.',
    active: 'Ativa',
    completed: 'Concluída',
    paused: 'Pausada',
    deadline: 'Prazo',
    milestones: 'Marcos',
  },

  // ─── Finances ─────────────────────────────────────────────────────────────
  finances: {
    title: 'Financeiro',
    subtitle: 'Controle financeiro inteligente',
    balance: 'Saldo',
    income: 'Receitas',
    expenses: 'Despesas',
    savings: 'Economias',
    transactions: 'Transações',
    categories: 'Categorias',
    noTransactions: 'Nenhuma transação',
    connectBank: 'Conectar banco',
  },

  // ─── Fitness ──────────────────────────────────────────────────────────────
  fitness: {
    title: 'Fitness',
    subtitle: 'Corpo saudável, mente poderosa',
    workouts: 'treinos',
    thisWeek: 'esta semana',
    lastWorkout: 'último treino',
    consistency: {
      high: 'alta',
      medium: 'média',
      low: 'baixa',
    },
    analyze: '⚕️ Hipócrates analisar minha saúde',
    analyzing: 'Analisando...',
    lifeRhythm: '♻️ Ritmo de Vida',
    detectedGap: '⚕️ Gap detectado:',
  },

  // ─── Calendar ─────────────────────────────────────────────────────────────
  calendar: {
    title: 'Calendário',
    tabs: {
      agenda: 'Agenda',
      focus: 'Blocos de foco',
    },
    noEvents: 'Sem eventos hoje',
    noEventsHint: 'Conecte o Google Calendar ou o calendário nativo para ver sua agenda real.',
    noFocusBlocks: 'Agenda muito cheia',
    noFocusBlocksHint: 'Nenhum bloco livre ≥30min encontrado. Considere reorganizar compromissos.',
    deepFocusTip: '💡 Blocos de foco profundo (≥90min) são ideais para trabalho criativo.',
    source: {
      api: '☁️ Google Calendar',
      native: '📱 Calendário nativo',
      mock: '📋 Demo',
    },
    connectHint: 'Conecte o Google Calendar para dados reais',
    sustainability: 'Sustentab.',
    deepBlocks: 'Blocos deep',
    efficiency: 'Eficiência',
    loading: 'Carregando agenda...',
  },

  // ─── Insights ─────────────────────────────────────────────────────────────
  insights: {
    title: 'Insights',
    subtitle: 'Padrões invisíveis, revelados',
    criticalGaps: 'Gaps Críticos Detectados',
    noInsights: 'Nenhum insight ainda',
    noInsightsHint: 'Use o copiloto por alguns dias para gerar seus primeiros insights.',
    generating: 'Gerando insights...',
    generate: '🧠 Gerar Insights com IA',
  },

  // ─── Focus ────────────────────────────────────────────────────────────────
  focus: {
    title: 'Foco',
    subtitle: 'Entre no estado de flow',
    start: 'Iniciar sessão de foco',
    stop: 'Parar',
    pause: 'Pausar',
    resume: 'Retomar',
    pomodoro: 'Pomodoro',
    deepWork: 'Deep Work',
    sessionLength: 'Duração da sessão',
    breakLength: 'Duração da pausa',
  },

  // ─── Profile ──────────────────────────────────────────────────────────────
  profile: {
    title: 'Perfil',
    subtitle: 'Sua identidade e conquistas',
    level: 'Nível',
    xp: 'XP',
    achievements: 'Conquistas',
    weeklyReview: 'Revisão Semanal',
    orchestrator: '🤖 Orquestrador',
    settings: '⚙️ Configurações',
    weeklyCI: '🔄 CI Semanal',
    lifeScore: '📊 Life Score',
    sweciSettings: '🛠️ SWE-CI',
    evolution: '📈 Evolução',
    integrations: '🔗 Integrações',
    runningCI: 'Rodando pipeline...',
    ciSuccess: 'Pipeline CI concluído!',
    ciError: 'Erro ao rodar pipeline',
  },

  // ─── Life Score ───────────────────────────────────────────────────────────
  lifeScore: {
    title: 'Life Score',
    grade: 'Grade Geral de Vida',
    gradeSubtitle: 'Baseado em 10 áreas avaliadas por IA',
    criticalAreas: 'área crítica',
    criticalAreasPlural: 'áreas críticas',
    weekPriorities: '🎯 Prioridades da Semana',
    criticalGaps: '🔍 Gaps Críticos Detectados',
    lastPipeline: '🔄 Último Pipeline Semanal',
    activeFeatures: '⚙️ Features Ativas',
    viewEvolution: '📈 Ver Histórico de Evolução',
    evolutionSubtitle: 'Métricas ao longo do tempo por área →',
    loading: 'Calculando Life Health Score...',
    noData: 'Nenhum dado disponível.\nHabilite o Parallel Evaluator nas configurações.',
    sustainability: 'Sustentab.',
    lifeHealth: 'Life Health',
    ancScore: 'ANC Score',
  },

  // ─── Integrations ─────────────────────────────────────────────────────────
  integrations: {
    title: 'Integrações',
    connected: 'app conectado',
    connectedPlural: 'apps conectados',
    sport: '🏃 Esporte & Saúde',
    sportSubtitle: 'Alimenta o Life Health Score e Evolution Tracker',
    roadmap: '🌍 Próximas Integrações',
    roadmapSubtitle: 'Youli como mega agente pessoal global',
    howItWorks: '🔬 Como os dados alimentam o SWE-CI',
    howItWorksText: 'Cada sincronização registra pontos de evolução no Evolution Tracker. Esses dados calculam seu Life Health Score e detectam gaps automaticamente.',
    viewLifeScore: 'Ver Life Score →',
    connecting: 'Conectando...',
    syncSuccess: 'atividades sincronizadas',
    pointsRecorded: 'pontos SWE-CI registrados',
    syncError: 'Erro ao sincronizar',
    disconnectConfirm: 'Remover a conexão?',
    neverSynced: 'Nunca sincronizado',
    lastSync: 'Sync',
  },

  // ─── Accessibility ────────────────────────────────────────────────────────
  a11y: {
    menu: 'Menu de navegação',
    back: 'Voltar para a tela anterior',
    close: 'Fechar',
    openProfile: 'Abrir perfil',
    openSettings: 'Abrir configurações',
    refreshPage: 'Atualizar página',
    lifeHealthScore: 'Life Health Score: {{score}} pontos',
    ancScore: 'ANC Score: {{score}} pontos',
    copilotOpen: 'Abrir copiloto de IA',
    habitComplete: 'Marcar hábito {{name}} como concluído',
    taskComplete: 'Marcar tarefa {{name}} como concluída',
    goalProgress: 'Meta {{name}}: {{progress}}% concluída',
    connectApp: 'Conectar com {{app}}',
    syncApp: 'Sincronizar dados com {{app}}',
    highContrast: 'Modo alto contraste',
    fontSize: 'Tamanho da fonte',
    reduceMotion: 'Reduzir animações',
  },

  // ─── SWE-CI Settings ──────────────────────────────────────────────────────
  sweciSettings: {
    title: 'SWE-CI Config',
    subtitle: 'Runtime feature flags',
    featuresActive: 'features ativas',
    changeInfo: 'Alterações aplicadas imediatamente nas próximas requisições',
    enableAll: '✅ Ativar todo SWE-CI',
    groups: {
      core: 'SWE-CI Core',
      coreDesc: 'Pipeline principal de avaliação contínua de vida',
      tracking: 'Tracking & Histórico',
      trackingDesc: 'Rastreamento de evolução ao longo do tempo',
      agents: 'Agentes & Orquestração',
      agentsDesc: 'Capacidades avançadas dos agentes IA',
    },
    impact: {
      high: 'alto',
      medium: 'médio',
      low: 'baixo',
    },
  },

  // ─── Evolution History ────────────────────────────────────────────────────
  evolutionHistory: {
    title: 'Evolução',
    subtitle: 'Histórico de métricas SWE-CI',
    improving: 'Melhorando',
    stable: 'Estável',
    declining: 'Piorando',
    noData: 'Sem dados nos últimos {{days}} dias',
    noDataHint: 'O SWE-CI registra métricas automaticamente durante as sessões do copiloto.',
    points: 'pontos',
    metrics: 'métricas rastreadas',
    all: '🌍 Todas',
    highVolatility: '⚡ Alta volatilidade',
  },

  // ─── Onboarding ───────────────────────────────────────────────────────────
  onboarding: {
    welcome: 'Bem-vindo ao Youli',
    subtitle: 'Seu agente pessoal de vida',
    step1: { title: 'Acompanhamento 360°', body: 'Monitore hábitos, metas, finanças, fitness e muito mais em um só lugar.' },
    step2: { title: 'IA Personalizada', body: '10 agentes históricos trabalham para você — cada área com um especialista dedicado.' },
    step3: { title: 'Evolução Contínua', body: 'O sistema aprende seus padrões e sugere melhorias personalizadas para sua vida.' },
    start: 'Começar',
    skip: 'Pular',
  },

  // ─── Simulate ─────────────────────────────────────────────────────────────
  simulate: {
    title: 'Simular',
    subtitle: 'Visualize seu futuro, decida hoje',
    tabProjection: '📈 Projeção 90d',
    tabSimulator: '🎮 Simulador',
  },

  // ─── Errors ───────────────────────────────────────────────────────────────
  errors: {
    generic: 'Algo deu errado. Tente novamente.',
    noInternet: 'Sem conexão com a internet',
    notConnected: '{{app}} não está conectado',
    loadFailed: 'Falha ao carregar dados',
    saveFailed: 'Falha ao salvar',
  },
} as const;

export type TranslationKeys = typeof import('./pt-BR').default;
