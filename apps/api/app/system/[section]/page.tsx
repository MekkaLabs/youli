'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';

type SectionKey =
  | 'overview'
  | 'tarefas'
  | 'metas'
  | 'habitos'
  | 'calendario'
  | 'insights'
  | 'fitness'
  | 'financeiro'
  | 'perfil'
  | 'memoria'
  | 'orquestracao';

const endpointMap: Record<SectionKey, string> = {
  overview: '/api/me/summary',
  tarefas: '/api/tasks/route',
  metas: '/api/goals/route',
  habitos: '/api/habits',
  calendario: '/api/calendar',
  insights: '/api/insights/route',
  fitness: '/api/fitness/route',
  financeiro: '/api/open-finance/summary',
  perfil: '/api/profile/route',
  memoria: '/api/memory',
  orquestracao: '/api/orchestrator/route'
};

const titleMap: Record<SectionKey, string> = {
  overview: 'Visão Geral • Perfil Operacional',
  tarefas: 'Missões de Execução',
  metas: 'Metas & Resultado',
  habitos: 'Ritual de Hábitos',
  calendario: 'Linha do Tempo',
  insights: 'Inteligência Comportamental',
  fitness: 'Energia & Treino',
  financeiro: 'Radar Financeiro',
  perfil: 'Identidade do Sistema',
  memoria: 'Memória Contínua',
  orquestracao: 'AIOX Core & Squads'
};

const toneMap: Record<SectionKey, string> = {
  overview: 'from-violet-700 to-fuchsia-600',
  tarefas: 'from-slate-900 to-slate-700',
  metas: 'from-cyan-700 to-blue-600',
  habitos: 'from-emerald-800 to-green-600',
  calendario: 'from-amber-700 to-orange-600',
  insights: 'from-indigo-700 to-violet-600',
  fitness: 'from-rose-700 to-pink-600',
  financeiro: 'from-teal-800 to-emerald-600',
  perfil: 'from-zinc-800 to-zinc-600',
  memoria: 'from-purple-800 to-indigo-600',
  orquestracao: 'from-sky-800 to-cyan-600'
};

function money(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
}

function percent(done: number, total: number) {
  if (!total) return 0;
  return Math.round((done / total) * 100);
}

function Ring({ value, label, colorClass }: { value: number; label: string; colorClass: string }) {
  const deg = Math.min(100, Math.max(0, value)) * 3.6;
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl bg-white p-4 ring-1 ring-slate-200">
      <div
        className="relative h-20 w-20 rounded-full"
        style={{ background: `conic-gradient(var(--ring-color) ${deg}deg, #e2e8f0 ${deg}deg)` } as React.CSSProperties}
      >
        <div className="absolute inset-2 grid place-items-center rounded-full bg-white text-sm font-black text-slate-800" style={{ ['--ring-color' as any]: '' }}>
          {value}%
        </div>
      </div>
      <p className={`text-xs font-semibold ${colorClass}`}>{label}</p>
    </div>
  );
}

