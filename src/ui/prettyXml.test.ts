import { it, expect } from 'vitest';
import { prettyXml } from './prettyXml';

it('indents nested tags', () => expect(prettyXml('<a><b x="1"/><c>t</c></a>')).toBe('<a>\n  <b x="1"/>\n  <c>t</c>\n</a>'));
it('is stable on indented input', () => {
  const s = '<a>\n  <b x="1"/>\n  <c>t</c>\n</a>';
  expect(prettyXml(s)).toBe(s);
});
it('keeps the xml declaration at top level', () => expect(prettyXml('<?xml version="1.0"?><a/>')).toBe('<?xml version="1.0"?>\n<a/>'));
