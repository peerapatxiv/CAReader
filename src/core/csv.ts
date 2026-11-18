import type { Service } from './types';

const COLS = ['id', 'name', 'enabled', 'urlPattern', 'verbs', 'scopes', 'assertions', 'backends', 'includes', 'folderId', 'policyRevision'] as const;

const cell = (v: unknown): string => {
  const s = Array.isArray(v) ? v.join('; ') : String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function toCsv(list: Service[]): string {
  return [COLS.join(','), ...list.map((s) => COLS.map((c) => cell(s[c])).join(','))].join('\r\n');
}
