// A tiny DOM helper. No framework: the whole game is plain TypeScript + DOM.

export type Child = Node | string | number | false | null | undefined | Child[];

export interface Props {
  class?: string;
  id?: string;
  text?: string;
  html?: string;
  style?: string | Partial<CSSStyleDeclaration>;
  dataset?: Record<string, string | number | undefined>;
  attrs?: Record<string, string | number | boolean | undefined>;
  on?: Record<string, EventListener>;
  title?: string;
  type?: string;
  disabled?: boolean;
  value?: string;
  placeholder?: string;
  href?: string;
  src?: string;
  alt?: string;
  role?: string;
  tabindex?: number;
  hidden?: boolean;
  checked?: boolean;
  min?: number;
  max?: number;
  step?: number;
  maxLength?: number;
  for?: string;
  name?: string;
  ariaLabel?: string;
  onclick?: (ev: MouseEvent) => void;
}

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, props?: Props | null, ...children: Child[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (props) {
    for (const [k, v] of Object.entries(props)) {
      if (v === undefined || v === null || v === false) continue;
      switch (k) {
        case 'class':
          el.className = v as string;
          break;
        case 'text':
          el.textContent = v as string;
          break;
        case 'html':
          el.innerHTML = v as string;
          break;
        case 'style':
          if (typeof v === 'string') el.setAttribute('style', v);
          else Object.assign(el.style, v);
          break;
        case 'dataset':
          for (const [dk, dv] of Object.entries(v as Record<string, unknown>)) if (dv !== undefined) el.dataset[dk] = String(dv);
          break;
        case 'attrs':
          for (const [ak, av] of Object.entries(v as Record<string, unknown>)) {
            if (av === undefined || av === false) continue;
            el.setAttribute(ak, av === true ? '' : String(av));
          }
          break;
        case 'on':
          for (const [ev, fn] of Object.entries(v as Record<string, EventListener>)) el.addEventListener(ev, fn);
          break;
        case 'onclick':
          el.addEventListener('click', v as EventListener);
          break;
        case 'ariaLabel':
          el.setAttribute('aria-label', v as string);
          break;
        case 'for':
          el.setAttribute('for', v as string);
          break;
        case 'maxLength':
          el.setAttribute('maxlength', String(v));
          break;
        case 'tabindex':
          el.tabIndex = v as number;
          break;
        default:
          (el as unknown as Record<string, unknown>)[k] = v;
      }
    }
  }
  append(el, children);
  return el;
}

export function append(el: Node, children: Child[]): void {
  for (const c of children) {
    if (c === false || c === null || c === undefined) continue;
    if (Array.isArray(c)) append(el, c);
    else if (c instanceof Node) el.appendChild(c);
    else el.appendChild(document.createTextNode(String(c)));
  }
}

export function clear(el: Element): void {
  while (el.firstChild) el.removeChild(el.firstChild);
}

export function replaceChildren(el: Element, ...children: Child[]): void {
  clear(el);
  append(el, children);
}

export function btn(label: Child, onclick: (ev: MouseEvent) => void, cls = '', extra: Props = {}): HTMLButtonElement {
  return h('button', { type: 'button', class: `btn ${cls}`.trim(), onclick, ...extra }, label);
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function focusables(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((e) => !e.hidden && e.offsetParent !== null);
}

/** keep Tab inside `root`. Returns a function that removes the trap. */
export function trapFocus(root: HTMLElement): () => void {
  const onKey = (ev: KeyboardEvent) => {
    if (ev.key !== 'Tab') return;
    const f = focusables(root);
    if (!f.length) {
      ev.preventDefault();
      return;
    }
    const first = f[0];
    const last = f[f.length - 1];
    const active = document.activeElement as HTMLElement | null;
    if (ev.shiftKey && (active === first || !root.contains(active))) {
      ev.preventDefault();
      last.focus();
    } else if (!ev.shiftKey && (active === last || !root.contains(active))) {
      ev.preventDefault();
      first.focus();
    }
  };
  root.addEventListener('keydown', onKey);
  return () => root.removeEventListener('keydown', onKey);
}

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function announce(text: string): void {
  const el = document.getElementById('sr-live');
  if (!el) return;
  el.textContent = '';
  setTimeout(() => (el.textContent = text), 30);
}

export function reducedMotion(): boolean {
  return document.documentElement.classList.contains('reduce-motion');
}

export function clamp(n: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, n));
}
