import { createContext } from 'preact';
import { useContext, useState } from 'preact/hooks';
import type { JSX } from 'preact';

const P: Record<string, string> = {
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm9 16-4.35-4.35',
  x: 'M6 6l12 12M18 6 6 18',
  copy: 'M9 9h10v10H9zM5 15V5h10',
  check: 'M5 12l5 5 9-10',
  download: 'M12 4v11m0 0-4-4m4 4 4-4M5 19h14',
  upload: 'M12 19V8m0 0-4 4m4-4 4 4M5 5h14',
  sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0-5v2m0 14v2M3 12h2m14 0h2M5.6 5.6 7 7m10 10 1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4',
  moon: 'M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z',
  monitor: 'M4 5h16v11H4zM9 20h6M12 16v4',
  chevron: 'M7 10l5 5 5-5',
  arrowUp: 'M12 19V5m0 0-5 5m5-5 5 5',
  arrowDown: 'M12 5v14m0 0-5-5m5 5 5-5',
  arrowRight: 'M5 12h14m0 0-5-5m5 5-5 5',
  shield: 'M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z',
  key: 'M14 10a4 4 0 1 0-3.5 4L8 16.5V19h2.5v-2H12l1.6-1.6A4 4 0 0 0 14 10Zm1.5-1.5h.01',
  power: 'M12 3v8M6.3 7.3a8 8 0 1 0 11.4 0',
  flask: 'M9 3h6M10 3v6L5 19a1.5 1.5 0 0 0 1.3 2h11.4a1.5 1.5 0 0 0 1.3-2L14 9V3',
  route: 'M6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm12-10a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM6 15V9a4 4 0 0 1 4-4h6M18 9v6a4 4 0 0 1-4 4H8',
  server: 'M4 5h16v6H4zM4 13h16v6H4zM8 8h.01M8 16h.01',
  alert: 'M12 9v4m0 4h.01M10.3 4.3 2.6 18a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0Z',
  layers: 'M12 3 3 8l9 5 9-5-9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5',
  folder: 'M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6Z',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
};

export function Icon({ name, label }: { name: keyof typeof P | string; label?: string }) {
  return (
    <svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
      aria-hidden={label ? undefined : 'true'} aria-label={label} role={label ? 'img' : undefined}>
      <path d={P[name]} />
    </svg>
  );
}

/** Scope chips; optional max shows "+N" for the rest. onPick makes them buttons. */
export function ScopeChips({ scopes, max, onPick, gen }: { scopes: string[]; max?: number; onPick?: (s: string) => void; gen?: boolean }) {
  const terms = useContext(Terms);
  const hit = (s: string) => terms.some((t) => s.toLowerCase().includes(t));
  // when searching, show matching scopes first so the reason for the match is visible
  const ordered = terms.length ? [...scopes.filter(hit), ...scopes.filter((s) => !hit(s))] : scopes;
  const shown = max ? ordered.slice(0, max) : ordered;
  const rest = scopes.length - shown.length;
  // "+N" sits outside the chip group so a fade on overflowing chips never hides it
  return (
    <>
      <span class={`scopes${gen ? ' gen' : ''}${rest > 0 ? ' has-more' : ''}`}>
        {shown.map((s) => (onPick
          ? <button key={s} class={`scope${hit(s) ? ' hit' : ''}`} onClick={() => onPick(s)} title={`Show APIs with ${s}`}>{s}</button>
          : <span key={s} class={`scope${hit(s) ? ' hit' : ''}`}>{s}</span>))}
      </span>
      {rest > 0 && <span class={`scope more${gen ? ' gen' : ''}`}>+{rest}</span>}
    </>
  );
}

const SHORT: Record<string, string> = { DELETE: 'DEL', OPTIONS: 'OPT', PATCH: 'PAT', OTHER: 'OTH' };
/** App mark: gateway node routed to a backend node. Same drawing as the favicon. */
export const Logo = ({ size = 46 }: { size?: number }) => (
  <svg class="logo-mark" width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
    <circle cx="32" cy="32" r="32" class="lm-bg" />
    <path d="M21 41V31a9 9 0 0 1 9-9h11" class="lm-path" />
    <circle cx="21" cy="44" r="6" class="lm-a" />
    <circle cx="44" cy="22" r="6" class="lm-b" />
  </svg>
);

export const MethodBadge = ({ verb, short }: { verb: string; short?: boolean }) =>
  <span class={`m ${verb}`} title={short ? verb : undefined}>{short ? SHORT[verb] ?? verb : verb}</span>;

/** Current search terms (lowercase), used to highlight matches. */
export const Terms = createContext<string[]>([]);

export function splitMatches(text: string, terms: string[]): { t: string; hit: boolean }[] {
  const ts = terms.filter(Boolean);
  if (!ts.length) return [{ t: text, hit: false }];
  const re = new RegExp(`(${ts.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
  return text.split(re).filter(Boolean).map((t) => ({ t, hit: ts.some((x) => x.toLowerCase() === t.toLowerCase()) }));
}

export function Mark({ text }: { text: string }) {
  const terms = useContext(Terms);
  if (!terms.length) return <>{text}</>;
  return <>{splitMatches(text, terms).map((p, i) => (p.hit ? <mark key={i}>{p.t}</mark> : p.t))}</>;
}

/** URL pattern with muted separators and highlighted wildcards / variables. */
export function RoutePath({ path }: { path: string }) {
  const parts = path.split(/(\/|\*|\$\{[^}]*\}|\{[^}]*\})/).filter(Boolean);
  return (
    <span class="path" title={path}>
      {parts.map((p, i) => (p === '/' ? <span key={i} class="sep">/</span> : /^(\*|\$?\{)/.test(p) ? <span key={i} class="var">{p}</span> : <Mark key={i} text={p} />))}
    </span>
  );
}

export function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  const copy = (e: JSX.TargetedMouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    navigator.clipboard?.writeText(text).then(() => { setDone(true); setTimeout(() => setDone(false), 1200); }, () => {});
  };
  return (
    <button class={`copy${done ? ' done' : ''}`} onClick={copy} aria-label={done ? 'Copied' : label} title={done ? 'Copied' : label}>
      <Icon name={done ? 'check' : 'copy'} />
    </button>
  );
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Light XML syntax colouring; input is plain text, output is safe HTML. */
export function highlightXml(xml: string): string {
  return xml.replace(/(<\/?[\w:.-]+)((?:[^>"']|"[^"]*"|'[^']*')*?)(\/?>)|(<|[^<]+)/g, (_m, open, attrs, close, text) => {
    if (text !== undefined) return esc(text);
    const a = (attrs as string).replace(/([\w:.-]+)(=)("[^"]*"|'[^']*')|(\s+|[\s\S])/g, (_x, n, eq, v, rest) =>
      rest !== undefined ? esc(rest) : `<span class="a">${esc(n)}</span>${eq}<span class="s">${esc(v)}</span>`);
    return `<span class="t">${esc(open)}</span>${a}<span class="t">${esc(close)}</span>`;
  });
}

export const fmt = (n: number) => n.toLocaleString('en-US');

export function downloadText(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
