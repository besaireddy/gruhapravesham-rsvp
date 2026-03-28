export interface EventDetails {
  id: string;
  title: string;
  date: string; // ISO string
  location: string;
  address: string;
  description: string;
  hostName: string;
  mapUrl?: string;
}

export interface GuestRSVP {
  id: string;
  name: string;
  email: string;
  guestsCount: number;
  status: 'attending' | 'maybe' | 'declined';
  dietaryRestrictions?: string;
  message?: string;
  createdAt: string;
}
