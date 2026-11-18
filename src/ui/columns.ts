/** Resizable table columns: widths in px for each resizable column. */
export type ColKey = 'name' | 'url' | 'methods' | 'scopes' | 'host';
export type Widths = Record<ColKey, number>;

export const DEFAULT_WIDTHS: Widths = { name: 260, url: 280, methods: 236, scopes: 240, host: 180 };
export const MIN_W = 80, MAX_W = 900;
const STATUS = 24, GAP = 12, PAD = 16, MARGIN = 8;
export const STORAGE_KEY = 'service-explorer.columns';

export const clampWidth = (w: number) => Math.round(Math.min(MAX_W, Math.max(MIN_W, w)));

/** Columns shown, in order. In split view (detail panel open) URL and backend are hidden. */
export const visibleCols = (withPanel: boolean): ColKey[] => (withPanel ? ['name', 'methods', 'scopes'] : ['name', 'url', 'methods', 'scopes', 'host']);

/** CSS grid-template-columns: fixed px for all but the last column, which can grow to fill. */
export function gridTemplate(w: Widths, withPanel: boolean): string {
  const cols = visibleCols(withPanel);
  return [`${STATUS}px`, ...cols.map((c, i) => (i === cols.length - 1 ? `minmax(${w[c]}px, 1fr)` : `${w[c]}px`))].join(' ');
}

/** Minimum row width, so the table scrolls sideways instead of squashing when columns are wide. */
export function totalWidth(w: Widths, withPanel: boolean): number {
  const cols = visibleCols(withPanel);
  return STATUS + cols.reduce((s, c) => s + w[c], 0) + cols.length * GAP + 2 * PAD + 2 * MARGIN;
}

export function parseWidths(raw: string | null): Widths {
  const out = { ...DEFAULT_WIDTHS };
  try {
    const o = JSON.parse(raw ?? '{}');
    for (const k of Object.keys(out) as ColKey[]) if (typeof o?.[k] === 'number') out[k] = clampWidth(o[k]);
  } catch { /* use defaults */ }
  return out;
}
