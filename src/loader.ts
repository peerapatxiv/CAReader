import ParseWorker from './worker?worker&inline';
import type { Service } from './core/types';
import type { WorkerOut } from './worker';

export type Progress = { phase: 'fetch' | 'read' | 'unwrap' | 'parse'; done: number; total: number };

function parseText(text: Promise<string>, onProgress: (p: Progress) => void): Promise<Service[]> {
  return new Promise((resolve, reject) => {
    const w = new ParseWorker();
    const finish = () => w.terminate();
    w.onmessage = (e: MessageEvent<WorkerOut>) => {
      const m = e.data;
      if (m.type === 'progress') onProgress(m);
      else if (m.type === 'done') { finish(); resolve(m.services); }
      else { finish(); reject(new Error(m.message)); }
    };
    w.onerror = (e) => { finish(); reject(new Error(e.message || 'The file reader stopped unexpectedly.')); };
    text.then((t) => w.postMessage({ type: 'load', text: t }), (err) => { finish(); reject(err); });
  });
}

export function loadFile(file: File, onProgress: (p: Progress) => void): Promise<Service[]> {
  onProgress({ phase: 'read', done: 0, total: 1 });
  return parseText(file.text(), onProgress);
}

const basicAuth = (user: string, pass: string) => {
  const bytes = new TextEncoder().encode(`${user}:${pass}`);
  return 'Basic ' + btoa(String.fromCharCode(...bytes));
};

/**
 * GET the export from the gateway with Basic auth.
 * Under `npm run dev` the request goes through the dev server's /__gateway proxy (no CORS);
 * in the built page it is a direct fetch, which needs the gateway to allow CORS.
 */
export async function fetchExport(url: string, user: string, pass: string): Promise<string> {
  const headers = { 'Content-Type': 'application/json', Authorization: basicAuth(user, pass) };
  const viaProxy = import.meta.env.DEV;
  let res: Response;
  try {
    res = viaProxy
      ? await fetch(`/__gateway?url=${encodeURIComponent(url)}`, { headers })
      : await fetch(url, { headers, credentials: 'omit' });
  } catch {
    throw new Error(viaProxy
      ? 'Couldn\'t reach the dev server proxy.'
      : 'Couldn\'t reach the gateway. The browser probably blocked the call (CORS). Run `npm run dev` and use the page it serves, which goes through a local proxy.');
  }
  if (res.status === 401 || res.status === 403) throw new Error(`The gateway rejected the username or password (HTTP ${res.status}).`);
  if (!res.ok) {
    const body = (await res.text().catch(() => '')).slice(0, 300);
    throw new Error(`The gateway answered HTTP ${res.status}${body ? `: ${body}` : ''}`);
  }
  return res.text();
}

export function loadUrl(url: string, user: string, pass: string, onProgress: (p: Progress) => void): Promise<Service[]> {
  onProgress({ phase: 'fetch', done: 0, total: 1 });
  return parseText(fetchExport(url, user, pass), onProgress);
}
