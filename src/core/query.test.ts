import { describe, it, expect } from 'vitest';
import { emptyQuery, filterServices, sortServices, facetCounts, queryToHash, hashToQuery, type Query } from './query';
import { svc } from './testutil';

const list = [
  svc({ id: '1', name: 'Orders Item', urlPattern: '/v2/orders/item', verbs: ['POST'], backends: ['${gw}/api/ord'], backendHosts: ['${gw}'], includes: ['CORS'], scopes: ['read', 'read-corporate'], assertions: ['Access Token Validator', 'Route via HTTP(S)'], folderId: 'a' }),
  svc({ id: '2', name: 'Card Mgmt', urlPattern: '/v1/cards', verbs: ['GET', 'PUT'], enabled: false, soap: true, backendHosts: ['${int}'], scopes: ['guest'], folderId: 'b' }),
  svc({ id: '3', name: 'Toggle flags', urlPattern: '/v1/toggle', verbs: ['GET'], backendHosts: ['${gw}'], folderId: 'a', policyRevision: 7 }),
];
const q = (p: Partial<Query>): Query => ({ ...emptyQuery, ...p });
const ids = (xs: { id: string }[]) => xs.map((x) => x.id);

describe('filterServices', () => {
  it('returns all for empty query', () => expect(ids(filterServices(list, emptyQuery))).toEqual(['1', '2', '3']));
  it('text is case-insensitive and ANDs terms', () => {
    expect(ids(filterServices(list, q({ text: 'ITEM' })))).toEqual(['1']);
    expect(ids(filterServices(list, q({ text: 'v1 toggle' })))).toEqual(['3']);
  });
  it('text searches backends and includes', () => {
    expect(ids(filterServices(list, q({ text: 'api/ord' })))).toEqual(['1']);
    expect(ids(filterServices(list, q({ text: 'cors' })))).toEqual(['1']);
  });
  it('OR within a facet, AND across facets', () => {
    expect(ids(filterServices(list, q({ methods: ['GET', 'POST'] })))).toEqual(['1', '2', '3']);
    expect(ids(filterServices(list, q({ methods: ['GET'], hosts: ['${gw}'] })))).toEqual(['3']);
  });
  it('status', () => expect(ids(filterServices(list, q({ status: 'disabled' })))).toEqual(['2']));
  it('flags', () => expect(ids(filterServices(list, q({ flags: { soap: true } })))).toEqual(['2']));
  it('test flag: only / hide', () => {
    const l = [...list, svc({ id: '9', name: 'Sample Test', test: true })];
    expect(ids(filterServices(l, q({ flags: { test: true } })))).toEqual(['9']);
    expect(ids(filterServices(l, q({ flags: { test: false } })))).toEqual(['1', '2', '3']);
  });
  it('noRouting host token', () => expect(ids(filterServices([...list, svc({ id: '4' })], q({ hosts: ['(no routing)'] })))).toEqual(['4']));
  it('scopes (OR within facet) and no-scope token', () => {
    expect(ids(filterServices(list, q({ scopes: ['read-corporate', 'guest'] })))).toEqual(['1', '2']);
    expect(ids(filterServices(list, q({ scopes: ['(no scope check)'] })))).toEqual(['3']);
  });
  it('assertions (OR within facet)', () => {
    expect(ids(filterServices(list, q({ assertions: ['Access Token Validator'] })))).toEqual(['1']);
    expect(ids(filterServices(list, q({ assertions: ['Nope'] })))).toEqual([]);
  });
  it('disabled assertions are filterable as "<name> (disabled)"', () => {
    const l = [...list, svc({ id: '7', disabledAssertions: ['Access Token Validator'] })];
    expect(ids(filterServices(l, q({ assertions: ['Access Token Validator (disabled)'] })))).toEqual(['7']);
    expect(facetCounts(l).assertions.get('Access Token Validator (disabled)')).toBe(1);
  });
  it('generated scopes filter (with "(issues no token)" token) and search', () => {
    const l = [...list, svc({ id: '8', name: 'Token', generatedScopes: ['biometric'] })];
    expect(ids(filterServices(l, q({ generated: ['biometric'] })))).toEqual(['8']);
    expect(ids(filterServices(l, q({ generated: ['(issues no token)'] })))).toEqual(['1', '2', '3']);
    expect(ids(filterServices(l, q({ text: 'biometric' })))).toEqual(['8']);
    expect(facetCounts(l).generated.get('biometric')).toBe(1);
  });
  it('text searches assertion names', () => expect(ids(filterServices(list, q({ text: 'token validator' })))).toEqual(['1']));
  it('text searches scopes', () => expect(ids(filterServices(list, q({ text: 'guest' })))).toEqual(['2']));
  it('folders and includes', () => {
    expect(ids(filterServices(list, q({ folders: ['b'] })))).toEqual(['2']);
    expect(ids(filterServices(list, q({ includes: ['CORS'] })))).toEqual(['1']);
  });
});

describe('sortServices', () => {
  it('sorts by name desc without mutating', () => {
    const copy = [...list];
    expect(ids(sortServices(list, { key: 'name', dir: 'desc' }))).toEqual(['3', '1', '2']);
    expect(list).toEqual(copy);
  });
  it('sorts by revision', () => expect(ids(sortServices(list, { key: 'policyRevision', dir: 'desc' }))[0]).toBe('3'));
});

describe('facetCounts', () => {
  it('counts', () => {
    const f = facetCounts(list);
    expect(f.methods.get('GET')).toBe(2);
    expect(f.hosts.get('${gw}')).toBe(2);
    expect(f.folders.get('a')).toBe(2);
    expect(f.includes.get('CORS')).toBe(1);
    expect(f.scopes.get('read')).toBe(1);
    expect(f.assertions.get('Access Token Validator')).toBe(1);
    expect(f.scopes.get('(no scope check)')).toBe(1);
    expect([f.enabled, f.disabled]).toEqual([2, 1]);
  });
});

describe('hash', () => {
  it('round-trips', () => {
    const query = q({ text: 'a b&c', status: 'enabled', methods: ['GET'], hosts: ['${gw}'], scopes: ['read'], assertions: ['Access Token Validator'], generated: ['biometric'], flags: { soap: false } });
    expect(hashToQuery(queryToHash(query, 'id1'))).toEqual({ q: query, selectedId: 'id1' });
  });
  it('empty hash gives empty query', () => expect(hashToQuery('')).toEqual({ q: emptyQuery, selectedId: undefined }));
});
