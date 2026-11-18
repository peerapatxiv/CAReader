import ParseWorker from './worker?worker&inline';
import type { Service } from './core/types';
import type { WorkerOut } from './worker';

export type Progress = { phase: 'read' | 'unwrap' | 'parse'; done: number; total: number };

export function loadFile(file: File, onProgress: (p: Progress) => void): Promise<Service[]> {
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
    onProgress({ phase: 'read', done: 0, total: 1 });
    file.text().then((text) => w.postMessage({ type: 'load', text }), (err) => { finish(); reject(err); });
  });
}
