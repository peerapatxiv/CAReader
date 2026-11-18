import type { Service } from '../core/types';

/** Remembers the last parsed export in IndexedDB so it can be reopened with one click. Never throws. */
const DB = 'service-explorer', STORE = 'last', KEY = 'file';
/** Bump when the Service shape changes, so copies saved by older versions are ignored. */
export const SCHEMA = 4;
export interface LastFile { fileName: string; savedAt: number; services: Service[]; schema?: number }

function open(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

async function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T | undefined> {
  try {
    const db = await open();
    return await new Promise<T>((res, rej) => {
      const req = fn(db.transaction(STORE, mode).objectStore(STORE));
      req.onsuccess = () => res(req.result);
      req.onerror = () => rej(req.error);
    }).finally(() => db.close());
  } catch {
    return undefined;
  }
}

export interface LastFileMeta { fileName: string; savedAt: number; count: number; schema?: number }
const META = 'meta';

export async function saveLastFile(f: LastFile) {
  await run('readwrite', (s) => s.put({ ...f, schema: SCHEMA }, KEY));
  await run('readwrite', (s) => s.put({ fileName: f.fileName, savedAt: f.savedAt, count: f.services.length, schema: SCHEMA } satisfies LastFileMeta, META));
}
export const loadLastFile = async () => { const f = await run<LastFile>('readonly', (s) => s.get(KEY)); return f?.schema === SCHEMA ? f : undefined; };
/** Small summary for the landing page (does not read the services). */
export const peekLastFile = async () => { const m = await run<LastFileMeta>('readonly', (s) => s.get(META)); return m?.schema === SCHEMA ? m : undefined; };
export async function forgetLastFile() {
  await run('readwrite', (s) => s.delete(KEY));
  await run('readwrite', (s) => s.delete(META));
}
