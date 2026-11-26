export interface Service {
  id: string;
  name: string;
  folderId: string;
  version: number;
  enabled: boolean;
  urlPattern: string;
  /** URL pattern problems (labels from URL_ISSUES), see markUrlIssues */
  urlIssues: string[];
  verbs: string[];
  soap: boolean;
  internal: boolean;
  tracing: boolean;
  /** looks like a test / PoC API (see isTestApi) */
  test: boolean;
  policyRevision: number;
  properties: Record<string, string>;
  /** distinct ProtectedServiceUrl values, decoded */
  backends: string[];
  /** leading ${var} or scheme://host of each backend, distinct */
  backendHosts: string[];
  /** distinct L7p:PolicyName values */
  includes: string[];
  /** required scopes: union of given_scopes on ENABLED encapsulated assertions (e.g. Access Token Validator) */
  scopes: string[];
  /** scopes put on tokens this API issues: `scope` parameter of enabled "OTK Token DB Storage New" */
  generatedScopes: string[];
  /** distinct labels of enabled assertions (encapsulated names + humanized built-in types; no includes/comments) */
  assertions: string[];
  /** distinct labels of assertions switched off in the policy */
  disabledAssertions: string[];
  /** policy steps in order (includes too), for the detail panel */
  steps: { kind: 'encapsulated' | 'include' | 'builtin'; label: string; enabled: boolean }[];
  /** decoded policy text */
  policyXml: string;
}

export class ParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ParseError';
  }
}
