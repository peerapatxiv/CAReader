import { decodeEntities } from './xml';

export type AssertionKind = 'encapsulated' | 'include' | 'builtin';
export interface PolicyAssertion {
  kind: AssertionKind;
  /** raw element name without the L7p: prefix, e.g. "HttpRoutingAssertion" */
  type: string;
  /** what people call it: encapsulated config name, included policy name, or humanized type */
  label: string;
  /** false when the assertion or any enclosing composite has Enabled=false */
  enabled: boolean;
  /** given_scopes parameter (encapsulated assertions only), comma-split */
  scopes?: string[];
}

const ACRONYMS: Record<string, string> = { Http: 'HTTP', Json: 'JSON', Xml: 'XML', Jwt: 'JWT', Saml: 'SAML', Ssl: 'SSL', Jdbc: 'JDBC', Mq: 'MQ', Xpath: 'XPath', Url: 'URL', Id: 'ID' };

/** "HttpRoutingAssertion" → "HTTP Routing" */
export function humanize(type: string): string {
  return type.replace(/Assertion$/, '').replace(/([a-z0-9])([A-Z])/g, '$1 $2').split(' ').map((w) => ACRONYMS[w] ?? w).join(' ');
}

/** Names shown in Layer7 Policy Manager for common built-in assertions. */
const PM_NAMES: Record<string, string> = {
  HttpRoutingAssertion: 'Route via HTTP(S)',
  ComparisonAssertion: 'Compare Expression',
  SetVariable: 'Set Context Variable',
  AddHeader: 'Add or Remove Header',
  TrueAssertion: 'Continue Processing',
  FalseAssertion: 'Stop Processing',
  HardcodedResponse: 'Return Template Response',
  Regex: 'Evaluate Regular Expression',
  AuditDetailAssertion: 'Add Audit Detail',
  AuditAssertion: 'Audit Messages in Policy',
  CustomizeErrorResponse: 'Customize Error Response',
  JdbcQuery: 'Perform JDBC Query',
  ResponseXpathAssertion: 'Evaluate Response XPath',
  RequestXpathAssertion: 'Evaluate Request XPath',
  RaiseErrorAssertion: 'Raise Error',
  CommentAssertion: 'Comment',
};

export const assertionLabel = (type: string) => PM_NAMES[type] ?? humanize(type);

const COMPOSITE = /^wsp:(All|OneOrMore|ExactlyOne)$/;
/** Assertion elements are capitalised; lowercase ones (assertionComment…) and these are properties. */
const isAssertionTag = (tag: string) => /^L7p:[A-Z]/.test(tag) && tag !== 'L7p:Enabled' && tag !== 'L7p:AssertionComment';
const TAG = /<(\/?)([A-Za-z][\w:.-]*)((?:[^>"']|"[^"]*"|'[^']*')*?)(\/?)>/g;
const attr = (attrs: string, name: string) => attrs.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1];

interface Frame { tag: string; parent?: Frame; disabled: boolean; node?: PolicyAssertion; scopeKey?: boolean }

/** Parse a Layer7 policy into its assertions (any depth), in document order. Never throws. */
export function parseAssertions(policyXml: string): PolicyAssertion[] {
  const out: { node: PolicyAssertion; frame: Frame }[] = [];
  let top: Frame | undefined;
  for (const m of policyXml.matchAll(TAG)) {
    const [, closing, tag, attrs, selfClose] = m;
    if (closing) {
      // pop to the matching open tag (tolerates sloppy input)
      let f = top;
      while (f && f.tag !== tag) f = f.parent;
      top = f?.parent;
      continue;
    }
    const parent = top;
    if (tag === 'L7p:Enabled' && parent && attr(attrs, 'booleanValue') === 'false') parent.disabled = true;
    const owner = (() => { let f = parent; while (f && !f.node) f = f.parent; return f; })();
    if (owner?.node) {
      if (tag === 'L7p:EncapsulatedAssertionConfigName' && owner.node.kind === 'encapsulated') owner.node.label = decodeEntities(attr(attrs, 'stringValue') ?? owner.node.label);
      if (tag === 'L7p:PolicyName' && owner.node.kind === 'include') owner.node.label = decodeEntities(attr(attrs, 'stringValue') ?? owner.node.label);
      if (tag === 'L7p:key') owner.scopeKey = attr(attrs, 'stringValue') === 'given_scopes';
      else if (tag === 'L7p:value' && owner.scopeKey) {
        owner.scopeKey = false;
        const raw = decodeEntities(attr(attrs, 'stringValue') ?? '');
        owner.node.scopes = [...new Set([...(owner.node.scopes ?? []), ...raw.split(',').map((s) => s.trim()).filter(Boolean)])];
      }
    }
    const frame: Frame = { tag, parent, disabled: false };
    if (parent && COMPOSITE.test(parent.tag) && isAssertionTag(tag)) {
      const type = tag.slice(4);
      const kind: AssertionKind = type === 'Encapsulated' ? 'encapsulated' : type === 'Include' ? 'include' : 'builtin';
      frame.node = { kind, type, label: kind === 'builtin' ? assertionLabel(type) : type, enabled: true };
      out.push({ node: frame.node, frame });
    }
    if (!selfClose) top = frame;
  }
  for (const { node, frame } of out) {
    for (let f: Frame | undefined = frame; f; f = f.parent) if (f.disabled) { node.enabled = false; break; }
  }
  return out.map((o) => o.node);
}
