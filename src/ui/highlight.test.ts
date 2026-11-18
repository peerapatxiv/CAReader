import { it, expect } from 'vitest';
import { highlightXml } from './bits';

it('escapes text and attribute values (no html injection)', () => {
  const h = highlightXml('<a x="<img onerror=1>">t&amp;<b/></a>');
  expect(h).not.toContain('<img');
  expect(h).toContain('<span class="a">x</span>');
  expect(h).toContain('t&amp;amp;');
});
