import { describe, it, expect } from 'vitest';
import { rtfToText } from './rtf';

const wrap = (body: string) => `{\\rtf1\\ansi\\ansicpg1252\n\\f0\\fs24 \\cf0 \\kerning0\n${body}}`;

describe('rtfToText', () => {
  it('unwraps lines', () => {
    expect(rtfToText(wrap('<?xml?>\\\n<a/>\\\n'))).toBe('<?xml?>\n<a/>\n');
  });
  it('unescapes braces and backslash', () => {
    expect(rtfToText(wrap('<?xml?>\\{x\\}\\\\'))).toBe('<?xml?>{x}\\');
  });
  it('decodes unicode', () => {
    expect(rtfToText(wrap('<?xml?>\\uc0\\u3588 \\u3640 API'))).toBe('<?xml?>คุAPI');
  });
  it('passes plain xml through', () => {
    expect(rtfToText('<?xml version="1.0"?><a/>')).toBe('<?xml version="1.0"?><a/>');
  });
});
