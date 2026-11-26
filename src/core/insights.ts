import { NO_SCOPE } from './query';

/** Levenshtein distance (insert / delete / substitute). */
export function editDistance(a: string, b: string): number {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[b.length];
}

export interface SuspiciousScope { scope: string; likely: string; count: number }

/**
 * Scopes that are probably misspellings: at least 6 chars, within 2 edits of another scope
 * that is used at least 5x as often (and by at least 5 services).
 */
export function suspiciousScopes(counts: Map<string, number>): SuspiciousScope[] {
  const all = [...counts].filter(([k]) => k !== NO_SCOPE);
  const out: SuspiciousScope[] = [];
  for (const [scope, n] of all) {
    if (scope.length < 6) continue;
    const better = all
      .filter(([k, m]) => k !== scope && m >= 5 && m >= n * 5 && Math.abs(k.length - scope.length) <= 2 && editDistance(k, scope) <= 2)
      .sort((x, y) => y[1] - x[1])[0];
    if (better) out.push({ scope, likely: better[0], count: n });
  }
  return out.sort((a, b) => a.scope.localeCompare(b.scope));
}

/**
 * Test / proof-of-concept APIs, judged from name + URL pattern:
 * "test" anywhere (testjwt, sockettest, /sample/test) except inside latest/attest/contest/protest,
 * or poc / mock / demo / dummy / sandbox as a whole word.
 */
export function isTestApi(name: string, urlPattern: string): boolean {
  const s = `${name} ${urlPattern}`.toLowerCase().replace(/(la|at|con|pro)test/g, ' ');
  return /test|(^|[^a-z])(poc|mock|demo|dummy|sandbox)([^a-z]|$)/.test(s);
}

/** Problems a URL pattern can have; the label is what services carry and filters show. */
export const URL_ISSUES = {
  duplicate: 'Same URL as another enabled API',
  empty: 'Empty URL pattern',
  'no-leading-slash': 'No leading /',
  'double-slash': 'Contains //',
  'trailing-slash': 'Ends with /',
  whitespace: 'Whitespace in path',
  'odd-chars': 'Unusual characters',
  uppercase: 'Uppercase letters',
} as const;
export type UrlIssue = keyof typeof URL_ISSUES;

/** Issues visible from the pattern alone (everything except `duplicate`). */
export function urlPatternIssues(p: string): UrlIssue[] {
  if (p.trim() === '') return p === '' ? ['empty'] : ['empty', 'whitespace'];
  const out: UrlIssue[] = [];
  if (/\s/.test(p)) out.push('whitespace');
  if (!p.trimStart().startsWith('/')) out.push('no-leading-slash');
  if (p.includes('//')) out.push('double-slash');
  if (p.trim().length > 1 && p.trimEnd().endsWith('/')) out.push('trailing-slash');
  if (/[^A-Za-z0-9/_\-.*~{}:$\s]/.test(p)) out.push('odd-chars');
  if (/[A-Z]/.test(p)) out.push('uppercase');
  return out;
}

/** Fill `urlIssues` (labels from URL_ISSUES) on every service; `duplicate` = an enabled API whose pattern another enabled API also uses. */
export function markUrlIssues<T extends { enabled: boolean; urlPattern: string; urlIssues: string[] }>(list: T[]): T[] {
  const seen = new Map<string, number>();
  for (const s of list) if (s.enabled && s.urlPattern) seen.set(s.urlPattern, (seen.get(s.urlPattern) ?? 0) + 1);
  for (const s of list) {
    const dup = s.enabled && (seen.get(s.urlPattern) ?? 0) > 1;
    s.urlIssues = [...(dup ? ['duplicate' as const] : []), ...urlPatternIssues(s.urlPattern)].map((k) => URL_ISSUES[k]);
  }
  return list;
}
