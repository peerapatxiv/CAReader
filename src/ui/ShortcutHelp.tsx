import { useEffect, useRef } from 'preact/hooks';
import { Icon } from './bits';

const mac = typeof navigator !== 'undefined' && /Mac/.test(navigator.platform);
const KEYS: [string[], string][] = [
  [[mac ? '⌘' : 'Ctrl', 'K'], 'Search'],
  [['/'], 'Search'],
  [['↑', '↓'], 'Previous / next API'],
  [['Esc'], 'Close details, then clear search'],
  [['?'], 'Show or hide this list'],
];

export function ShortcutHelp({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);
  return (
    <div class="modal-back" onClick={onClose}>
      <div class="modal" role="dialog" aria-modal="true" aria-label="Keyboard shortcuts" tabIndex={-1} ref={ref} onClick={(e) => e.stopPropagation()}>
        <header><h2>Keyboard shortcuts</h2><button class="btn ghost icon" aria-label="Close" onClick={onClose}><Icon name="x" /></button></header>
        <dl>
          {KEYS.map(([k, d]) => (
            <div key={d + k.join()}><dt>{k.map((x) => <kbd key={x}>{x}</kbd>)}</dt><dd>{d}</dd></div>
          ))}
        </dl>
      </div>
    </div>
  );
}
