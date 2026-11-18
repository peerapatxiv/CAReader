import { it, expect } from 'vitest';
import { visibleRange } from './useVirtual';

it('starts at 0 with overscan clamped', () => expect(visibleRange(0, 400, 40, 1000)).toEqual({ start: 0, end: 18 }));
it('scrolls', () => expect(visibleRange(4000, 400, 40, 1000)).toEqual({ start: 92, end: 118 }));
it('clamps end to count', () => expect(visibleRange(4000, 400, 40, 105)).toEqual({ start: 92, end: 105 }));
it('handles empty', () => expect(visibleRange(0, 400, 40, 0)).toEqual({ start: 0, end: 0 }));
