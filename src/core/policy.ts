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

/** Encapsulated assertion that stores an issued token; its `scope` parameter is the scope the token gets. */
export const TOKEN_STORAGE = 'OTK Token DB Storage New';
/** "${var}" stays whole; otherwise split on spaces/commas (OAuth scope lists are space-separated). */
const splitScopes = (v: string) => (/^\$\{[^}]*\}$/.test(v.trim()) ? [v.trim()] : v.split(/[\s,]+/).filter(Boolean));

export function extractPolicyInfo(policyXml: string): Pick<Service, 'backends' | 'backendHosts' | 'includes' | 'scopes' | 'generatedScopes' | 'assertions' | 'disabledAssertions' | 'steps'> {
  const backends = uniq(attrValues(policyXml, 'ProtectedServiceUrl'));
  const all = parseAssertions(policyXml).filter((a) => !NOISE.has(a.type));
  const on = all.filter((a) => a.enabled);
  return {
    backends,
    backendHosts: uniq(backends.map(hostOf)),
    includes: uniq(attrValues(policyXml, 'PolicyName')),
    // only validators that actually run count as required scopes
    scopes: uniq(on.flatMap((a) => a.scopes ?? [])),
    generatedScopes: uniq(on.filter((a) => a.kind === 'encapsulated' && a.label === TOKEN_STORAGE && a.params?.scope !== undefined).flatMap((a) => splitScopes(a.params!.scope))),
    assertions: uniq(on.filter((a) => a.kind !== 'include').map((a) => a.label)),
    disabledAssertions: uniq(all.filter((a) => !a.enabled && a.kind !== 'include').map((a) => a.label)),
    steps: all.map(({ kind, label, enabled }) => ({ kind, label, enabled })),
  };
}
