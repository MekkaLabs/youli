'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

const nav = [
  { label: 'Visão Geral', href: '/system/overview' },
  { label: 'Tarefas', href: '/system/tarefas' },
  { label: 'Metas', href: '/system/metas' },
  { label: 'Hábitos', href: '/system/habitos' },
  { label: 'Calendário', href: '/system/calendario' },
  { label: 'Insights', href: '/system/insights' },
  { label: 'Fitness', href: '/system/fitness' },
  { label: 'Financeiro', href: '/system/financeiro' },
  { label: 'Perfil', href: '/system/perfil' },
  { label: 'Memória', href: '/system/memoria' },
  { label: 'Orquestração', href: '/system/orquestracao' }
];

function money(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export default function HomePage() {
  const [dashboard, setDashboard] = useState<any>(null);
  const [finance, setFinance] = useState<any>(null);

  useEffect(() => {
    fetch('/api/dashboard').then((r) => r.json()).then(setDashboard).catch(() => setDashboard(null));
    fetch('/api/open-finance/summary').then((r) => r.json()).then((x) => setFinance(x.summary || null)).catch(() => setFinance(null));
  }, []);

  const topCards = useMemo(() => [
    { label: 'Saldo total', value: money(finance?.totalBalance || 0), cls: 'metric-green' },
    { label: 'Receita mensal', value: money(finance?.monthlyIncome || 0), cls: 'metric-blue' },
    { label: 'Despesa mensal', value: money(finance?.monthlyExpenses || 0), cls: 'metric-rose' },
    { label: 'Crédito usado', value: money(finance?.creditUsed || 0), cls: 'metric' }
  ], [finance]);

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-4 md:grid-cols-[260px_1fr]">
        <aside className="glass rounded-3xl p-4 md:p-5">
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">YOULI OS</p>
            <h1 className="mt-2 text-2xl font-black text-slate-900">Sistema Pessoal</h1>
          </div>

          <nav className="space-y-2">
            <Link href={'/system' as any} className="block rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white">Dashboard principal</Link>
            {nav.map((item) => (
              <Link key={item.href} href={item.href as any} className="block w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900">{item.label}</Link>
            ))}
          </nav>
        </aside>

        <section className="space-y-4">
          <header className="glass rounded-3xl p-6 md:p-8">
            <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-800">Open Finance + AIOX Core</span>
            <h2 className="mt-4 text-3xl font-black leading-tight md:text-5xl">Seus dados. Seu controle.</h2>
            <p className="mt-3 max-w-2xl text-sm text-slate-600 md:text-base">Camada visual elegante no front, com orquestração invisível no AIOX Core e squads por trás.</p>
            <div className="mt-5 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-slate-900 px-3 py-1 font-semibold text-white">Foco: {dashboard?.dashboard?.dayFocus || 'N/D'}</span>
              <span className="rounded-full bg-emerald-600 px-3 py-1 font-semibold text-white">Energia: {dashboard?.dashboard?.energy || 'medium'}</span>
              <span className="rounded-full bg-white px-3 py-1 font-semibold text-slate-700 ring-1 ring-slate-200">Progresso: {dashboard?.dashboard?.progress || 0}%</span>
            </div>
          </header>

          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {topCards.map((card) => (
              <article key={card.label} className={card.cls}>
                <p className="text-sm/5 text-white/75">{card.label}</p>
                <p className="mt-1 text-2xl font-black">{card.value}</p>
              </article>
            ))}
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <article className="glass rounded-3xl p-5">
              <h3 className="text-lg font-bold">Prioridades do dia</h3>
              <div className="mt-3 space-y-2">
                {(dashboard?.dashboard?.topTasks || []).map((task: any) => (
                  <div key={task.id} className="flex items-center justify-between rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200">
                    <p className="text-sm font-medium text-slate-800">{task.title}</p>
                    <span className="rounded-lg bg-slate-900 px-2 py-1 text-xs font-semibold text-white">P{task.priority}</span>
                  </div>
                ))}
              </div>
            </article>

            <article className="glass rounded-3xl p-5">
              <h3 className="text-lg font-bold">Insights ativos</h3>
              <div className="mt-3 space-y-2">
                {(dashboard?.dashboard?.insights || []).map((insight: any) => (
                  <div key={insight.id} className="rounded-xl bg-emerald-50 px-3 py-3 ring-1 ring-emerald-100">
                    <p className="text-sm font-medium text-emerald-900">{insight.summary}</p>
                  </div>
                ))}
              </div>
            </article>
          </section>
        </section>
      </div>
    </main>
  );
}
