'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('gustav0.v1c3nt3@gmail.com');
  const [password, setPassword] = useState('teste123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    setLoading(false);
    if (!res.ok) {
      setError('Credenciais inválidas.');
      return;
    }

    router.push('/system/overview');
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-slate-950 p-4">
      <div className="mx-auto mt-16 w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">YOULI ACCESS</p>
        <h1 className="mt-2 text-3xl font-black text-slate-900">Entrar no Sistema</h1>
        <p className="mt-1 text-sm text-slate-500">Acesso local para testes do MVP.</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-600">Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Senha</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          </div>
          {error && <p className="text-xs font-semibold text-rose-600">{error}</p>}
          <button disabled={loading} className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </main>
  );
}
