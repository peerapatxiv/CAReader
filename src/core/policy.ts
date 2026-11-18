import type { Service } from './types';
import { decodeEntities } from './xml';
import { parseAssertions } from './assertions';

const uniq = (xs: string[]) => [...new Set(xs)];

/** Host part of a routing URL: scheme://host (host may contain ${vars}) or a leading ${var}. */
export function hostOf(url: string): string {
  const m = url.match(/^[a-z][a-z0-9+.-]*:\/\/(?:\$\{[^}]*\}|[^/$])*/i) ?? url.match(/^\$\{[^}]*\}/);
  return m ? m[0] : url.split('/')[0] || url;
}

function attrValues(policy: string, tag: string): string[] {
  const re = new RegExp(`<L7p:${tag} stringValue="([^"]*)"`, 'g');
  const out: string[] = [];
  for (const m of policy.matchAll(re)) out.push(decodeEntities(m[1]));
  return out;
}

/** Assertions that carry no behaviour and would only add noise to filters. */
const NOISE = new Set(['CommentAssertion']);

export function extractPolicyInfo(policyXml: string): Pick<Service, 'backends' | 'backendHosts' | 'includes' | 'scopes' | 'assertions' | 'disabledAssertions' | 'steps'> {
  const backends = uniq(attrValues(policyXml, 'ProtectedServiceUrl'));
  const all = parseAssertions(policyXml).filter((a) => !NOISE.has(a.type));
  const on = all.filter((a) => a.enabled);
  return {
    backends,
    backendHosts: uniq(backends.map(hostOf)),
    includes: uniq(attrValues(policyXml, 'PolicyName')),
    // only validators that actually run count as required scopes
    scopes: uniq(on.flatMap((a) => a.scopes ?? [])),
    assertions: uniq(on.filter((a) => a.kind !== 'include').map((a) => a.label)),
    disabledAssertions: uniq(all.filter((a) => !a.enabled && a.kind !== 'include').map((a) => a.label)),
    steps: all.map(({ kind, label, enabled }) => ({ kind, label, enabled })),
  };
}
