'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

const allSections = [
  { key: 'overview', label: 'Visão Geral' },
  { key: 'tarefas', label: 'Tarefas' },
  { key: 'metas', label: 'Metas' },
  { key: 'habitos', label: 'Hábitos' },
  { key: 'calendario', label: 'Calendário' },
  { key: 'insights', label: 'Insights' },
  { key: 'fitness', label: 'Fitness' },
  { key: 'financeiro', label: 'Financeiro' },
  { key: 'perfil', label: 'Perfil' },
  { key: 'memoria', label: 'Memória' },
  { key: 'orquestracao', label: 'Orquestração' }
];

export default function SystemLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [activeModules, setActiveModules] = useState<string[]>([]);
  const [command, setCommand] = useState('');
  const [status, setStatus] = useState('');
  const [copilotTips, setCopilotTips] = useState<string[]>([]);

  const currentSection = useMemo(() => {
    const seg = pathname?.split('/')[2];
    return seg || 'overview';
  }, [pathname]);

  async function loadModules() {
    const r = await fetch('/api/system/modules?t=' + Date.now(), { cache: 'no-store' });
    const j = await r.json();
    setActiveModules(j.activeModules || []);
  }

  useEffect(() => {
    loadModules().catch(() => setActiveModules(allSections.map((s) => s.key)));
  }, []);

  const sections = allSections.filter((s) => (activeModules.length ? activeModules.includes(s.key) : true));

  async function runGlobalCommand() {
    if (!command.trim()) return;
    setStatus('Processando comando...');
    const res = await fetch('/api/copilot/orchestrate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ section: currentSection, message: command })
    });
    const json = await res.json().catch(() => ({}));
    setCommand('');
    if (!res.ok) {
      setStatus('Falha ao aplicar comando.');
      return;
    }

    const tips = (json?.recommendations || []).flatMap((r: any) => {
      const a = (r.actions || []).slice(0, 2).map((x: string) => `${r.squad?.agent}: ${x}`);
      return a;
    }).slice(0, 4);

    setCopilotTips(tips);
    setStatus('Copiloto orquestrou recomendações por squads especializados.');
    router.refresh();
  }

  async function runScenario() {
    setStatus('Executando cenário de teste...');
    await fetch('/api/system/scenario', { method: 'POST' });
    setStatus('Cenário aplicado.');
    router.refresh();
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-4 md:grid-cols-[280px_1fr]">
        <aside className="glass rounded-3xl p-4 md:p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">YOULI SYSTEM</p>
          <h2 className="mt-2 text-2xl font-black text-slate-900">Navegação</h2>
          <nav className="mt-5 space-y-2">
            {sections.map((s) => {
              const active = pathname?.includes(`/system/${s.key}`);
              return (
                <Link key={s.key} href={(`/system/${s.key}`) as any} className={`block rounded-xl px-3 py-2 text-sm font-medium transition ${active ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'}`}>
                  {s.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-3">
            <p className="text-xs font-semibold text-slate-600">Comando rápido (global)</p>
            <input
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="Ex.: criar tarefa revisar orçamento"
              className="mt-2 w-full rounded-lg border border-slate-200 px-2 py-1 text-xs"
            />
            <button onClick={runGlobalCommand} className="mt-2 w-full rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white">Aplicar IA</button>
            <button onClick={runScenario} className="mt-2 w-full rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white">Cenário de teste</button>
            {status && <p className="mt-2 text-[11px] text-slate-500">{status}</p>}
            {copilotTips.length > 0 && (
              <div className="mt-2 rounded-lg bg-slate-50 p-2 ring-1 ring-slate-200">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Dicas do Copiloto</p>
                <ul className="mt-1 space-y-1">
                  {copilotTips.map((tip, i) => (
                    <li key={`${tip}-${i}`} className="text-[11px] text-slate-700">• {tip}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <button onClick={logout} className="mt-4 block w-full rounded-xl bg-slate-900 px-3 py-2 text-center text-sm font-semibold text-white">Sair</button>
          <Link href={'/' as any} className="mt-2 block rounded-xl border border-slate-300 px-3 py-2 text-center text-sm font-semibold text-slate-700">Cockpit</Link>
        </aside>
        <section>{children}</section>
      </div>
    </main>
  );
}
