import { describe, it, expect } from 'vitest';
import { extractPolicyInfo, hostOf } from './policy';
import { decodeEntities } from './xml';

describe('extractPolicyInfo', () => {
  it('dedupes backends and includes', () => {
    const p = '<L7p:ProtectedServiceUrl stringValue="${a}/x"/><L7p:ProtectedServiceUrl stringValue="${a}/x"/><L7p:PolicyName stringValue="CORS"/><L7p:PolicyName stringValue="CORS"/>';
    expect(extractPolicyInfo(p)).toMatchObject({ backends: ['${a}/x'], backendHosts: ['${a}'], includes: ['CORS'], scopes: [] });
  });
  it('decodes entities in attribute values', () => {
    expect(extractPolicyInfo('<L7p:PolicyName stringValue="A &amp; B"/>').includes).toEqual(['A & B']);
  });
});

const validator = (v: string, disabled = false) => `<L7p:Encapsulated>${disabled ? '<L7p:Enabled booleanValue="false"/>' : ''}<L7p:EncapsulatedAssertionConfigName stringValue="Access Token Validator"/><L7p:Parameters mapValue="included"><L7p:entry>\n  <L7p:key stringValue="given_scopes"/>\n  <L7p:value stringValue="${v}"/>\n</L7p:entry></L7p:Parameters></L7p:Encapsulated>`;
const pol = (...body: string[]) => `<wsp:Policy><wsp:All wsp:Usage="Required">${body.join('')}</wsp:All></wsp:Policy>`;
const scopeEntry = (v: string) => pol(validator(v));

describe('scopes', () => {
  it('splits given_scopes on commas', () => expect(extractPolicyInfo(scopeEntry('read,read-corporate')).scopes).toEqual(['read', 'read-corporate']));
  it('trims spaces and drops empties', () => expect(extractPolicyInfo(scopeEntry('read, allowreset ,,')).scopes).toEqual(['read', 'allowreset']));
  it('unions several validators without duplicates', () =>
    expect(extractPolicyInfo(pol(validator('read,guest'), validator('guest,personal'))).scopes).toEqual(['read', 'guest', 'personal']));
  it('ignores scopes on a disabled validator and reports it', () => {
    const info = extractPolicyInfo(pol(validator('read', true), '<L7p:SetVariable/>'));
    expect(info.scopes).toEqual([]);
    expect(info.disabledAssertions).toEqual(['Access Token Validator']);
    expect(info.assertions).toEqual(['Set Context Variable']);
  });
  it('lists assertions without comments or includes, and keeps steps in order', () => {
    const info = extractPolicyInfo(pol('<L7p:CommentAssertion/>', '<L7p:Include><L7p:PolicyName stringValue="CORS"/></L7p:Include>', validator('read'), '<L7p:HttpRoutingAssertion/>'));
    expect(info.assertions).toEqual(['Access Token Validator', 'Route via HTTP(S)']);
    expect(info.steps.map((s) => s.label)).toEqual(['CORS', 'Access Token Validator', 'Route via HTTP(S)']);
  });
  it('ignores other keys', () => expect(extractPolicyInfo('<L7p:key stringValue="given_language"/><L7p:value stringValue="th"/>').scopes).toEqual([]));
});

describe('hostOf', () => {
  it('handles literal urls', () => expect(hostOf('http://203.0.113.10:8080/x')).toBe('http://203.0.113.10:8080'));
  it('handles variable hosts', () => expect(hostOf('${backendHost}/api/a')).toBe('${backendHost}'));
  it('handles composed hosts', () => expect(hostOf('https://${p}-gw.${h}/a')).toBe('https://${p}-gw.${h}'));
});

describe('decodeEntities', () => {
  it('decodes named and numeric', () => expect(decodeEntities('&lt;a&gt; &amp;amp; &quot;&apos; &#3588;&#x0E04;')).toBe('<a> &amp; "\' คค'));
});
