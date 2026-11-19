import { useEffect, useRef, useState } from 'preact/hooks';
import { loadFile, loadUrl, type Progress } from '../loader';
import type { Service } from '../core/types';
import { Icon, Logo, fmt } from './bits';
import { forgetLastFile, loadLastFile, peekLastFile, type LastFileMeta } from './lastFile';

const ago = (t: number) => {
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  return new Date(t).toLocaleDateString();
};

type Mode = 'file' | 'api';
const store = {
  get: (k: string) => { try { return localStorage.getItem(k) ?? ''; } catch { return ''; } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* storage unavailable */ } },
};

export function DropZone({ onLoaded }: { onLoaded: (s: Service[], fileName: string, fresh: boolean) => void }) {
  const [over, setOver] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [last, setLast] = useState<LastFileMeta | undefined>();
  const input = useRef<HTMLInputElement>(null);
  const [mode, setModeState] = useState<Mode>(() => (store.get('se.mode') === 'file' ? 'file' : 'api'));
  const [apiUrl, setApiUrl] = useState(() => store.get('se.apiUrl'));
  const [user, setUser] = useState(() => store.get('se.apiUser'));
  const [pass, setPass] = useState('');
  const setMode = (m: Mode) => { setModeState(m); setError(null); store.set('se.mode', m); };

  useEffect(() => { peekLastFile().then(setLast); }, []);

  const open = async (file: File | undefined) => {
    if (!file || progress) return;
    setError(null);
    try {
      const services = await loadFile(file, setProgress);
      onLoaded(services, file.name, true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setProgress(null);
    }
  };

  const callApi = async (e: Event) => {
    e.preventDefault();
    if (progress) return;
    setError(null);
    const url = apiUrl.trim();
    try { new URL(url); } catch { setError('Enter the full URL, starting with https://'); return; }
    store.set('se.apiUrl', url);
    store.set('se.apiUser', user);
    try {
      const services = await loadUrl(url, user, pass, setProgress);
      onLoaded(services, new URL(url).host, true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setProgress(null);
    }
  };

  const reopen = async () => {
    setError(null);
    setProgress({ phase: 'read', done: 0, total: 1 });
    const f = await loadLastFile();
    setProgress(null);
    if (f) onLoaded(f.services, f.fileName, false);
    else { setLast(undefined); setError('The saved copy is no longer available. Choose the file again.'); }
  };

  useEffect(() => {
    const prevent = (e: DragEvent) => { e.preventDefault(); if (e.type === 'dragover') setOver(true); };
    const leave = (e: DragEvent) => { if (!e.relatedTarget) setOver(false); };
    const drop = (e: DragEvent) => { e.preventDefault(); setOver(false); if (mode === 'file') open(e.dataTransfer?.files[0]); };
    window.addEventListener('dragover', prevent);
    window.addEventListener('dragleave', leave);
    window.addEventListener('drop', drop);
    return () => { window.removeEventListener('dragover', prevent); window.removeEventListener('dragleave', leave); window.removeEventListener('drop', drop); };
  });

  const label = !progress ? '' :
    progress.phase === 'fetch' ? 'Downloading from the gateway…' :
    progress.phase === 'read' ? 'Reading the file…' :
    progress.phase === 'unwrap' ? 'Unwrapping the RTF…' :
    `Reading services: ${fmt(progress.done)} of ${fmt(progress.total)}`;
  const pct = progress?.phase === 'parse' ? (progress.done / progress.total) * 100 : null;

  return (
    <main class="landing">
      <div class="landing-inner">
        <header class="landing-head">
          <div class="landing-brand"><Logo size={56} /><h1>Service Explorer</h1></div>
          <p>See every API on your Layer7 gateway: the scopes it requires, where it routes, and the policy behind it.</p>
        </header>

        <div class="seg" role="tablist" aria-label="Source">
          <button role="tab" aria-selected={mode === 'api'} onClick={() => setMode('api')} disabled={!!progress}>REST Man API</button>
          <button role="tab" aria-selected={mode === 'file'} onClick={() => setMode('file')} disabled={!!progress}>Upload file</button>
        </div>

        {mode === 'file' ? (
          <section class={`drop${over ? ' over' : ''}`} aria-busy={!!progress} onClick={(e) => { if (e.target === e.currentTarget && !progress) input.current?.click(); }}>
            <div class="drop-icon" aria-hidden="true"><Icon name="upload" /></div>
            <div class="drop-text">
              <strong>{over ? 'Drop to open' : 'Drop service.rtf here'}</strong>
              <span>RESTMAN service export, as .rtf or .xml</span>
            </div>
            <button class="btn primary" onClick={() => input.current?.click()} disabled={!!progress}>Choose file</button>
            <input ref={input} type="file" accept=".rtf,.xml,text/rtf,application/rtf,text/xml,application/xml" class="sr-only"
              onChange={(e) => { open((e.target as HTMLInputElement).files?.[0]); (e.target as HTMLInputElement).value = ''; }} />
          </section>
        ) : (
          <form class="remote" onSubmit={callApi} aria-busy={!!progress}>
            <label class="field wide">
              <span>Export URL (GET)</span>
              <input type="url" required placeholder="https://example.com/api" value={apiUrl}
                onInput={(e) => setApiUrl((e.target as HTMLInputElement).value)} autoComplete="url" />
            </label>
            <label class="field">
              <span>Username</span>
              <input type="text" value={user} onInput={(e) => setUser((e.target as HTMLInputElement).value)} autoComplete="username" />
            </label>
            <label class="field">
              <span>Password</span>
              <input type="password" value={pass} onInput={(e) => setPass((e.target as HTMLInputElement).value)} autoComplete="current-password" />
            </label>
            <div class="remote-foot">
              <span>Sent as Basic auth. The password is never saved.</span>
              <button class="btn primary" type="submit" disabled={!!progress}>Load</button>
            </div>
          </form>
        )}

        {last && !progress && (
          <div class="recent">
            <div>
              <strong>{last.fileName}</strong>
              <span>{fmt(last.count)} services, opened {ago(last.savedAt)}</span>
            </div>
            <button class="btn" onClick={reopen}>Reopen</button>
            <button class="btn ghost icon" aria-label="Forget this file" title="Forget this file"
              onClick={() => { forgetLastFile(); setLast(undefined); }}><Icon name="x" /></button>
          </div>
        )}

        {progress && (
          <div class="progress" role="status">
            <div class="track"><div class={`fill${pct === null ? ' indet' : ''}`} style={pct === null ? undefined : { width: `${pct}%` }} /></div>
            <div class="label">{label}</div>
          </div>
        )}
        {error && <div class="error" role="alert">{error}</div>}

      </div>
    </main>
  );
}
