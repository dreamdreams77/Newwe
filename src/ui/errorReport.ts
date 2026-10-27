import { toast } from './notifications';

/**
 * Anything uncaught used to vanish into the console, so "it errored" had no details. Now the player sees a short, calm toast
 * with the real message and where it came from (so it can be reported), and their game is not touched: it autosaves anyway.
 */
export function installErrorReporter(): void {
  const seen = new Map<string, number>();
  const report = (message: string, where: string) => {
    if (!message || /ResizeObserver loop/i.test(message)) return;
    const now = Date.now();
    if (now - (seen.get(message) ?? 0) < 15000) return; // the same error is not shown twice in a row
    seen.set(message, now);
    toast(`Something glitched: ${message}${where ? ` (${where})` : ''}. Your game saves itself; reload if anything looks wrong.`, 'bad');
  };
  window.addEventListener('error', (e) => {
    if (e.target && e.target !== window) return; // a failed image or script: index.html deals with those
    const where = e.filename ? `${e.filename.split('/').pop()}:${e.lineno}` : '';
    report(e.message, where);
  });
  window.addEventListener('unhandledrejection', (e) => {
    const r = e.reason as { message?: string } | string | undefined;
    report(typeof r === 'string' ? r : (r?.message ?? 'a promise was rejected'), '');
  });
}
