/**
 * logger — logging leve para o mobile.
 *
 * Em vez de `catch {}` silencioso (que esconde bugs), use `logWarn`/`logError`.
 * Em produção (`__DEV__ === false`) os warnings são suprimidos para não poluir,
 * mas erros sempre aparecem. Centraliza o formato `[scope] mensagem`.
 */

function format(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

export function logWarn(scope: string, err?: unknown): void {
  if (typeof __DEV__ !== 'undefined' && !__DEV__) return;
   
  console.warn(`[${scope}]`, err === undefined ? '' : format(err));
}

export function logError(scope: string, err?: unknown): void {
   
  console.error(`[${scope}]`, err === undefined ? '' : format(err));
}
