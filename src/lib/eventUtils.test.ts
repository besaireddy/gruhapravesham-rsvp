import { describe, expect, it } from 'vitest';
import { formatCalendarDate, formatDateForGoogleCalendar, hasEventPassed, parseConfiguredEventDate } from './eventUtils';

describe('eventUtils', () => {
  it('parses configured event dates with and without explicit year', () => {
    const withYear = parseConfiguredEventDate('April 26th, Sunday 2026');
    const withoutYear = parseConfiguredEventDate('April 26th, Sunday', 2026);

    expect(withYear.getFullYear()).toBe(2026);
    expect(withYear.getMonth()).toBe(3);
    expect(withYear.getDate()).toBe(26);
    expect(withoutYear.getFullYear()).toBe(2026);
  });

  it('formats event dates for display and Google Calendar links', () => {
    const date = new Date(2026, 3, 26, 5, 0, 0);
    expect(formatCalendarDate(date)).toContain('April');
    expect(formatDateForGoogleCalendar(date)).toBe('20260426T050000');
  });

  it('detects whether the event date has passed', () => {
    expect(hasEventPassed('April 26th, Sunday 2026', new Date('2026-04-27T00:00:00'))).toBe(true);
    expect(hasEventPassed('April 26th, Sunday 2026', new Date('2026-04-25T23:59:59'))).toBe(false);
  });
});
