import { describe, it, expect } from 'vitest';
import { reducer, initialState } from './store';
import { svc } from '../core/testutil';

describe('reducer', () => {
  it('loaded sets services and overview tab', () => {
    const s = reducer({ ...initialState, tab: 'services' }, { type: 'loaded', services: [svc({})], fileName: 'a.rtf' });
    expect(s.services).toHaveLength(1);
    expect(s.tab).toBe('overview');
    expect(s.fileName).toBe('a.rtf');
  });
  it('toggleFacet adds then removes', () => {
    const a = reducer(initialState, { type: 'toggleFacet', facet: 'methods', value: 'GET' });
    expect(a.query.methods).toEqual(['GET']);
    expect(reducer(a, { type: 'toggleFacet', facet: 'methods', value: 'GET' }).query.methods).toEqual([]);
  });
  it('setSort same key flips dir, new key resets to asc', () => {
    const a = reducer(initialState, { type: 'setSort', key: 'name' });
    expect(a.sort).toEqual({ key: 'name', dir: initialState.sort.dir === 'asc' ? 'desc' : 'asc' });
    expect(reducer(a, { type: 'setSort', key: 'urlPattern' }).sort).toEqual({ key: 'urlPattern', dir: 'asc' });
  });
  it('drill applies a fresh query and switches to services', () => {
    const s = reducer({ ...initialState, query: { ...initialState.query, text: 'x' } }, { type: 'drill', query: { status: 'disabled' } });
    expect(s.tab).toBe('services');
    expect(s.query.status).toBe('disabled');
    expect(s.query.text).toBe('');
  });
  it('reset clears services', () => {
    const s = reducer({ ...initialState, services: [svc({})] }, { type: 'reset' });
    expect(s.services).toEqual([]);
  });
});
