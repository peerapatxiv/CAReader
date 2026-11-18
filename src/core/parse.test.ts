import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseServices } from './parse';
import { ParseError } from './types';

const xml = readFileSync(new URL('./fixtures/two-services.xml', import.meta.url), 'utf8');

describe('parseServices', () => {
  const s = parseServices(xml);
  it('finds both services', () => expect(s).toHaveLength(2));
  it('reads the enabled POST service', () => {
    expect(s[0]).toMatchObject({
      id: 'aaa1', name: 'v2 Orders Item Details', folderId: 'f1', version: 9,
      enabled: true, urlPattern: '/v2/orders/item/details', verbs: ['POST'],
      soap: false, internal: false, tracing: true, policyRevision: 5,
      backends: ['${backendHost}/api/x${request.url.query}'],
      backendHosts: ['${backendHost}'],
      includes: ['Error Checks'],
      scopes: ['read', 'read-corporate'],
    });
    expect(s[0].properties.hasRouting).toBe('true');
    expect(s[0].policyXml).toContain('บัญชีทดสอบ');
    expect(s[0].policyXml).toContain('<L7p:Include>');
  });
  it('reads the disabled service with no routing', () => {
    expect(s[1]).toMatchObject({
      name: 'Cards & Points', enabled: false, verbs: ['GET', 'PUT'],
      backends: [], backendHosts: [], includes: [], scopes: [], soap: true, policyRevision: 0,
    });
  });
  it('reports progress', () => {
    const calls: number[][] = [];
    parseServices(xml, (d, t) => calls.push([d, t]));
    expect(calls.at(-1)).toEqual([2, 2]);
  });
  it('rejects non-export input', () => {
    expect(() => parseServices('<html/>')).toThrow(ParseError);
    expect(() => parseServices('<html/>')).toThrow('Not a Layer7 service export');
  });
});
