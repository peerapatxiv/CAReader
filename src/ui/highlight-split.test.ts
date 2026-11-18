import { it, expect } from 'vitest';
import { splitMatches } from './bits';

it('marks case-insensitive matches of every term', () =>
  expect(splitMatches('Orders ITEM details', ['item', 'ord'])).toEqual([
    { t: 'Ord', hit: true }, { t: 'ers ', hit: false }, { t: 'ITEM', hit: true }, { t: ' details', hit: false },
  ]));
it('returns the whole text when nothing matches', () => expect(splitMatches('abc', ['x'])).toEqual([{ t: 'abc', hit: false }]));
it('escapes regex characters in terms', () => expect(splitMatches('/v1/cards*', ['s*'])).toEqual([{ t: '/v1/card', hit: false }, { t: 's*', hit: true }]));
