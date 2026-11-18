import { useEffect, useRef, useState } from 'preact/hooks';
import type { Service } from '../core/types';
import type { Sort, SortKey } from '../core/query';
import type { Action } from './store';
import { CopyButton, Icon, Mark, MethodBadge, RoutePath, ScopeChips } from './bits';
import { useScrollBox, visibleRange } from './useVirtual';
import { DEFAULT_WIDTHS, STORAGE_KEY, clampWidth, gridTemplate, parseWidths, totalWidth, visibleCols, type ColKey, type Widths } from './columns';

const HEAD = 54; // .row.head height (48) + gap above first row (6)
const COLS: { key: SortKey | null; col?: ColKey; label: string; cls?: string }[] = [
  { key: 'enabled', label: '' },
  { key: 'name', col: 'name', label: 'Name' },
  { key: 'urlPattern', col: 'url', label: 'URL pattern', cls: 'c-url' },
  { key: null, col: 'methods', label: 'Methods', cls: 'c-methods' },
  { key: 'scopes', col: 'scopes', label: 'Required scopes', cls: 'c-scopes' },
  { key: null, col: 'generated', label: 'Generates scope', cls: 'c-gen' },
];

const loadWidths = (): Widths => { try { return parseWidths(localStorage.getItem(STORAGE_KEY)); } catch { return { ...DEFAULT_WIDTHS }; } };
const saveWidths = (w: Widths) => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(w)); } catch { /* storage unavailable */ } };

/** Drag handle on a header's right edge. Drag to resize; double-click to reset; arrow keys nudge. */
function ResizeHandle({ col, label, width, onChange }: { col: ColKey; label: string; width: number; onChange: (c: ColKey, w: number, save?: boolean) => void }) {
  const start = (e: PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const x0 = e.clientX, w0 = width;
    const el = e.currentTarget as HTMLElement;
    el.setPointerCapture(e.pointerId);
    document.body.classList.add('resizing');
    const move = (ev: PointerEvent) => onChange(col, clampWidth(w0 + ev.clientX - x0));
    const up = (ev: PointerEvent) => {
      onChange(col, clampWidth(w0 + ev.clientX - x0), true);
      document.body.classList.remove('resizing');
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
  };
  return (
    <span class="col-resize" role="separator" aria-orientation="vertical" aria-label={`Resize ${label} column`} tabIndex={0}
      aria-valuenow={width} title="Drag to resize. Double-click to reset."
      onPointerDown={start as any} onClick={(e) => e.stopPropagation()}
      onDblClick={(e) => { e.stopPropagation(); onChange(col, DEFAULT_WIDTHS[col], true); }}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); e.stopPropagation(); onChange(col, clampWidth(width + (e.key === 'ArrowRight' ? 20 : -20)), true); }
      }} />
  );
}

const rowHeight = () => (typeof matchMedia !== 'undefined' && matchMedia('(max-width: 900px)').matches ? 56 : 44);

export function ServiceTable({ rows, sort, selectedId, dispatch, onClear, withPanel = false }: {
  rows: Service[]; sort: Sort; selectedId?: string; dispatch: (a: Action) => void; onClear: () => void; withPanel?: boolean;
}) {
  const [widths, setWidths] = useState<Widths>(loadWidths);
  const resize = (c: ColKey, w: number, save = false) => setWidths((cur) => { const next = { ...cur, [c]: w }; if (save) saveWidths(next); return next; });
  const shown = visibleCols(withPanel);
  const lastCol = shown[shown.length - 1];
  const gridVars = { '--cols': gridTemplate(widths, withPanel), '--total': `${totalWidth(widths, withPanel)}px` } as Record<string, string>;
  const box = useRef<HTMLDivElement>(null);
  const { top, height } = useScrollBox(box);
  const rh = rowHeight();
  const { start, end } = visibleRange(Math.max(0, top - HEAD), height, rh, rows.length);

  // keep the selected row in view (keyboard navigation)
  useEffect(() => {
    const el = box.current;
    const i = rows.findIndex((r) => r.id === selectedId);
    if (!el || i < 0) return;
    const y = HEAD + i * rh;
    if (y < el.scrollTop + HEAD) el.scrollTop = y - HEAD;
    else if (y + rh > el.scrollTop + el.clientHeight) el.scrollTop = y + rh - el.clientHeight;
  }, [selectedId, rows, rh]);

  if (rows.length === 0) {
    return (
      <div class="grid">
        <div class="empty">
          <strong>No services match these filters</strong>
          Try fewer words, or <button class="btn ghost" onClick={onClear} style={{ color: 'var(--coral-ink)', padding: '0 4px' }}>clear all filters</button>.
        </div>
      </div>
    );
  }

  return (
    <div class={`grid${top > 2 ? ' scrolled' : ''}`} ref={box} role="grid" aria-rowcount={rows.length + 1} aria-label="Services" style={gridVars}>
      <div class="row head" role="row">
        {COLS.map((c, i) => (
          <div key={i} role="columnheader" class={c.cls} aria-sort={sort.key === c.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}>
            {c.key ? (
              <button onClick={() => dispatch({ type: 'setSort', key: c.key! })}
                aria-label={c.label ? `Sort by ${c.label}` : 'Sort by status'}>
                {c.label}{sort.key === c.key && <Icon name={sort.dir === 'asc' ? 'arrowUp' : 'arrowDown'} />}
              </button>
            ) : c.label}
            {c.col && c.col !== lastCol && shown.includes(c.col) && <ResizeHandle col={c.col} label={c.label} width={widths[c.col]} onChange={resize} />}
          </div>
        ))}
      </div>
      <div class="rows" style={{ height: rows.length * rh, position: 'relative' }}>
        {rows.slice(start, end).map((s, k) => {
          const i = start + k;
          return (
            <div key={s.id} role="row" aria-rowindex={i + 2} aria-selected={s.id === selectedId}
              class={`row${s.id === selectedId ? ' sel' : ''}${s.enabled ? '' : ' off'}`}
              style={{ position: 'absolute', top: i * rh, left: 0, right: 0, height: rh }}
              onClick={() => dispatch({ type: 'select', id: s.id })}>
              <div role="gridcell" class="c-status"><span class={`dot${s.enabled ? '' : ' off'}`} title={s.enabled ? 'Enabled' : 'Disabled'} /><span class="sr-only">{s.enabled ? 'Enabled' : 'Disabled'}</span></div>
              <div role="gridcell" class="name" title={s.name}>{s.test && <span class="tag-test" title="Test API"><Icon name="flask" />Test</span>}<Mark text={s.name} /><small>{s.urlPattern}</small></div>
              <div role="gridcell" class="c-url"><span class="cell-clip"><RoutePath path={s.urlPattern} /></span><span class="row-copy"><CopyButton text={s.urlPattern} label="Copy URL pattern" /></span></div>
              <div role="gridcell" class="c-methods" title={s.verbs.join(', ')}>{s.verbs.length ? s.verbs.map((v) => <MethodBadge key={v} verb={v} short />) : <span class="empty-cell">—</span>}</div>
              <div role="gridcell" class="c-scopes" title={s.scopes.length ? s.scopes.join(', ') : 'No scope check'}>
                {s.scopes.length ? <ScopeChips scopes={s.scopes} max={2} /> : <span class="no-check">No check</span>}
              </div>
              <div role="gridcell" class="c-gen" title={s.generatedScopes.length ? `Issues tokens with: ${s.generatedScopes.join(', ')}` : 'Does not issue tokens'}>
                {s.generatedScopes.length ? <ScopeChips scopes={s.generatedScopes} max={2} gen /> : <span class="empty-cell">—</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
