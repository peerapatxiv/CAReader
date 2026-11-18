import type { Service } from './types';

export type Flag = 'test' | 'soap' | 'internal' | 'tracing';
export const FLAGS: Flag[] = ['test', 'soap', 'internal', 'tracing'];
/** pseudo backend host for services with no routing */
export const NO_ROUTING = '(no routing)';
/** pseudo scope for services that never validate a token's scopes */
export const NO_SCOPE = '(no scope check)';

export interface Query {
  text: string;
  status: 'all' | 'enabled' | 'disabled';
  methods: string[];
  hosts: string[];
  folders: string[];
  includes: string[];
  scopes: string[];
  assertions: string[];
  flags: Partial<Record<Flag, boolean>>;
}

export const emptyQuery: Query = { text: '', status: 'all', methods: [], hosts: [], folders: [], includes: [], scopes: [], assertions: [], flags: {} };

export type SortKey = 'name' | 'urlPattern' | 'enabled' | 'scopes' | 'backendHosts' | 'policyRevision';
export interface Sort { key: SortKey; dir: 'asc' | 'desc' }

const hay = new WeakMap<Service, string>();
const haystack = (s: Service) => {
  let h = hay.get(s);
  if (h === undefined) {
    h = [s.name, s.urlPattern, s.id, ...s.backends, ...s.includes, ...s.scopes, ...s.assertions].join('\n').toLowerCase();
    hay.set(s, h);
  }
  return h;
};

export const hostsOf = (s: Service) => (s.backendHosts.length ? s.backendHosts : [NO_ROUTING]);
export const scopesOf = (s: Service) => (s.scopes.length ? s.scopes : [NO_SCOPE]);
/** Assertion filter values: enabled names, plus switched-off ones as "<name> (disabled)". */
export const assertionsOf = (s: Service) => [...s.assertions, ...s.disabledAssertions.map((a) => `${a} (disabled)`)];
const anyIn = (have: string[], want: string[]) => want.length === 0 || want.some((w) => have.includes(w));

export function filterServices(list: Service[], q: Query): Service[] {
  const terms = q.text.toLowerCase().split(/\s+/).filter(Boolean);
  const flags = FLAGS.filter((f) => q.flags[f] !== undefined);
  return list.filter((s) => {
    if (q.status === 'enabled' && !s.enabled) return false;
    if (q.status === 'disabled' && s.enabled) return false;
    if (!anyIn(s.verbs, q.methods)) return false;
    if (!anyIn(hostsOf(s), q.hosts)) return false;
    if (!anyIn([s.folderId], q.folders)) return false;
    if (!anyIn(s.includes, q.includes)) return false;
    if (!anyIn(scopesOf(s), q.scopes)) return false;
    if (!anyIn(assertionsOf(s), q.assertions)) return false;
    for (const f of flags) if (s[f] !== q.flags[f]) return false;
    if (terms.length) {
      const h = haystack(s);
      for (const t of terms) if (!h.includes(t)) return false;
    }
    return true;
  });
}

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
const sortValue = (s: Service, k: SortKey): string | number =>
  k === 'enabled' ? (s.enabled ? 1 : 0) : k === 'policyRevision' ? s.policyRevision : k === 'backendHosts' ? hostsOf(s).join(',') : k === 'scopes' ? s.scopes.join(',') || '\uffff' : s[k];

export function sortServices(list: Service[], sort: Sort): Service[] {
  const m = sort.dir === 'asc' ? 1 : -1;
  return [...list].sort((a, b) => {
    const x = sortValue(a, sort.key), y = sortValue(b, sort.key);
    const c = typeof x === 'number' && typeof y === 'number' ? x - y : collator.compare(String(x), String(y));
    return c * m || collator.compare(a.name, b.name);
  });
}

export interface Facets {
  methods: Map<string, number>;
  hosts: Map<string, number>;
  folders: Map<string, number>;
  includes: Map<string, number>;
  scopes: Map<string, number>;
  assertions: Map<string, number>;
  enabled: number;
  test: number;
  disabled: number;
}

const inc = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1);

export function facetCounts(list: Service[]): Facets {
  const f: Facets = { methods: new Map(), hosts: new Map(), folders: new Map(), includes: new Map(), scopes: new Map(), assertions: new Map(), enabled: 0, test: 0, disabled: 0 };
  for (const s of list) {
    s.verbs.forEach((v) => inc(f.methods, v));
    hostsOf(s).forEach((h) => inc(f.hosts, h));
    inc(f.folders, s.folderId);
    s.includes.forEach((i) => inc(f.includes, i));
    scopesOf(s).forEach((x) => inc(f.scopes, x));
    assertionsOf(s).forEach((x) => inc(f.assertions, x));
    if (s.enabled) f.enabled++; else f.disabled++;
    if (s.test) f.test++;
  }
  return f;
}

/** Sort a count map descending by count, then by key. */
export const ranked = (m: Map<string, number>) => [...m].sort((a, b) => b[1] - a[1] || collator.compare(a[0], b[0]));

export function queryToHash(q: Query, selectedId?: string): string {
  const p = new URLSearchParams();
  if (q.text) p.set('q', q.text);
  if (q.status !== 'all') p.set('status', q.status);
  for (const k of ['methods', 'hosts', 'folders', 'includes', 'scopes', 'assertions'] as const) q[k].forEach((v) => p.append(k, v));
  for (const f of FLAGS) if (q.flags[f] !== undefined) p.set(f, String(q.flags[f]));
  if (selectedId) p.set('id', selectedId);
  return p.toString();
}

export function hashToQuery(hash: string): { q: Query; selectedId?: string } {
  const p = new URLSearchParams(hash.replace(/^#/, ''));
  const st = p.get('status');
  const flags: Query['flags'] = {};
  for (const f of FLAGS) { const v = p.get(f); if (v === 'true' || v === 'false') flags[f] = v === 'true'; }
  return {
    q: {
      text: p.get('q') ?? '',
      status: st === 'enabled' || st === 'disabled' ? st : 'all',
      methods: p.getAll('methods'), hosts: p.getAll('hosts'), folders: p.getAll('folders'), includes: p.getAll('includes'), scopes: p.getAll('scopes'), assertions: p.getAll('assertions'),
      flags,
    },
    selectedId: p.get('id') ?? undefined,
  };
}
