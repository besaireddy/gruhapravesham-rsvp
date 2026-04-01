export type GuestStatus = 'attending' | 'declined' | 'pending';

export interface GuestRecordLike {
  id: string;
  name?: string;
  phone?: string;
  status?: GuestStatus;
  adults?: number;
  children?: number;
  message?: string;
  invited?: boolean;
  reminded?: boolean;
  thanked?: boolean;
  normalizedName?: string;
}

export function normalizeGuestName(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ').replace(/[^a-z0-9]/g, '');
}

export function normalizeSearchValue(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function formatUsPhoneNumber(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export function normalizeUsPhoneNumber(value: string) {
  const digits = value.replace(/\D/g, '');
  return digits.length === 10 ? `+1${digits}` : value;
}

export function formatEditableUsPhoneNumber(value: string) {
  const digits = value.replace(/\D/g, '');
  const localDigits = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
  return formatUsPhoneNumber(localDigits);
}

export function formatDisplayUsPhoneNumber(value: string) {
  const digits = value.replace(/\D/g, '');
  const localDigits = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
  return localDigits ? `+1 ${formatUsPhoneNumber(localDigits)}` : '';
}

export function buildInviteMessage(name: string, eventDate: string, hostName: string, guestId: string, origin: string) {
  return `Dear ${name},\n\nWith joy in our hearts, we are stepping into our new home and would be delighted to celebrate this special occasion with you. Please join us for our Gruhapravesham (Housewarming Ceremony) on ${eventDate}.\n\nYour presence would mean a lot to us.\n\nKindly RSVP here:\n${origin}?guestId=${guestId}\n\nWith love,\n${hostName}`;
}

export function buildThankYouMessage(name: string, hostName: string) {
  return `Hi ${name}!\n\nThank you so much for joining us for our Gruhapravesham (Housewarming Ceremony). Your presence made the day even more special for us.\n\nWith love,\n${hostName}`;
}

export function buildReminderMessage(name: string, eventDate: string, hostName: string, guestId: string, origin: string) {
  return `Dear ${name},\n\nOur Gruhapravesham (Housewarming Ceremony) is coming up on ${eventDate}, and we would be so happy to celebrate with you. If you have not had a chance to respond yet, please share your RSVP here:\n${origin}?guestId=${guestId}\n\nWith love,\n${hostName}`;
}

export function getMessagePreview(message: string) {
  return message
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 2)
    .join(' ');
}

export function matchesGuestSearch(guest: Pick<GuestRecordLike, 'name' | 'phone'>, search: string) {
  const searchTerm = search.trim().toLowerCase();
  const normalizedSearchTerm = normalizeSearchValue(search);
  const name = guest.name || '';
  const lowerName = name.toLowerCase();
  const nameParts = lowerName.split(/\s+/).filter(Boolean);
  const normalizedName = normalizeSearchValue(name);
  const phone = guest.phone || '';
  const digitsOnlyPhone = phone.replace(/\D/g, '');
  const normalizedPhoneSearch = search.replace(/\D/g, '');

  return (
    lowerName.includes(searchTerm) ||
    nameParts.some((part) => part.includes(searchTerm)) ||
    normalizedName.includes(normalizedSearchTerm) ||
    phone.includes(search) ||
    (normalizedPhoneSearch ? digitsOnlyPhone.includes(normalizedPhoneSearch) : false)
  );
}

export function validateRsvpSubmission(input: {
  name: string;
  status: 'attending' | 'declined';
  adults: number;
  children: number;
  isInvalidInviteLink?: boolean;
}) {
  if (!input.name.trim()) return 'Please enter your full name.';
  if (input.isInvalidInviteLink) return 'This RSVP link is invalid. Please use the link shared with you by the host.';
  if (input.status === 'attending' && input.adults + input.children === 0) {
    return 'Please select at least one guest.';
  }
  return null;
}

export function findDuplicateGuestByName(guests: GuestRecordLike[], name: string, activeGuestId?: string | null) {
  const normalizedName = normalizeGuestName(name);
  if (!normalizedName) return null;

  return guests.find((guest) => {
    if (activeGuestId && guest.id === activeGuestId) return false;
    const candidate = guest.normalizedName || normalizeGuestName(guest.name || '');
    return candidate === normalizedName;
  }) || null;
}

export function getDashboardStats(guests: GuestRecordLike[]) {
  const attending = guests.filter((guest) => guest.status === 'attending');
  const declined = guests.filter((guest) => guest.status === 'declined');
  const pending = guests.filter((guest) => guest.invited && guest.status === 'pending');

  const adults = attending.reduce((total, guest) => total + (guest.adults || 0), 0);
  const children = attending.reduce((total, guest) => total + (guest.children || 0), 0);

  return {
    total: attending.length + declined.length + pending.length,
    attending: attending.length,
    declined: declined.length,
    pending: pending.length,
    adults,
    children,
    totalPeopleAttending: adults + children
  };
}
