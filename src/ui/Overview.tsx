import type { Service } from '../core/types';
import { NO_ROUTING, NO_SCOPE, NO_TOKEN, facetCounts, ranked, type Query } from '../core/query';
import { suspiciousScopes } from '../core/insights';
import type { Action } from './store';
import { Icon, fmt } from './bits';

type Drill = (q: Partial<Query>) => void;

/** Ring gauge: dark disc with a thin accent arc (share), big light numeral and a small tracked label. */
function Ring({ pct, label }: { pct: number; label: string }) {
  const r = 56, c = 2 * Math.PI * r, v = Math.round(pct);
  const ticks = Array.from({ length: 60 }, (_, i) => i * 6);
  return (
    <svg class="ring" viewBox="0 0 140 140" role="img" aria-label={`${v}% ${label}`}>
      <defs>
        <radialGradient id="ring-disc-g" cx="50%" cy="35%" r="70%">
          <stop offset="0%" class="ring-disc-hi" />
          <stop offset="100%" class="ring-disc-lo" />
        </radialGradient>
      </defs>
      <circle cx="70" cy="70" r="70" fill="url(#ring-disc-g)" />
      <g class="ring-ticks">
        {ticks.map((a) => <line key={a} x1="70" y1="20" x2="70" y2={a % 30 === 0 ? 25 : 23} transform={`rotate(${a} 70 70)`} />)}
      </g>
      <circle cx="70" cy="70" r={r} class="ring-track" />
      <circle cx="70" cy="70" r={r} class="ring-arc" stroke-dasharray={`${(pct / 100) * c} ${c}`} transform="rotate(-90 70 70)" />
      <text x="70" y="78" class="ring-v">{v}<tspan class="ring-pct" dx="1.5">%</tspan></text>
      <text x="70" y="95" class="ring-l">{label}</text>
    </svg>
  );
}

/** Dot matrix: `on` of `total`, one dot per `per` services. */
function Dots({ on, total, cols = 12, rows = 4 }: { on: number; total: number; cols?: number; rows?: number }) {
  const n = cols * rows, lit = Math.round((on / Math.max(1, total)) * n);
  return (
    <div class="dots" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }} aria-hidden="true">
      {Array.from({ length: n }, (_, i) => <span key={i} class={i < lit ? 'on' : ''} />)}
    </div>
  );
}

/** Concentric circles by rank (evenly stepped, like the reference); counts are the labels. */
function Rings({ entries, onPick }: { entries: [string, number][]; onPick: (k: string) => void }) {
  return (
    <div class="concentric">
      {entries.map(([k, n], i) => {
        const size = 100 - i * (64 / Math.max(1, entries.length - 1));
        return (
          <button key={k} class={`cc cc${i}`} style={{ width: `${size}%`, height: `${size}%` }} onClick={() => onPick(k)}
            title={`${k}: ${fmt(n)} APIs. Show them`}>
            <span class="cc-label"><b>{fmt(n)}</b><span class="mono">{k}</span></span>
          </button>
        );
      })}
    </div>
  );
}

