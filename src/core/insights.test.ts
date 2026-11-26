import { describe, it, expect } from 'vitest';
import { editDistance, suspiciousScopes } from './insights';

describe('editDistance', () => {
  it('counts insertions/substitutions', () => {
    expect(editDistance('read-corporate', 'read-corporrate')).toBe(1);
    expect(editDistance('account_verify_identity', 'account_verify_identit')).toBe(1);
    expect(editDistance('abc', 'abc')).toBe(0);
  });
});

describe('suspiciousScopes', () => {
  const counts = new Map([['read', 1500], ['read-corporate', 231], ['read-corporrate', 1], ['guest', 142], ['guest-web', 11], ['signup_otp', 4], ['reset_otp', 5], ['(no scope check)', 186]]);
  it('flags rare near-duplicates of a much more common scope', () =>
    expect(suspiciousScopes(counts)).toEqual([{ scope: 'read-corporrate', likely: 'read-corporate', count: 1 }]));
  it('ignores short scopes and similar-frequency pairs', () =>
    expect(suspiciousScopes(new Map([['read', 1], ['reed', 100], ['reset-otp', 5], ['reset_otp', 6]]))).toEqual([]));
});

import { isTestApi } from './insights';
describe('isTestApi', () => {
  it.each([
    ['Sample Test', '/sample/test'], ['testjwt', '/testjwt'], ['Test_JDBC', '/Test_JDBC'], ['socket test', '/sockettest'],
    ['POC DMP', '/poc/dmp'], ['poc-block', '/poc-block'], ['mock backend', '/mock/backend'], ['V1 Test Payment Domain', '/v1/test-payment-domain'],
    ['V2 Logintouch Refresh POC', '/v2/logintouch/refresh/poc'],
  ])('%s is a test API', (n, u) => expect(isTestApi(n, u)).toBe(true));
  it.each([
    ['V1 Loans Applications Latest', '/v1/loans/applications/latest'],
    ['Attestation', '/v1/attest'], ['Contest', '/v1/contest'], ['Orders', '/v2/orders/item/details'], ['Epoch', '/v1/epoch'],
  ])('%s is not a test API', (n, u) => expect(isTestApi(n, u)).toBe(false));
});

import { urlPatternIssues, markUrlIssues, URL_ISSUES } from './insights';
import { svc } from './testutil';
describe('urlPatternIssues', () => {
  it.each([
    ['/v1/mutualfunds/cancel', []],
    ['/v1/funds/*', []],
    ['', ['empty']],
    ['  ', ['empty', 'whitespace']],
    ['/v1/mutual funds/details', ['whitespace']],
    [' /v1/funds', ['whitespace']],
    ['/v1/funds ', ['whitespace']],
    ['/v1/funds\t', ['whitespace']],
    ['v1/funds', ['no-leading-slash']],
    ['/v1//funds', ['double-slash']],
    ['/v1/funds/', ['trailing-slash']],
    ['/v1/funds"', ['odd-chars']],
    ['/Test_JDBC', ['uppercase']],
  ])('%j -> %j', (p, want) => expect(urlPatternIssues(p)).toEqual(want));
});
describe('markUrlIssues', () => {
  it('flags enabled APIs that share a pattern, ignoring disabled ones', () => {
    const list = markUrlIssues([
      svc({ id: 'a', urlPattern: '/v1/x' }), svc({ id: 'b', urlPattern: '/v1/x' }),
      svc({ id: 'c', urlPattern: '/v1/y' }), svc({ id: 'd', urlPattern: '/v1/y', enabled: false }),
    ]);
    expect(list.map((s) => s.urlIssues)).toEqual([[URL_ISSUES.duplicate], [URL_ISSUES.duplicate], [], []]);
  });
});
