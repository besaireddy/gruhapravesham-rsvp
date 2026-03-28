import { describe, expect, it } from 'vitest';
import { ADMIN_EMAILS, isAuthorizedAdmin } from './adminUtils';

describe('adminUtils', () => {
  it('authorizes only approved admin emails', () => {
    expect(ADMIN_EMAILS.length).toBeGreaterThan(0);
    expect(isAuthorizedAdmin('bsaireddy05@gmail.com')).toBe(true);
    expect(isAuthorizedAdmin('someone@example.com')).toBe(false);
    expect(isAuthorizedAdmin(undefined)).toBe(false);
  });
});
