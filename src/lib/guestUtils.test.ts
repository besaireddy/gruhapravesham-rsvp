import { describe, expect, it } from 'vitest';
import {
  buildInviteMessage,
  buildThankYouMessage,
  findDuplicateGuestByName,
  formatDisplayUsPhoneNumber,
  formatEditableUsPhoneNumber,
  formatUsPhoneNumber,
  getDashboardStats,
  getMessagePreview,
  matchesGuestSearch,
  normalizeGuestName,
  normalizeUsPhoneNumber,
  validateRsvpSubmission
} from './guestUtils';

describe('guestUtils', () => {
  it('normalizes guest names for duplicate detection', () => {
    expect(normalizeGuestName(' Meghana   Iyer ')).toBe('meghanaiyer');
    expect(normalizeGuestName('Meghana-Iyer')).toBe('meghanaiyer');
  });

  it('formats and normalizes US phone numbers', () => {
    expect(formatUsPhoneNumber('6026427380')).toBe('(602) 642-7380');
    expect(normalizeUsPhoneNumber('(602) 642-7380')).toBe('+16026427380');
    expect(formatEditableUsPhoneNumber('+16026427380')).toBe('(602) 642-7380');
    expect(formatDisplayUsPhoneNumber('+16026427380')).toBe('+1 (602) 642-7380');
  });

  it('matches flexible guest searches across multiple name combinations', () => {
    const guest = { name: 'Meghana Iyer', phone: '+16026427380' };

    expect(matchesGuestSearch(guest, 'Meghana Iyer')).toBe(true);
    expect(matchesGuestSearch(guest, 'Meghana')).toBe(true);
    expect(matchesGuestSearch(guest, 'Iyer')).toBe(true);
    expect(matchesGuestSearch(guest, 'meghanaiyer')).toBe(true);
    expect(matchesGuestSearch(guest, '602642')).toBe(true);
    expect(matchesGuestSearch(guest, 'Someone Else')).toBe(false);
  });

  it('validates RSVP submission rules', () => {
    expect(validateRsvpSubmission({ name: ' ', status: 'attending', adults: 1, children: 0 })).toBe('Please enter your full name.');
    expect(validateRsvpSubmission({ name: 'Meghana', status: 'attending', adults: 0, children: 0 })).toBe('Please select at least one guest.');
    expect(validateRsvpSubmission({ name: 'Meghana', status: 'attending', adults: 1, children: 0, isInvalidInviteLink: true })).toBe(
      'This RSVP link is invalid. Please use the link shared with you by the host.'
    );
    expect(validateRsvpSubmission({ name: 'Meghana', status: 'declined', adults: 0, children: 0 })).toBeNull();
  });

  it('finds duplicate guests by normalized name', () => {
    const guests = [
      { id: '1', name: 'Meghana Iyer', normalizedName: 'meghanaiyer' },
      { id: '2', name: 'Sai Reddy', normalizedName: 'saireddy' }
    ];

    expect(findDuplicateGuestByName(guests, ' Meghana-Iyer ')).toMatchObject({ id: '1' });
    expect(findDuplicateGuestByName(guests, 'Meghana Iyer', '1')).toBeNull();
  });

  it('builds invite and thank-you messages with the expected content', () => {
    const invite = buildInviteMessage('Meghana', 'April 26th, Sunday', 'Naveen & Priyanka', 'abc123', 'https://example.com');
    const thanks = buildThankYouMessage('Meghana', 'Naveen & Priyanka');

    expect(invite).toContain('Dear Meghana');
    expect(invite).toContain('https://example.com?guestId=abc123');
    expect(thanks).toContain('Thank you so much for joining us');
  });

  it('builds one-line message previews', () => {
    const preview = getMessagePreview('Dear Meghana,\n\nPlease join us for lunch.\nWith love');
    expect(preview).toBe('Dear Meghana, Please join us for lunch.');
  });

  it('calculates dashboard stats from RSVP records', () => {
    const stats = getDashboardStats([
      { id: '1', status: 'attending', adults: 2, children: 1, invited: true },
      { id: '2', status: 'declined', adults: 0, children: 0, invited: true },
      { id: '3', status: 'pending', adults: 0, children: 0, invited: true },
      { id: '4', status: 'pending', adults: 0, children: 0, invited: false }
    ]);

    expect(stats).toEqual({
      total: 3,
      attending: 1,
      declined: 1,
      pending: 1,
      adults: 2,
      children: 1,
      totalPeopleAttending: 3
    });
  });
});
