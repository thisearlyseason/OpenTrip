export type ActivityType = 'sightseeing' | 'food' | 'nature' | 'relax' | 'culture' | 'shopping' | 'transport' | 'other' | 'arrival' | 'departure';

export interface Traveler {
  id: string;
  name: string;
  age?: string;
  isChild: boolean;
}

export interface TravelerInfo {
  type: 'Solo' | 'Couple' | 'Family' | 'Friends';
  adults: number;
  children: number;
  details: Traveler[];
}

export interface FlightLeg {
  id: string;
  flightNumber: string;
  departureAirport: string;
  departureTime: string;
  arrivalAirport: string;
  arrivalTime: string;
  confirmationNumber?: string;
}

export interface FlightDetails {
  booked: boolean;
  legs: FlightLeg[];
}

export interface AccommodationDetails {
  booked: boolean;
  hotelName?: string;
  address?: string;
  checkIn?: string;
  checkOut?: string;
  confirmationNumber?: string;
  contactInfo?: string;
  wantsSuggestions?: boolean;
}

export interface TripRequest {
  destination: string;
  vibe: string;
  budget?: number;
  dates: {
    start: string;
    end: string;
    duration: number;
  };
  timePreference: {
    start: string;
    end: string;
  };
  flight: FlightDetails;
  travelers: TravelerInfo;
  transport: string[];
  interests: string[];
  mustIncludes: string[];
  accommodation: AccommodationDetails;
  dietary: string[];
}

export interface TransportDetail {
  mode: string;
  duration?: string;
  description?: string;
  website?: string;
  distance?: string;
}

export interface DayActivity {
  id: string;
  time: string;
  title: string;
  description: string;
  type: ActivityType;
  imageUrl?: string;
  location?: string;
  address?: string; 
  website?: string; 
  contact?: string; 
  hours?: string; 
  searchQuery?: string;
  externalLink?: string;
  costEstimate?: string;
  rating?: number;
  reviewCount?: number;
  transportToNext?: TransportDetail; 
}

export interface TripDay {
  dayNumber: number;
  date?: string;
  theme: string;
  activities: DayActivity[];
  foodSpot?: string; 
  foodDescription?: string;
}

export interface ContactEntry {
  role: string;
  name: string;
  phone: string;
  address?: string;
}

export interface TripPlan {
  tripTitle: string; 
  destinationSummary: string;
  tripDuration: string;
  travelVibe: string;
  intro: string;
  coverImagePrompt?: string;
  importantContacts: ContactEntry[];
  days: TripDay[];
  metadata: {
      flights: FlightDetails;
      accommodation: AccommodationDetails;
      travelers: TravelerInfo;
      dates: { start: string; end: string; duration: number };
      transportModes: string[];
      interests: string[];
      dietary: string[];
      budget?: number;
  };
  // PlanBuddy Extensions
  budget?: {
    total: number;
    expenses: Array<{ id: string; category: string; amount: number; description: string }>;
  };
  collaboration?: {
    comments: Array<{ id: string; author: string; text: string; timestamp: number; activityId?: string }>;
    votes: Record<string, number>;
  };
  // Gating & Rewind Extensions
  tier?: 'free' | 'pro';
  historyStack?: string[]; // Stores stringified versions of previous plans
}

export interface LiveContext {
  weather?: { temp: string; condition: string; icon: string };
  alerts?: string[];
  events?: Array<{ title: string; time: string; location: string }>;
}

export interface ShareConfig {
  isShared: boolean;
  accessLevel: 'view' | 'edit';
  ownerName?: string;
}