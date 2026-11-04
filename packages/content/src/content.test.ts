import { describe, expect, it } from 'vitest';
import {
  cookiePolicy,
  faqs,
  pendingTodos,
  privacyPolicy,
  securityTxt,
  termsOfService,
} from './index';

describe('content', () => {
  it('has no unfilled placeholders on any page', () => {
    expect(pendingTodos()).toEqual([]);
    const all = privacyPolicy() + termsOfService() + cookiePolicy() + securityTxt(new Date());
    expect(all).not.toContain('TODO');
  });

  it('names the storage the web app really uses', () => {
    const cookies = cookiePolicy();
    for (const key of ['auth.access', 'auth.refresh', 'auth.deviceId', 'settings'])
      expect(cookies).toContain(key);
    expect(cookies).toMatch(/does not use advertising, analytics or tracking cookies/);
  });

  it('never claims certifications', () => {
    const all = privacyPolicy() + termsOfService();
    expect(all).not.toMatch(/SOC 2 (certified|compliant)|ISO 27001 certified|HIPAA compliant/i);
  });

  it('builds an RFC 9116 security.txt', () => {
    const txt = securityTxt(new Date('2027-01-01T00:00:00Z'));
    expect(txt).toMatch(/^Contact: mailto:/m);
    expect(txt).toContain('Expires: 2027-01-01T00:00:00.000Z');
  });

  it('has unique FAQ questions and some featured', () => {
    expect(new Set(faqs.map((f) => f.q)).size).toBe(faqs.length);
    expect(faqs.some((f) => f.featured)).toBe(true);
  });
});
