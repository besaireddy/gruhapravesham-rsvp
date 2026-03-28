export const DEFAULT_EVENT_FALLBACK = new Date(2026, 3, 26, 5, 0, 0);

const monthMap: Record<string, number> = {
  january: 0,
  february: 1,
  march: 2,
  april: 3,
  may: 4,
  june: 5,
  july: 6,
  august: 7,
  september: 8,
  october: 9,
  november: 10,
  december: 11
};

export function parseConfiguredEventDate(eventDateText: string, fallbackYear = new Date().getFullYear()) {
  const raw = eventDateText.toLowerCase();
  const monthEntry = Object.entries(monthMap).find(([name]) => raw.includes(name));
  const dayMatch = raw.match(/(\d{1,2})(st|nd|rd|th)?/);
  const yearMatch = raw.match(/\b(20\d{2})\b/);

  if (!monthEntry || !dayMatch) {
    return new Date(DEFAULT_EVENT_FALLBACK);
  }

  const [, monthIndex] = monthEntry;
  const day = Number(dayMatch[1]);
  const year = yearMatch ? Number(yearMatch[1]) : fallbackYear;

  return new Date(year, monthIndex, day, 5, 0, 0);
}

export function formatCalendarDate(date: Date) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(date);
}

export function formatDateForGoogleCalendar(date: Date) {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(date.getMinutes())}00`;
}

export function hasEventPassed(eventDateText: string, now = new Date()) {
  const eventDate = parseConfiguredEventDate(eventDateText, now.getFullYear());
  const eventEnd = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate(), 23, 59, 59, 999);
  return now > eventEnd;
}

