import type { Service } from './types';
export const svc = (p: Partial<Service>): Service => ({
  id: 'x', name: 'x', folderId: 'f', version: 1, enabled: true, urlPattern: '/x', verbs: [],
  soap: false, internal: false, tracing: false, test: false, policyRevision: 0, properties: {},
  backends: [], backendHosts: [], includes: [], scopes: [], generatedScopes: [], assertions: [], disabledAssertions: [], steps: [], policyXml: '', ...p,
});
