import { it, expect } from 'vitest';
import { toCsv } from './csv';
import { svc } from './testutil';

it('builds csv with quoting and joined arrays', () => {
  const csv = toCsv([svc({ id: '1', name: 'a,"b"', verbs: ['GET', 'PUT'], backends: ['x\ny'], scopes: ['read', 'guest'] })]);
  const [head, row] = csv.split('\r\n');
  expect(head).toBe('id,name,enabled,urlPattern,verbs,scopes,generatedScopes,assertions,backends,includes,folderId,policyRevision');
  expect(row).toBe('1,"a,""b""",true,/x,GET; PUT,read; guest,,,"x\ny",,f,0'.split('\r\n')[0]);
  expect(csv.startsWith('﻿')).toBe(false);
});
