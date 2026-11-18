import { rtfToText } from './core/rtf';
import { parseServices } from './core/parse';
import { ParseError } from './core/types';

export type WorkerIn = { type: 'load'; text: string };
export type WorkerOut =
  | { type: 'progress'; phase: 'unwrap' | 'parse'; done: number; total: number }
  | { type: 'done'; services: import('./core/types').Service[] }
  | { type: 'error'; message: string };

const post = (m: WorkerOut) => (self as unknown as Worker).postMessage(m);

self.onmessage = (e: MessageEvent<WorkerIn>) => {
  try {
    post({ type: 'progress', phase: 'unwrap', done: 0, total: 1 });
    const xml = rtfToText(e.data.text);
    const services = parseServices(xml, (done, total) => post({ type: 'progress', phase: 'parse', done, total }));
    post({ type: 'done', services });
  } catch (err) {
    post({
      type: 'error',
      message: err instanceof ParseError
        ? `${err.message}. Choose the .rtf or .xml file exported from the gateway's service list.`
        : `This file couldn't be read: ${(err as Error).message}`,
    });
  }
};