function BarList({ title, icon, entries, onPick, mono, wide }: {
  title: string; icon: string; entries: [string, number][]; onPick: (k: string) => void; mono?: boolean; wide?: boolean;
}) {
  const max = Math.max(1, ...entries.map((e) => e[1]));
  return (
    <section class={`card${wide ? ' wide' : ''}`}>
      <header class="card-head"><span class="ic"><Icon name={icon} /></span><h3>{title}</h3><span class="pill-count">{fmt(entries.length)}</span></header>
      <ul class="bars">
        {entries.map(([k, n]) => (
          <li key={k}>
            <button onClick={() => onPick(k)} title={`${k}: ${fmt(n)} APIs. Show them`}>
              <span class={`lbl${mono ? ' mono' : ''}`}>{k}</span>
              <span class="n">{fmt(n)}</span>
              <span class="bar"><span style={{ width: `${Math.max(2, (n / max) * 100)}%` }} /></span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Stat({ icon, label, value, onClick, accent }: { icon: string; label: string; value: number; onClick: () => void; accent?: boolean }) {
  return (
    <button class={`card stat${accent ? ' accent' : ''}`} onClick={onClick}>
      <span class="ic"><Icon name={icon} /></span>
      <span class="stat-l">{label}</span>
      <span class="stat-v">{fmt(value)}</span>
      <span class="stat-go" aria-hidden="true"><Icon name="arrowRight" /></span>
    </button>
  );
}

export function Overview({ services, fileName, dispatch, onSearch }: {
  services: Service[]; fileName?: string; dispatch: (a: Action) => void; onSearch: (text: string) => void;
}) {
  const f = facetCounts(services);
  const drill: Drill = (query) => dispatch({ type: 'drill', query });
  const noRouting = f.hosts.get(NO_ROUTING) ?? 0;
  const noScope = f.scopes.get(NO_SCOPE) ?? 0;
  const enabled = services.filter((s) => s.enabled);
  const enabledNoScope = enabled.filter((s) => s.scopes.length === 0).length;
  const enabledTest = enabled.filter((s) => s.test).length;
  const coverage = enabled.length ? ((enabled.length - enabledNoScope) / enabled.length) * 100 : 0;
  const scopeList = ranked(f.scopes).filter(([k]) => k !== NO_SCOPE);

  const atvOff = services.filter((s) => s.disabledAssertions.includes('Access Token Validator') && !s.assertions.includes('Access Token Validator'));
  const checks: { title: string; detail: string; n: number; q: Partial<Query>; sev: 'high' | 'mid' | 'low'; icon: string }[] = [
    ...(atvOff.length ? [{
      title: `${fmt(atvOff.length)} APIs have their Access Token Validator switched off`,
      detail: 'The validator is in the policy but disabled, so token scopes are not checked.',
      n: atvOff.length, q: { assertions: ['Access Token Validator (disabled)'] }, sev: 'high' as const, icon: 'key',
    }] : []),
    ...suspiciousScopes(f.scopes).map((x) => ({
      title: `"${x.scope}" looks like a typo of "${x.likely}"`,
      detail: `A token with ${x.likely} probably won't pass this check.`,
      n: x.count, q: { scopes: [x.scope] }, sev: 'high' as const, icon: 'alert',
    })),
    ...(enabledTest ? [{ title: `${fmt(enabledTest)} test APIs are enabled`, detail: 'Name or URL contains test, poc, mock, demo, dummy or sandbox.', n: enabledTest, q: { status: 'enabled' as const, flags: { test: true } }, sev: 'mid' as const, icon: 'flask' }] : []),
    ...(enabledNoScope ? [{ title: `${fmt(enabledNoScope)} enabled APIs skip the scope check`, detail: 'Some are expected, like public or pre-login endpoints.', n: enabledNoScope, q: { status: 'enabled' as const, scopes: [NO_SCOPE] }, sev: 'low' as const, icon: 'key' }] : []),
  ];

  return (
    <main class="overview">
      <section class="hero">
        <div class="hero-left">
          <div class="big-circle"><span>{fmt(services.length)}</span></div>
          <div class="hero-meta"><b>services</b><span>in {fileName ?? 'this export'}</span></div>
          <span class="vr" aria-hidden="true" />
          <button class="btn coral lg" onClick={() => drill({})}>Browse all APIs <Icon name="arrowRight" /></button>
        </div>
        <label class="hero-ask">
          <span class="ask-1">Looking for an API?</span>
          <input class="ask-2" placeholder="Type a name, URL or scope…" onInput={(e) => onSearch((e.target as HTMLInputElement).value)} />
          <span class="ask-icon" aria-hidden="true"><Icon name="search" /></span>
        </label>
      </section>

      <div class="bento">
        <section class="card gauge" >
          <button class="card-click" onClick={() => drill({ status: 'enabled', scopes: [NO_SCOPE] })} aria-label="Show enabled APIs without a scope check" />
          <Ring pct={coverage} label="scope coverage" />
          <p class="gauge-note">of enabled APIs check token scopes</p>
        </section>

        <section class="card enabled-card">
          <header class="card-head"><span class="ic"><Icon name="power" /></span><span class="seg-pill">Enabled</span></header>
          <div class="kpi"><span class="kpi-v">{fmt(f.enabled)}</span><span class="kpi-l">of {fmt(services.length)} APIs are live</span></div>
          <Dots on={f.enabled} total={services.length} />
          <div class="card-foot">
            <button class="link" onClick={() => drill({ status: 'disabled' })}><span class="ic sm coral"><Icon name="power" /></span>{fmt(f.disabled)} disabled</button>
          </div>
        </section>

        <div class="stat-grid">
          <Stat icon="key" label="No scope check" value={noScope} onClick={() => drill({ scopes: [NO_SCOPE] })} />
          <Stat icon="route" label="No backend route" value={noRouting} onClick={() => drill({ hosts: [NO_ROUTING] })} />
          <Stat icon="flask" label="Test APIs" value={f.test} onClick={() => drill({ flags: { test: true } })} accent />
          <Stat icon="server" label="Backend hosts" value={f.hosts.size - (noRouting ? 1 : 0)} onClick={() => drill({})} />
        </div>

        <section class="card scopes-card">
          <header class="card-head"><span class="ic"><Icon name="shield" /></span><h3>Top required scopes</h3><span class="pill-count">{fmt(scopeList.length)} in use</span></header>
          <Rings entries={scopeList.slice(0, 4)} onPick={(k) => drill({ scopes: [k] })} />
        </section>

        <section class="card checks">
          <header class="card-head"><span class="ic"><Icon name="alert" /></span><h3>Worth checking</h3><span class="pill-count">{checks.length}</span></header>
          {checks.length === 0 ? <p class="muted">Nothing stands out in this export.</p> : (
            <ol class="timeline">
              {checks.map((c) => (
                <li key={c.title} class={c.sev}>
                  <span class="t-node"><Icon name={c.icon} /></span>
                  <div class="t-body"><strong>{c.title}</strong><span>{c.detail}</span></div>
                  <button class="btn pill" onClick={() => drill(c.q)}>Show {c.n === 1 ? 'API' : fmt(c.n)}</button>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section class="card methods">
          <header class="card-head"><span class="ic"><Icon name="layers" /></span><h3>HTTP methods</h3></header>
          <div class="wave">
            {ranked(f.methods).map(([k, n]) => {
              const max = Math.max(...f.methods.values());
              return (
                <button key={k} onClick={() => drill({ methods: [k] })} title={`${k}: ${fmt(n)} APIs`}>
                  <span class="wave-n">{fmt(n)}</span>
                  <span class="wave-bar"><span style={{ height: `${Math.max(4, (n / max) * 100)}%` }} /></span>
                  <span class="wave-k">{k}</span>
                </button>
              );
            })}
          </div>
        </section>

        <BarList wide title="All required scopes" icon="shield" entries={ranked(f.scopes)} mono onPick={(k) => drill({ scopes: [k] })} />
        <BarList wide title="Generated scopes (tokens issued by OTK Token DB Storage New)" icon="key" entries={ranked(f.generated).filter(([k]) => k !== NO_TOKEN)} mono onPick={(k) => drill({ generated: [k] })} />
        <BarList title="Backend hosts" icon="server" entries={ranked(f.hosts).slice(0, 10)} mono onPick={(k) => drill({ hosts: [k] })} />
        <BarList title="Most-used shared policies" icon="layers" entries={ranked(f.includes).slice(0, 10)} onPick={(k) => drill({ includes: [k] })} />
        <BarList title="Most-used assertions" icon="grid" entries={ranked(f.assertions).slice(0, 10)} onPick={(k) => drill({ assertions: [k] })} />
      </div>
    </main>
  );
}
