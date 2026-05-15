/**
 * Next.js instrumentation — roda antes de qualquer route handler
 * Fix: Node 22 expõe localStorage nativo mas quando --localstorage-file
 * não tem path válido o objeto fica quebrado. Polyfill server-safe aqui.
 */
export async function register() {
  if (
    typeof globalThis.localStorage === 'undefined' ||
    typeof globalThis.localStorage?.getItem !== 'function'
  ) {
    const store = new Map<string, string>();
    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => { store.set(key, value); },
        removeItem: (key: string) => { store.delete(key); },
        clear: () => { store.clear(); },
        get length() { return store.size; },
        key: (index: number) => [...store.keys()][index] ?? null,
      },
      writable: true,
      configurable: true,
    });
  }
}