export default function SectionPage() {
  const params = useParams<{ section: string }>();
  const section = (params?.section || 'overview') as SectionKey;
  const [data, setData] = useState<any>(null);
  const [assistantInput, setAssistantInput] = useState('');
  const [status, setStatus] = useState('');

  const endpoint = endpointMap[section] || endpointMap.overview;

  async function load() {
    const r = await fetch(`${endpoint}?t=${Date.now()}`, { cache: 'no-store' });
    const j = await r.json();
    setData(j);
  }

  useEffect(() => {
    load().catch(() => setData(null));
  }, [section]);

  useEffect(() => {
    const timer = setInterval(() => {
      load().catch(() => null);
    }, 8000);
    return () => clearInterval(timer);
  }, [section]);

  async function runAssistant() {
    if (!assistantInput.trim()) return;
    setStatus('Aplicando comando com squads invisíveis...');
    const res = await fetch('/api/system/interpret', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ section, message: assistantInput })
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus('Não consegui aplicar o comando.');
      return;
    }
    setAssistantInput('');
    await load();
    setStatus(`Aplicado: ${json?.interpreted?.title || 'ok'}`);
  }

  const headerGradient = toneMap[section] || toneMap.overview;

  const renderOverview = () => {
    const profile = data?.profile || {};
    const tasks = data?.tasks || [];
    const habits = data?.habits || [];
    const goals = data?.goals || [];
    const calendar = data?.calendar || [];

    const doneTasks = tasks.filter((t: any) => t.status === 'done').length;
    const highPriority = tasks.filter((t: any) => t.priority >= 4).length;
    const habitsStrong = habits.filter((h: any) => h.streak >= 3).length;

    return (
      <div className="space-y-4">
        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_1fr]">
          <article className="rounded-3xl bg-white p-5 ring-1 ring-slate-200">
            <div className="flex items-start gap-4">
              <img src={profile.avatarUrl || '/profile/gustavo-vicente.jpg'} alt="Avatar" className="h-24 w-24 rounded-2xl object-cover ring-2 ring-emerald-300" />
              <div className="flex-1">
                <h2 className="text-2xl font-black text-slate-900">{profile.name || 'Usuário'}</h2>
                <p className="text-sm text-slate-500">{profile.email || 'email@exemplo.com'} • {profile.role || 'Member'} • {profile.age || '-'} anos</p>
                <p className="mt-2 text-sm text-slate-700">{(profile.objectives || []).join(' · ')}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(profile.lifeAreas || []).map((a: string) => <span key={a} className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{a}</span>)}
                </div>
              </div>
            </div>
          </article>

          <article className="rounded-3xl bg-white p-5 ring-1 ring-slate-200">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Placar do Dia</h3>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Ring value={percent(doneTasks, tasks.length)} label="Tarefas Concluídas" colorClass="text-slate-700" />
              <Ring value={percent(habitsStrong, habits.length)} label="Hábitos Fortes" colorClass="text-emerald-700" />
            </div>
            <div className="mt-3 rounded-xl bg-slate-900 p-3 text-xs text-white">
              Prioridades altas abertas: <strong>{highPriority}</strong>
            </div>
          </article>
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <article className="rounded-3xl bg-white p-5 ring-1 ring-slate-200 xl:col-span-2">
            <h3 className="text-lg font-black">Roadmap pessoal (currículo vivo)</h3>
            <div className="mt-3 space-y-2">
              {goals.map((g: any) => (
                <div key={g.id} className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-800">{g.title}</p>
                    <span className="text-xs font-bold text-cyan-700">{g.progress}%</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-slate-200">
                    <div className="h-2 rounded-full bg-gradient-to-r from-cyan-600 to-blue-600" style={{ width: `${g.progress}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-3xl bg-white p-5 ring-1 ring-slate-200">
            <h3 className="text-lg font-black">Agenda imediata</h3>
            <div className="mt-3 space-y-2">
              {calendar.slice(0, 4).map((ev: any) => (
                <div key={ev.id} className="rounded-xl bg-amber-50 p-2 ring-1 ring-amber-100">
                  <p className="text-sm font-semibold text-amber-900">{ev.title}</p>
                  <p className="text-xs text-amber-700">{new Date(ev.startsAt).toLocaleString('pt-BR')}</p>
                </div>
              ))}
            </div>
          </article>
        </section>
      </div>
    );
  };

  const renderListCard = (items: any[], title: string, subtitleField?: string) => (
    <section className="rounded-3xl bg-white p-5 ring-1 ring-slate-200">
      <h3 className="text-lg font-black">{title}</h3>
      <div className="mt-3 space-y-2">
        {items.map((item: any) => (
          <div key={item.id || JSON.stringify(item)} className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
            <p className="text-sm font-semibold text-slate-800">{item.title || item.description || item.type || item.name || item.id}</p>
            {subtitleField ? <p className="text-xs text-slate-500">{item[subtitleField]}</p> : null}
          </div>
        ))}
      </div>
    </section>
  );

  const renderTaskPipeline = (tasks: any[]) => {
    const todo = tasks.filter((t) => t.status === 'todo');
    const doing = tasks.filter((t) => t.status === 'doing');
    const done = tasks.filter((t) => t.status === 'done');
    const cols = [
      { key: 'todo', label: 'Planejado', items: todo, tone: 'bg-slate-100' },
      { key: 'doing', label: 'Em execução', items: doing, tone: 'bg-amber-50' },
      { key: 'done', label: 'Concluído', items: done, tone: 'bg-emerald-50' }
    ];

    return (
      <section className="rounded-3xl bg-white p-5 ring-1 ring-slate-200">
        <h3 className="text-lg font-black">Pipeline de execução</h3>
        <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-3">
          {cols.map((col) => (
            <div key={col.key} className={`rounded-2xl p-3 ${col.tone}`}>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-600">{col.label} ({col.items.length})</p>
              <div className="mt-2 space-y-2">
                {col.items.map((t: any) => (
                  <div key={t.id} className="rounded-xl bg-white p-2 ring-1 ring-slate-200">
                    <p className="text-sm font-semibold">{t.title}</p>
                    <p className="text-xs text-slate-500">Prioridade {t.priority}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  };

  const renderGoalsBoard = (goals: any[]) => (
    <section className="rounded-3xl bg-white p-5 ring-1 ring-slate-200">
      <h3 className="text-lg font-black">Board de metas</h3>
      <div className="mt-3 space-y-3">
        {goals.map((g) => (
          <div key={g.id} className="rounded-2xl bg-cyan-50 p-3 ring-1 ring-cyan-100">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-cyan-950">{g.title}</p>
              <span className="text-xs font-black text-cyan-700">{g.progress}%</span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-cyan-100">
              <div className="h-2 rounded-full bg-gradient-to-r from-cyan-600 to-blue-600" style={{ width: `${g.progress}%` }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );

  const renderHabitsDeck = (habits: any[]) => (
    <section className="rounded-3xl bg-white p-5 ring-1 ring-slate-200">
      <h3 className="text-lg font-black">Deck de consistência</h3>
      <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
        {habits.map((h) => (
          <div key={h.id} className="rounded-2xl bg-emerald-50 p-3 ring-1 ring-emerald-100">
            <p className="text-sm font-semibold text-emerald-900">{h.title}</p>
            <p className="text-xs text-emerald-700">{h.frequency === 'daily' ? 'Diário' : 'Semanal'}</p>
            <p className="mt-1 text-xs font-bold text-emerald-800">Streak: {h.streak} dias</p>
          </div>
        ))}
      </div>
    </section>
  );

  const renderCalendarTimeline = (events: any[]) => (
    <section className="rounded-3xl bg-white p-5 ring-1 ring-slate-200">
      <h3 className="text-lg font-black">Timeline do dia</h3>
      <div className="mt-3 space-y-3">
        {events.map((ev) => (
          <div key={ev.id} className="flex gap-3">
            <div className="mt-1 h-3 w-3 rounded-full bg-amber-500" />
            <div className="rounded-xl bg-amber-50 p-3 ring-1 ring-amber-100 w-full">
              <p className="text-sm font-semibold text-amber-950">{ev.title}</p>
              <p className="text-xs text-amber-800">{new Date(ev.startsAt).toLocaleString('pt-BR')}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );

  const renderBySection = () => {
    if (section === 'overview') return renderOverview();
    if (section === 'tarefas') return renderTaskPipeline(data || []);
    if (section === 'metas') return renderGoalsBoard(data || []);
    if (section === 'habitos') return renderHabitsDeck(data || []);
    if (section === 'calendario') return renderCalendarTimeline(data || []);
    if (section === 'insights') return renderListCard(data || [], 'Insights Gerados', 'energy');
    if (section === 'fitness') return renderListCard(data || [], 'Atividades Fitness', 'intensity');
    if (section === 'financeiro') {
      const summary = data?.summary || {};
      const cards = [
        ['Saldo total', money(summary.totalBalance || 0)],
        ['Receita mensal', money(summary.monthlyIncome || 0)],
        ['Despesa mensal', money(summary.monthlyExpenses || 0)],
        ['Crédito usado', money(summary.creditUsed || 0)]
      ];
      return (
        <div className="space-y-4">
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map(([label, value]) => (
              <article key={label} className="rounded-2xl bg-gradient-to-br from-teal-900 to-emerald-700 p-4 text-white">
                <p className="text-xs uppercase tracking-wide text-white/80">{label}</p>
                <p className="mt-1 text-xl font-black">{value}</p>
              </article>
            ))}
          </section>
          {renderListCard(summary.accounts || [], 'Contas Conectadas', 'type')}
        </div>
      );
    }
    if (section === 'perfil') return renderOverview();
    if (section === 'memoria') return renderListCard(data || [], 'Memória Contextual', 'type');
    if (section === 'orquestracao') {
      return (
        <section className="rounded-3xl bg-white p-5 ring-1 ring-slate-200">
          <h3 className="text-lg font-black">Squads Disponíveis</h3>
          <div className="mt-3 space-y-2">
            {(data?.squads || []).map((s: any) => (
              <div key={s.name} className="rounded-xl bg-sky-50 p-3 ring-1 ring-sky-100">
                <p className="text-sm font-semibold text-sky-900">{s.displayName || s.name}</p>
                <p className="text-xs text-sky-700">Workflows: {s.workflows?.length || 0} • Config: {s.hasConfig ? 'sim' : 'não'}</p>
              </div>
            ))}
          </div>
        </section>
      );
    }
    return (
      <section className="rounded-3xl bg-white p-5 ring-1 ring-slate-200">
        <pre className="overflow-x-auto rounded-2xl bg-slate-950 p-4 text-xs text-emerald-100">{JSON.stringify(data, null, 2)}</pre>
      </section>
    );
  };

  return (
    <div className="space-y-4">
      <header className={`rounded-3xl bg-gradient-to-r ${headerGradient} p-6 text-white shadow-lg`}>
        <h1 className="text-3xl font-black md:text-4xl">{titleMap[section] || 'Área do Sistema'}</h1>
        <p className="mt-2 text-sm text-white/85">Módulo dedicado, com visual e lógica específicos para este contexto.</p>
      </header>

      <section className="rounded-3xl bg-white p-5 ring-1 ring-slate-200">
        <h3 className="text-lg font-black">Copiloto da área</h3>
        <p className="mt-1 text-xs text-slate-500">Fale em linguagem natural e o sistema formata/aplica automaticamente.</p>
        <div className="mt-3 flex gap-2">
          <input
            value={assistantInput}
            onChange={(e) => setAssistantInput(e.target.value)}
            placeholder={`Comando para ${section}`}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
          />
          <button onClick={runAssistant} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Aplicar</button>
        </div>
        {status && <p className="mt-2 text-xs font-medium text-slate-600">{status}</p>}
      </section>

      {renderBySection()}
    </div>
  );
}
