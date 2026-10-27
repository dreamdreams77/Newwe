import type { ToastKind } from './types';

export interface BusEvents {
  change: void;
  world: void; // something the current zone should re-render for
  toast: { text: string; kind: ToastKind };
  sfx: { name: string };
  stage: { from: number; to: number };
  eleven: { why: string };
  elevenTime: { key: string };
  threshold: { at: number };
  zone: { zone: string };
  log: { text: string };
}

type Handler<T> = (payload: T) => void;

export class EventBus {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- handlers of different event types share one map
  private handlers = new Map<string, Set<Handler<any>>>();
  on<K extends keyof BusEvents>(name: K, fn: Handler<BusEvents[K]>): () => void {
    let set = this.handlers.get(name as string);
    if (!set) this.handlers.set(name as string, (set = new Set()));
    set.add(fn);
    return () => set!.delete(fn);
  }
  emit<K extends keyof BusEvents>(name: K, payload?: BusEvents[K]): void {
    const set = this.handlers.get(name as string);
    if (!set) return;
    for (const fn of [...set]) fn(payload as BusEvents[K]);
  }
}
