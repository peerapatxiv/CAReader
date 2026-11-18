import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { Service } from '../core/types';
import type { Action } from './store';
import { CopyButton, Icon, MethodBadge, RoutePath, ScopeChips, downloadText, fmt, highlightXml } from './bits';
import { prettyXml } from './prettyXml';

type PTab = 'overview' | 'steps' | 'policy';
const KIND_LABEL = { encapsulated: 'Encapsulated', include: 'Policy fragment', builtin: 'Built-in' } as const;
const BIG = 250_000;

function PolicyView({ s }: { s: Service }) {
  const pretty = useMemo(() => prettyXml(s.policyXml), [s.policyXml]);
  const [colour, setColour] = useState(pretty.length < BIG);
  const html = useMemo(() => (colour ? highlightXml(pretty) : null), [pretty, colour]);
  return (
    <>
      <div class="code-tools">
        <span class="muted">{fmt(pretty.split('\n').length)} lines</span>
        {!colour && <button class="btn" onClick={() => setColour(true)}>Show colours</button>}
        <CopyButton text={pretty} label="Copy policy XML" />
        <button class="btn" onClick={() => downloadText(`${s.name.replace(/[^\w.-]+/g, '_')}.policy.xml`, pretty, 'application/xml')}>
          <Icon name="download" /> Download
        </button>
      </div>
      {html !== null ? <pre class="code" dangerouslySetInnerHTML={{ __html: html }} /> : <pre class="code">{pretty}</pre>}
    </>
  );
}

export function DetailPanel({ s, dispatch }: { s: Service; dispatch: (a: Action) => void }) {
  const [tab, setTab] = useState<PTab>('overview');
  const closeRef = useRef<HTMLButtonElement>(null);

  const flags: [string, boolean][] = [['SOAP', s.soap], ['Internal', s.internal], ['Tracing', s.tracing], ['WSS processing', s.properties.wssProcessingEnabled === 'true']];

  return (
    <aside class="panel" aria-label={`Details for ${s.name}`}>
      <header>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2>{s.name}</h2>
          <div class="pills">
            <span class="pill"><span class={`dot${s.enabled ? '' : ' off'}`} />{s.enabled ? 'Enabled' : 'Disabled'}</span>
            {s.test && <span class="pill test">Test API</span>}
          </div>
        </div>
        <button ref={closeRef} class="btn ghost icon" aria-label="Close details (Esc)" title="Close (Esc)" onClick={() => dispatch({ type: 'select' })}>
          <Icon name="x" />
        </button>
      </header>
      <nav class="ptabs" role="tablist">
        {([['overview', 'Overview'], ['steps', `Assertions (${s.steps.length})`], ['policy', 'Policy XML']] as [PTab, string][]).map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>{l}</button>
        ))}
      </nav>
      <div class="body">
        {tab === 'overview' && (
          <>
            <ol class="route" aria-label="How a request flows">
              <li class="stop gw">
                <span class="node" />
                <div>
                  <div class="what">1. Caller hits the gateway <span class="verbs">{s.verbs.map((v) => <MethodBadge key={v} verb={v} />)}</span></div>
                  <div class="val"><RoutePath path={s.urlPattern} /></div>
                </div>
                <CopyButton text={s.urlPattern} label="Copy URL pattern" />
              </li>
              <li class={`stop scope-stop${s.scopes.length ? '' : ' none'}`}>
                <span class="node" />
                <div>
                  <div class="what">2. Token must have the required scopes</div>
                  {s.scopes.length ? (
                    <>
                      <ScopeChips scopes={s.scopes} onPick={(sc) => dispatch({ type: 'drill', query: { scopes: [sc] } })} />
                      <p class="hint">Checked by the Access Token Validator. Select a scope to see every API that requires it.</p>
                    </>
                  ) : <div class="val muted">No scope check: this API doesn't validate token scopes.</div>}
                </div>
                {s.scopes.length > 0 ? <CopyButton text={s.scopes.join(',')} label="Copy scopes" /> : <span />}
              </li>
              {s.backends.length === 0 ? (
                <li class="stop none"><span class="node" /><div><div class="what">3. Backend</div><div class="val muted">This policy doesn't route to a backend.</div></div><span /></li>
              ) : s.backends.map((b, i) => (
                <li class="stop" key={b}>
                  <span class="node" />
                  <div><div class="what">{i === 0 ? '3. Routed to backend' : 'or routed to'}</div><div class="val mono">{b}</div></div>
                  <CopyButton text={b} label="Copy backend URL" />
                </li>
              ))}
            </ol>
            <dl class="kv">
              <dt>Service ID</dt><dd><span class="mono">{s.id}</span><CopyButton text={s.id} label="Copy service ID" /></dd>
              <dt>Folder ID</dt><dd>
                <span class="mono">{s.folderId}</span>
              </dd>
              <dt>Version</dt><dd>{s.version}</dd>
              <dt>Policy revision</dt><dd>{s.policyRevision}</dd>
              <dt>Flags</dt><dd><span class="flags">{flags.map(([l, v]) => <span key={l} class={`flag-tag${v ? ' yes' : ''}`}>{v ? l : `No ${l.toLowerCase()}`}</span>)}</span></dd>
            </dl>
          </>
        )}
        {tab === 'steps' && (
          s.steps.length === 0 ? <p class="muted">This policy has no assertions.</p> : (
            <>
              <p class="steps-note">Assertions in the order the policy runs them. Select one to see every API that uses it.</p>
              <ol class="steps">
                {s.steps.map((st, i) => (
                  <li key={i} class={`${st.kind}${st.enabled ? '' : ' off'}`}>
                    <span class="step-n">{i + 1}</span>
                    <button class="step-b" onClick={() => dispatch({ type: 'drill', query: st.kind === 'include' ? { includes: [st.label] } : { assertions: [st.enabled ? st.label : `${st.label} (disabled)`] } })}
                      title={st.enabled ? 'Show every API that uses this' : 'Switched off here. Show every API where it is switched off'}>
                      <span class="step-l">{st.label}</span>
                      <span class="step-k">{KIND_LABEL[st.kind]}</span>
                    </button>
                    {!st.enabled && <span class="step-off">Disabled</span>}
                  </li>
                ))}
              </ol>
            </>
          )
        )}
        {tab === 'policy' && <PolicyView s={s} />}
      </div>
    </aside>
  );
}
