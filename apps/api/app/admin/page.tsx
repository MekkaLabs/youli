'use client';

/**
 * Painel Admin (web) — gestão de usuários do sistema.
 * Admin-only: a API (/api/admin/*) exige role admin; aqui apenas refletimos
 * o estado e bloqueamos a UI para não-admins.
 */
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  avatar?: string | null;
  createdAt: string;
}

const EMPTY_FORM = { name: '', email: '', password: '', role: 'user' as 'admin' | 'user' };

export default function AdminPage() {
  const router = useRouter();
  const [me, setMe] = useState<AdminUser | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [creating, setCreating] = useState(false);

  const loadUsers = useCallback(async () => {
    const res = await fetch('/api/admin/users', { cache: 'no-store' });
    if (res.status === 401) {
      router.push('/login');
      return;
    }
    if (res.status === 403) {
      setForbidden(true);
      setLoading(false);
      return;
    }
    const json = await res.json().catch(() => ({ users: [] }));
    setUsers(json.users || []);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    (async () => {
      const meRes = await fetch('/api/auth/me', { cache: 'no-store' });
      if (meRes.ok) {
        const j = await meRes.json().catch(() => null);
        setMe(j?.user ?? j ?? null);
      }
      await loadUsers();
    })();
  }, [loadUsers]);

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError('');
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(form),
    });
    setCreating(false);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json?.error || 'Falha ao criar usuário.');
      return;
    }
    setForm(EMPTY_FORM);
    await loadUsers();
  }

  async function removeUser(id: string) {
    if (!confirm('Remover este usuário? Os dados dele não serão apagados automaticamente.')) return;
    setError('');
    const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json?.error || 'Falha ao remover usuário.');
      return;
    }
    await loadUsers();
  }

  async function toggleRole(u: AdminUser) {
    setError('');
    const nextRole = u.role === 'admin' ? 'user' : 'admin';
    const res = await fetch(`/api/admin/users/${u.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ role: nextRole }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json?.error || 'Falha ao alterar papel.');
      return;
    }
    await loadUsers();
  }

  if (forbidden) {
    return (
      <main className="min-h-screen bg-slate-950 p-4">
        <div className="mx-auto mt-24 w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-2xl">
          <p className="text-5xl">🔒</p>
          <h1 className="mt-3 text-2xl font-black text-slate-900">Acesso restrito</h1>
          <p className="mt-2 text-sm text-slate-500">Esta área é exclusiva para administradores.</p>
          <Link href={'/system/overview' as any} className="mt-5 inline-block rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
            Voltar ao sistema
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="mx-auto w-full max-w-5xl space-y-4">
        {/* Header */}
        <header className="glass rounded-3xl p-6 md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="inline-flex rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-rose-800">
                Painel Admin
              </span>
              <h1 className="mt-3 text-3xl font-black text-slate-900 md:text-4xl">Gestão de Usuários</h1>
              <p className="mt-1 text-sm text-slate-500">
                {me ? `Logado como ${me.name} (${me.role})` : 'Carregando…'} · {users.length} usuário(s)
              </p>
            </div>
            <div className="flex gap-2">
              <Link href={'/system/overview' as any} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">
                Cockpit
              </Link>
            </div>
          </div>
        </header>

        {error && (
          <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">
            {error}
          </div>
        )}

        {/* Criar usuário */}
        <section className="glass rounded-3xl p-5 md:p-6">
          <h2 className="text-lg font-bold text-slate-900">Novo usuário</h2>
          <form onSubmit={createUser} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <input
              required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Nome" className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
            <input
              required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="email@exemplo.com" className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
            <input
              required type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Senha (mín. 6)" className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
            <div className="flex gap-2">
              <select
                value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as 'admin' | 'user' })}
                className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="user">Usuário</option>
                <option value="admin">Admin</option>
              </select>
              <button disabled={creating} className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                {creating ? '...' : 'Criar'}
              </button>
            </div>
          </form>
        </section>

        {/* Lista */}
        <section className="glass rounded-3xl p-5 md:p-6">
          <h2 className="text-lg font-bold text-slate-900">Usuários</h2>
          {loading ? (
            <p className="mt-4 text-sm text-slate-500">Carregando…</p>
          ) : (
            <div className="mt-4 space-y-2">
              {users.map((u) => (
                <div key={u.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{u.name}</p>
                    <p className="truncate text-xs text-slate-500">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-lg px-2 py-1 text-xs font-bold ${u.role === 'admin' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'}`}>
                      {u.role}
                    </span>
                    <button
                      onClick={() => toggleRole(u)}
                      disabled={u.id === me?.id}
                      title={u.id === me?.id ? 'Você não pode alterar seu próprio papel' : 'Alternar admin/usuário'}
                      className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 disabled:opacity-40"
                    >
                      {u.role === 'admin' ? '→ usuário' : '→ admin'}
                    </button>
                    <button
                      onClick={() => removeUser(u.id)}
                      disabled={u.id === me?.id}
                      title={u.id === me?.id ? 'Você não pode remover a si mesmo' : 'Remover'}
                      className="rounded-lg bg-rose-600 px-2 py-1 text-xs font-semibold text-white disabled:opacity-40"
                    >
                      Remover
                    </button>
                  </div>
                </div>
              ))}
              {users.length === 0 && <p className="text-sm text-slate-500">Nenhum usuário.</p>}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
