
export type ActivityType = 'sightseeing' | 'food' | 'nature' | 'relax' | 'culture' | 'shopping' | 'transport' | 'other' | 'arrival' | 'departure';

export interface Traveler {
  id: string;
  name: string;
  age?: string;
  isChild: boolean;
}

export interface TravelerInfo {
  type: 'Solo' | 'Couple' | 'Family' | 'Friends' | 'Custom';
  adults: number;
  children: number;
  details: Traveler[];
}

export interface FlightLeg {
  id: string;
  flightNumber: string;
  departureAirport: string;
  departureDate: string;
  departureTime: string;
  arrivalAirport: string;
  arrivalDate: string;
  arrivalTime: string;
  confirmationNumber?: string;
}

export interface FlightDetails {
  booked: boolean;
  legs: FlightLeg[];
}

export interface AccommodationDetails {
  id: string;
  booked: boolean;
  hotelName?: string;
  address?: string;
  lat?: number;
  lng?: number;
  checkInDate?: string;
  checkInTime?: string;
  checkOutDate?: string;
  checkOutTime?: string;
  confirmationNumber?: string;
  contactInfo?: string;
  cost?: string;
}

export interface Receipt {
  id: string;
  category: 'flight' | 'hotel' | 'food' | 'activity' | 'other';
  title: string;
  vendor: string;
  date: string;
  amount?: number;
  fileData: string; // base64 string for local storage
  fileName: string;
  fileType: string; // mime type
}

export interface TripRequest {
  destination: string;
  vibe: string[];
  budget?: number;
  budgetType: 'total' | 'perPerson';
  flightBudget?: number;
  includeFlightBudget: boolean;
  hotelBudget?: number;
  includeHotelBudget: boolean;
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
  accommodations: AccommodationDetails[];
  dietary: string[];
  foodPreferences: string[];
}

export interface TransportResource {
  type: string;
  name: string;
  contact: string;
  notes?: string;
}

export interface DayActivity {
  id: string;
  time: string;
  durationMinutes: number;
  title: string;
  description: string;
  type: ActivityType;
  imagePrompt?: string;
  imageUrl?: string;
  additionalImages?: string[];
  location?: string;
  address?: string;
  lat?: number;
  lng?: number;
  website?: string; 
  contact?: string; 
  costEstimate?: string;
  rating?: number;
  reviewCount?: string;
  priceLevel?: string; // e.g. "$25 - $45 pp"
  openingHoursToday?: string;
  statusLabel?: string; // e.g. "Ticket required"
  transportToNext?: {
    mode: string;
    duration?: string;
    description?: string;
    cost?: string;
  }; 
}

export interface TripDay {
  dayNumber: number;
  theme: string;
  summary: string; 
  activities: DayActivity[];
}

export interface ContactEntry {
  role: string;
  name: string;
  phone: string;
  address?: string;
}

export interface TripPlan {
  id: string; 
  tripTitle: string; 
  destinationSummary: string;
  tripDuration: string;
  travelVibe: string;
  intro: string;
  coverImagePrompt?: string;
  importantContacts: ContactEntry[];
  transportResources?: TransportResource[]; 
  days: TripDay[];
  receipts?: Receipt[];
  createdAt: number; 
  metadata: {
      flights: FlightDetails;
      accommodations: AccommodationDetails[];
      travelers: TravelerInfo;
      dates: { start: string; end: string; duration: number };
      transportModes: string[];
      interests: string[];
      dietary: string[];
      foodPreferences: string[];
      budget?: number;
      budgetType?: 'total' | 'perPerson';
      timePreference?: { start: string; end: string; };
  };
  budgetOverrides?: {
      flightCost?: number;
      accommodationCost?: number;
      activityCosts?: Record<string, number>;
      includeFlight?: boolean;
      includeAccommodation?: boolean;
  };
  tier?: string;
  collaboration?: {
    comments: Array<{
      id: string;
      author: string;
      text: string;
      timestamp: number;
    }>;
  };
}

export interface LiveContext {
  weather?: { temp: string; condition: string; icon: string };
  events?: Array<{ title: string; time: string; location: string }>;
}
