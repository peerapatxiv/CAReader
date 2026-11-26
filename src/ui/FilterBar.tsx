import { useEffect, useRef, useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import { FLAGS, ranked, type Facets, type Flag, type Query } from '../core/query';
import type { Action, FacetKey } from './store';
import { Icon, fmt } from './bits';

const FLAG_LABEL: Record<Flag, string> = { test: 'Test API', soap: 'SOAP', internal: 'Internal', tracing: 'Tracing' };
const flagText = (f: Flag, v: boolean) => (f === 'test' ? (v ? 'Test APIs only' : 'Hiding test APIs') : `${v ? '' : 'not '}${FLAG_LABEL[f]}`);
const FACET_LABEL: Record<FacetKey, string> = { methods: 'Method', scopes: 'Required scope', generated: 'Generated scope', assertions: 'Assertion', hosts: 'Backend', folders: 'Folder', includes: 'Uses policy', urlIssues: 'URL issue' };

function Popover({ label, active, children, onClear }: { label: string; active: string | null; children: ComponentChildren; onClear: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node)) {
        e.stopPropagation();
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close, true);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', close, true); };
  }, [open]);
  return (
    <div class="pop-wrap" ref={ref}>
      <span class={`chip${active ? ' on' : ''}`}>
        <button class="btn ghost" style={{ height: 'auto', padding: 0, gap: 4 }} aria-expanded={open} onClick={() => setOpen(!open)}>
          <span class="chip-t" title={active ? `${label}: ${active}` : undefined}>{active ? `${label}: ${active}` : label}</span> <Icon name="chevron" />
        </button>
        {active && <button class="x btn ghost" style={{ height: 16, padding: 0 }} aria-label={`Clear ${label} filter`} onClick={onClear}><Icon name="x" /></button>}
      </span>
      {open && <div class="pop" role="dialog" aria-label={`${label} filter`}>{children}</div>}
    </div>
  );
}

function FacetList({ facet, counts, selected, dispatch }: { facet: FacetKey; counts: Map<string, number>; selected: string[]; dispatch: (a: Action) => void }) {
  const [find, setFind] = useState('');
  const rows = ranked(counts);
  for (const s of selected) if (!counts.has(s)) rows.push([s, 0]);
  const shown = rows.filter(([k]) => k.toLowerCase().includes(find.toLowerCase()));
  return (
    <>
      {rows.length > 8 && <input autoFocus placeholder={`Find ${FACET_LABEL[facet].toLowerCase()}…`} value={find} onInput={(e) => setFind((e.target as HTMLInputElement).value)} />}
      <ul>
        {shown.slice(0, 300).map(([k, n]) => (
          <li key={k}>
            <label title={k}>
              <input type="checkbox" checked={selected.includes(k)} onChange={() => dispatch({ type: 'toggleFacet', facet, value: k })} />
              <span class={`t${facet === 'hosts' || facet === 'folders' || facet === 'scopes' || facet === 'generated' ? ' mono' : ''}`}>{k}</span>
              <span class="n">{fmt(n)}</span>
            </label>
          </li>
        ))}
        {shown.length === 0 && <li class="muted" style={{ padding: 8 }}>No matches</li>}
      </ul>
    </>
  );
}

const summary = (xs: string[]) => (xs.length === 0 ? null : xs.length === 1 ? xs[0] : `${xs.length} selected`);

export function FilterBar({ query, facets, shown, total, dispatch, onExport }: {
  query: Query; facets: Record<FacetKey | 'status', Facets>; shown: number; total: number; dispatch: (a: Action) => void; onExport: () => void;
}) {
  const flagSummary = FLAGS.filter((f) => query.flags[f] !== undefined).map((f) => flagText(f, query.flags[f]!));
  const anyActive = query.status !== 'all' || query.text || flagSummary.length || (['methods', 'scopes', 'generated', 'assertions', 'hosts', 'folders', 'includes', 'urlIssues'] as FacetKey[]).some((k) => query[k].length);
  const setFlag = (f: Flag, v: boolean | undefined) => dispatch({ type: 'setQuery', query: { flags: { ...query.flags, [f]: v } } });
  const statusFacets = facets.status;
  return (
    <div class="filters" role="toolbar" aria-label="Filters">
      <div class="chips">
      <Popover label="Status" active={query.status === 'all' ? null : query.status === 'enabled' ? 'Enabled' : 'Disabled'}
        onClear={() => dispatch({ type: 'setQuery', query: { status: 'all' } })}>
        <div class="seg">
          {(['all', 'enabled', 'disabled'] as const).map((s) => (
            <button key={s} class={query.status === s ? 'on' : ''} onClick={() => dispatch({ type: 'setQuery', query: { status: s } })}>
              {s === 'all' ? 'All' : s === 'enabled' ? `Enabled ${fmt(statusFacets.enabled)}` : `Disabled ${fmt(statusFacets.disabled)}`}
            </button>
          ))}
        </div>
      </Popover>
      {(['methods', 'scopes', 'generated', 'assertions', 'hosts', 'includes', 'urlIssues'] as FacetKey[]).map((k) => (
        <Popover key={k} label={FACET_LABEL[k]} active={summary(query[k])} onClear={() => dispatch({ type: 'setQuery', query: { [k]: [] } })}>
          <FacetList facet={k} counts={facets[k][k]} selected={query[k]} dispatch={dispatch} />
        </Popover>
      ))}
      <Popover label="Test APIs" active={query.flags.test === undefined ? null : query.flags.test ? 'Only' : 'Hidden'}
        onClear={() => setFlag('test', undefined)}>
        <div class="seg">
          {([['Show all', undefined], ['Only test', true], ['Hide test', false]] as const).map(([l, v]) => (
            <button key={l} class={query.flags.test === v ? 'on' : ''} onClick={() => setFlag('test', v)}>{l}</button>
          ))}
        </div>
        <p class="pop-note">Test APIs have test, poc, mock, demo, dummy or sandbox in their name or URL, e.g. <span class="mono">/sample/test</span>. {fmt(facets.status.test)} in this view.</p>
      </Popover>
      <Popover label="Flags" active={flagSummary.filter((x) => !/test/i.test(x)).length ? flagSummary.filter((x) => !/test/i.test(x)).join(', ') : null}
        onClear={() => dispatch({ type: 'setQuery', query: { flags: query.flags.test === undefined ? {} : { test: query.flags.test } } })}>
        {FLAGS.filter((f) => f !== 'test').map((f) => (
          <div class="flag" key={f}>
            <span>{FLAG_LABEL[f]}</span>
            <div class="seg">
              {([['Any', undefined], ['Yes', true], ['No', false]] as const).map(([l, v]) => (
                <button key={l} class={query.flags[f] === v ? 'on' : ''} onClick={() => setFlag(f, v)}>{l}</button>
              ))}
            </div>
          </div>
        ))}
      </Popover>
      </div>
      <div class="filters-end">
      {anyActive ? <button class="btn ghost clear" onClick={() => dispatch({ type: 'drill', query: {} })}>Clear all</button> : null}
      <span class="count" aria-live="polite"><b>{fmt(shown)}</b> of {fmt(total)} services</span>
      <button class="btn dark" onClick={onExport} disabled={shown === 0}><Icon name="download" /> Export CSV</button>
      </div>
    </div>
  );
}
