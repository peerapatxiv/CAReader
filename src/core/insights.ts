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
