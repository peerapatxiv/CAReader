import { useEffect, useMemo, useReducer, useRef, useState } from 'preact/hooks';
import { filterServices, sortServices, facetCounts, queryToHash, hashToQuery, type Query } from '../core/query';
import { toCsv } from '../core/csv';
import type { Service } from '../core/types';
import { initialState, reducer, type FacetKey, type Theme } from './store';
import { DropZone } from './DropZone';
import { FilterBar } from './FilterBar';
import { ServiceTable } from './ServiceTable';
import { DetailPanel } from './DetailPanel';
import { Overview } from './Overview';
import { Icon, Logo, Terms, downloadText } from './bits';
import { saveLastFile } from './lastFile';
import { ShortcutHelp } from './ShortcutHelp';

const THEME_KEY = 'service-explorer.theme';
const readTheme = (): Theme => { try { const t = localStorage.getItem(THEME_KEY); return t === 'light' || t === 'dark' ? t : 'system'; } catch { return 'system'; } };
const isTyping = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));

export function App() {
  const [state, dispatch] = useReducer(reducer, initialState, (s) => ({ ...s, theme: readTheme(), query: hashToQuery(location.hash).q }));
  const { services, query, sort, selectedId, tab, theme } = state;
  const search = useRef<HTMLInputElement>(null);
  const [text, setText] = useState(query.text);
  const [help, setHelp] = useState(false);
  const terms = useMemo(() => query.text.toLowerCase().split(/\s+/).filter(Boolean), [query.text]);

  // theme
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') root.removeAttribute('data-theme'); else root.setAttribute('data-theme', theme);
    try { localStorage.setItem(THEME_KEY, theme); } catch { /* storage unavailable */ }
  }, [theme]);

  // debounced search text -> query
  useEffect(() => { if (text !== query.text) { const t = setTimeout(() => dispatch({ type: 'setQuery', query: { text } }), 120); return () => clearTimeout(t); } }, [text]);
  useEffect(() => { setText(query.text); }, [query.text]);

  // query + selection -> URL hash
  useEffect(() => {
    if (!services.length) return;
    const h = tab === 'services' ? queryToHash(query, selectedId) : '';
    if (h !== location.hash.slice(1)) history.replaceState(null, '', h ? `#${h}` : location.pathname + location.search);
  }, [services, query, selectedId, tab]);

  const rows = useMemo(() => sortServices(filterServices(services, query), sort), [services, query, sort]);
  const facets = useMemo(() => {
    const without = (p: Partial<Query>) => facetCounts(filterServices(services, { ...query, ...p }));
    const out = { status: without({ status: 'all' }) } as Record<FacetKey | 'status', ReturnType<typeof facetCounts>>;
    for (const k of ['methods', 'scopes', 'generated', 'assertions', 'hosts', 'folders', 'includes'] as FacetKey[]) out[k] = without({ [k]: [] });
    return out;
  }, [services, query]);
  const selected = useMemo(() => services.find((s) => s.id === selectedId), [services, selectedId]);

  // keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!services.length) return;
      if (e.key === '?' && !isTyping(e.target)) { e.preventDefault(); setHelp((h) => !h); return; }
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !isTyping(e.target))) {
        e.preventDefault();
        dispatch({ type: 'setTab', tab: 'services' });
        setTimeout(() => search.current?.select(), 0);
        return;
      }
      if (e.key === 'Escape') {
        if (help) setHelp(false);
        else if (selectedId) dispatch({ type: 'select' });
        else if (e.target === search.current && text) setText('');
        else if (e.target === search.current) search.current?.blur();
        return;
      }
      if (tab !== 'services' || (isTyping(e.target) && e.target !== search.current)) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (!rows.length) return;
        const i = rows.findIndex((r) => r.id === selectedId);
        const n = i < 0 ? 0 : Math.min(rows.length - 1, Math.max(0, i + (e.key === 'ArrowDown' ? 1 : -1)));
        dispatch({ type: 'select', id: rows[n].id });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [services, rows, selectedId, tab, text, help]);

  const onLoaded = (s: Service[], fileName: string, fresh: boolean) => {
    if (fresh) saveLastFile({ fileName, savedAt: Date.now(), services: s });
    const fromHash = hashToQuery(location.hash);
    dispatch({ type: 'loaded', services: s, fileName });
    if (location.hash.length > 1) {
      dispatch({ type: 'setTab', tab: 'services' });
      if (fromHash.selectedId && s.some((x) => x.id === fromHash.selectedId)) dispatch({ type: 'select', id: fromHash.selectedId });
    }
  };

  const exportCsv = () => {
    const d = new Date();
    const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    downloadText(`services-${stamp}.csv`, '﻿' + toCsv(rows), 'text/csv;charset=utf-8');
  };

  const nextTheme: Record<Theme, Theme> = { system: 'light', light: 'dark', dark: 'system' };
  const themeIcon = theme === 'light' ? 'sun' : theme === 'dark' ? 'moon' : 'monitor';

  if (!services.length) return <DropZone onLoaded={onLoaded} />;

  return (
    <div class="shell">
      <header class="top">
        <div class="brand">
          <Logo />
          <span class="brand-t"><b>Service Explorer</b><span>{state.fileName}</span></span>
        </div>
        <div class="tabs" role="tablist" aria-label="Views">
          <button role="tab" aria-selected={tab === 'overview'} onClick={() => dispatch({ type: 'setTab', tab: 'overview' })}>Overview</button>
          <button role="tab" aria-selected={tab === 'services'} onClick={() => dispatch({ type: 'setTab', tab: 'services' })}>Services</button>
        </div>
        <label class="search">
          <span class="search-ic"><Icon name="search" /></span>
          <span class="sr-only">Search services</span>
          <input ref={search} type="search" placeholder="Search name, URL, scope, backend or policy" value={text}
            onFocus={() => dispatch({ type: 'setTab', tab: 'services' })}
            onInput={(e) => setText((e.target as HTMLInputElement).value)} />
          <kbd>{/Mac/.test(navigator.platform) ? '⌘K' : 'Ctrl K'}</kbd>
        </label>
        <button class="btn round" onClick={() => setHelp(true)} aria-label="Keyboard shortcuts (?)" title="Keyboard shortcuts (?)"><span aria-hidden="true" style={{ fontWeight: 600 }}>?</span></button>
        <button class="btn round" onClick={() => dispatch({ type: 'setTheme', theme: nextTheme[theme] })}
          aria-label={`Theme: ${theme}. Switch to ${nextTheme[theme]}`} title={`Theme: ${theme}`}><Icon name={themeIcon} /></button>
        <button class="btn dark" onClick={() => { history.replaceState(null, '', location.pathname + location.search); setText(''); dispatch({ type: 'reset' }); }}>
          <Icon name="upload" /> <span class="hide-sm">Open another file</span>
        </button>
      </header>
      <Terms.Provider value={terms}>
      {tab === 'overview' ? (
        <Overview services={services} fileName={state.fileName} dispatch={dispatch} onSearch={(v) => {
          setText(v);
          dispatch({ type: 'setTab', tab: 'services' });
          setTimeout(() => { const el = search.current; if (el) { el.focus(); el.setSelectionRange(v.length, v.length); } }, 0);
        }} />
      ) : (
        <section class={`services${selected ? ' with-panel' : ''}`}>
          <FilterBar query={query} facets={facets} shown={rows.length} total={services.length} dispatch={dispatch} onExport={exportCsv} />
          <div class="table-wrap">
          <ServiceTable withPanel={!!selected} rows={rows} sort={sort} selectedId={selectedId} dispatch={dispatch} onClear={() => { setText(''); dispatch({ type: 'drill', query: {} }); }} />
          {selected && <DetailPanel s={selected} dispatch={dispatch} />}
          </div>
        </section>
      )}
      </Terms.Provider>
      {help && <ShortcutHelp onClose={() => setHelp(false)} />}
    </div>
  );
}
