import { describe, it, expect } from 'vitest';
import { DEFAULT_WIDTHS, clampWidth, gridTemplate, totalWidth, parseWidths } from './columns';

describe('columns', () => {
  it('full table: status + 4 fixed + flexible last (backend)', () =>
    expect(gridTemplate(DEFAULT_WIDTHS, false)).toBe(
      `24px ${DEFAULT_WIDTHS.name}px ${DEFAULT_WIDTHS.url}px ${DEFAULT_WIDTHS.methods}px ${DEFAULT_WIDTHS.scopes}px minmax(${DEFAULT_WIDTHS.host}px, 1fr)`));
  it('split view drops url + backend, scopes becomes flexible', () =>
    expect(gridTemplate(DEFAULT_WIDTHS, true)).toBe(`24px ${DEFAULT_WIDTHS.name}px ${DEFAULT_WIDTHS.methods}px minmax(${DEFAULT_WIDTHS.scopes}px, 1fr)`));
  it('clamps widths', () => {
    expect(clampWidth(10)).toBe(80);
    expect(clampWidth(5000)).toBe(900);
    expect(clampWidth(201.6)).toBe(202);
  });
  it('total width includes gaps and padding', () => {
    const w = { name: 100, url: 100, methods: 100, scopes: 100, host: 100 };
    // 24 status + 500 columns + 5 gaps * 12 + 2 * 16 padding + 2 * 8 margin
    expect(totalWidth(w, false)).toBe(24 + 500 + 60 + 32 + 16);
  });
  it('parses saved widths, ignoring junk', () => {
    expect(parseWidths('{"name":300,"url":"x","bogus":5}')).toEqual({ ...DEFAULT_WIDTHS, name: 300 });
    expect(parseWidths('not json')).toEqual(DEFAULT_WIDTHS);
    expect(parseWidths(null)).toEqual(DEFAULT_WIDTHS);
  });
});
