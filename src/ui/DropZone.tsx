import { useEffect, useRef, useState } from 'preact/hooks';
import { loadFile, type Progress } from '../loader';
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

export function DropZone({ onLoaded }: { onLoaded: (s: Service[], fileName: string, fresh: boolean) => void }) {
  const [over, setOver] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [last, setLast] = useState<LastFileMeta | undefined>();
  const input = useRef<HTMLInputElement>(null);

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
    const drop = (e: DragEvent) => { e.preventDefault(); setOver(false); open(e.dataTransfer?.files[0]); };
    window.addEventListener('dragover', prevent);
    window.addEventListener('dragleave', leave);
    window.addEventListener('drop', drop);
    return () => { window.removeEventListener('dragover', prevent); window.removeEventListener('dragleave', leave); window.removeEventListener('drop', drop); };
  });

  const label = !progress ? '' :
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

        <ul class="features">
          <li><b>Required scopes</b><span>Which token scopes each API needs, and every API behind a scope.</span></li>
          <li><b>Routing</b><span>Gateway path to backend URL, grouped by backend host.</span></li>
          <li><b>Health checks</b><span>Disabled APIs, test APIs, no scope check, likely scope typos.</span></li>
        </ul>
        <p class="privacy">The file is read inside this browser tab and kept only on this computer. Nothing is uploaded.</p>
      </div>
    </main>
  );
}
