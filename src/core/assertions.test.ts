import { describe, it, expect } from 'vitest';
import { parseAssertions, humanize, assertionLabel } from './assertions';

const policy = (body: string) => `<?xml version="1.0" encoding="UTF-8"?>
<wsp:Policy xmlns:L7p="http://www.layer7tech.com/ws/policy" xmlns:wsp="http://schemas.xmlsoap.org/ws/2002/12/policy">
    <wsp:All wsp:Usage="Required">${body}
    </wsp:All>
</wsp:Policy>`;
const atv = (scopes: string, disabled = false) => `
        <L7p:Encapsulated>${disabled ? '\n            <L7p:Enabled booleanValue="false"/>' : ''}
            <L7p:EncapsulatedAssertionConfigGuid stringValue="g"/>
            <L7p:EncapsulatedAssertionConfigName stringValue="Access Token Validator"/>
            <L7p:Parameters mapValue="included">
                <L7p:entry>
                    <L7p:key stringValue="given_language"/>
                    <L7p:value stringValue="th"/>
                </L7p:entry>
                <L7p:entry>
                    <L7p:key stringValue="given_scopes"/>
                    <L7p:value stringValue="${scopes}"/>
                </L7p:entry>
            </L7p:Parameters>
        </L7p:Encapsulated>`;

describe('parseAssertions', () => {
  it('lists top-level assertions in order with kind and label', () => {
    const a = parseAssertions(policy(`
        <L7p:CommentAssertion><L7p:Comment stringValue="hi"/></L7p:CommentAssertion>
        <L7p:Include><L7p:PolicyGuid stringValue="g"/><L7p:PolicyName stringValue="Process CORS"/></L7p:Include>
        ${atv('read')}
        <L7p:SetVariable><L7p:VariableToSet stringValue="x"/></L7p:SetVariable>
        <L7p:HttpRoutingAssertion><L7p:ProtectedServiceUrl stringValue="http://x"/></L7p:HttpRoutingAssertion>`));
    expect(a.map((x) => [x.kind, x.label, x.enabled])).toEqual([
      ['builtin', 'Comment', true],
      ['include', 'Process CORS', true],
      ['encapsulated', 'Access Token Validator', true],
      ['builtin', 'Set Context Variable', true],
      ['builtin', 'Route via HTTP(S)', true],
    ]);
    expect(a[2].scopes).toEqual(['read']);
  });
  it('marks an assertion disabled by its own Enabled=false', () => {
    const a = parseAssertions(policy(atv('read,guest', true)));
    expect(a[0]).toMatchObject({ label: 'Access Token Validator', enabled: false, scopes: ['read', 'guest'] });
  });
  it('marks children of a disabled composite as disabled, and finds nested assertions', () => {
    const a = parseAssertions(policy(`
        <wsp:OneOrMore wsp:Usage="Required">
            <L7p:Enabled booleanValue="false"/>
            <wsp:All wsp:Usage="Required">
                <L7p:TrueAssertion/>
            </wsp:All>
        </wsp:OneOrMore>
        <L7p:FalseAssertion/>`));
    expect(a.map((x) => [x.label, x.enabled])).toEqual([['Continue Processing', false], ['Stop Processing', true]]);
  });
  it('does not treat property elements as assertions', () => {
    const a = parseAssertions(policy(`<L7p:HttpRoutingAssertion><L7p:RequestHeaderRules httpPassthroughRuleSet="included"><L7p:ForwardAll booleanValue="true"/></L7p:RequestHeaderRules></L7p:HttpRoutingAssertion>`));
    expect(a.map((x) => x.label)).toEqual(['Route via HTTP(S)']);
  });
  it('ignores composite properties like assertionComment', () => {
    const a = parseAssertions(policy(`
        <wsp:All wsp:Usage="Required">
            <L7p:assertionComment><L7p:Properties mapValue="included"/></L7p:assertionComment>
            <L7p:AssertionComment><L7p:Properties mapValue="included"/></L7p:AssertionComment>
            <L7p:SetVariable/>
        </wsp:All>`));
    expect(a.map((x) => x.label)).toEqual(['Set Context Variable']);
  });
  it('returns [] for empty or non-policy text', () => {
    expect(parseAssertions('')).toEqual([]);
    expect(parseAssertions('<wsp:Policy><wsp:All/></wsp:Policy>')).toEqual([]);
  });
});

describe('parameters', () => {
  it('captures every key/value parameter of an encapsulated assertion', () => {
    const a = parseAssertions(policy(`
        <L7p:Encapsulated>
            <L7p:EncapsulatedAssertionConfigName stringValue="OTK Token DB Storage New"/>
            <L7p:Parameters mapValue="included">
                <L7p:entry><L7p:key stringValue="expiration"/><L7p:value stringValue="300"/></L7p:entry>
                <L7p:entry><L7p:key stringValue="scope"/><L7p:value stringValue="biometric-authen"/></L7p:entry>
            </L7p:Parameters>
        </L7p:Encapsulated>`));
    expect(a[0].params).toEqual({ expiration: '300', scope: 'biometric-authen' });
  });
});

describe('assertionLabel', () => {
  it('uses Policy Manager names where known, humanized type otherwise', () => {
    expect(assertionLabel('ComparisonAssertion')).toBe('Compare Expression');
    expect(assertionLabel('HardcodedResponse')).toBe('Return Template Response');
    expect(assertionLabel('SomeNewThingAssertion')).toBe('Some New Thing');
  });
});

describe('humanize', () => {
  it.each([
    ['HttpRoutingAssertion', 'HTTP Routing'], ['SetVariable', 'Set Variable'], ['EvaluateJsonPathExpression', 'Evaluate JSON Path Expression'],
    ['CommentAssertion', 'Comment'], ['AuditDetailAssertion', 'Audit Detail'], ['HardcodedResponse', 'Hardcoded Response'],
  ])('%s → %s', (a, b) => expect(humanize(a)).toBe(b));
});
