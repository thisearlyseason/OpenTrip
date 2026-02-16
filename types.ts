export type ActivityType = 'sightseeing' | 'food' | 'nature' | 'relax' | 'culture' | 'shopping' | 'transport' | 'other' | 'arrival' | 'departure' | 'flight' | 'hotel-checkin' | 'hotel-checkout' | 'meal';

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
  airline?: string;
  flightNumber: string;
  departureAirport: string;
  departureDate: string;
  departureTime: string;
  arrivalAirport: string;
  arrivalDate: string;
  arrivalTime: string;
  confirmationNumber?: string;
  cost?: number;
  actualSpent?: number;
}

export interface FlightDetails {
  booked: boolean;
  legs: FlightLeg[];
}

export interface AccommodationDetails {
  id: string;
  booked: boolean;
  hotelName?: string;
  roomType?: string;
  address?: string;
  lat?: number;
  lng?: number;
  checkInDate?: string;
  checkInTime?: string;
  checkOutDate?: string;
  checkOutTime?: string;
  confirmationNumber?: string;
  contactInfo?: string;
  cost?: number;
  actualSpent?: number;
}

export interface Receipt {
  id: string;
  category: 'flight' | 'hotel' | 'food' | 'activity' | 'other' | 'transport';
  title: string;
  vendor: string;
  date: string;
  amount: number;
  fileData: string; // base64 string
  fileName: string;
  fileType: string;
  activityId?: string; // Linked activity
}

export interface TripRequest {
  destination: string;
  vibe: string[];
  budget?: number;
  budgetType: 'total' | 'perPerson';
  currency: string;
  flightBudget?: number;
  includeFlightBudget: boolean;
  hotelBudget?: number;
  includeHotelBudget: boolean;
  transportBudget?: number;
  includeTransportBudget: boolean;
  dates: {
    start: string;
    end: string;
    duration: number;
  };
  timePreference: {
    start: string;
    end: string;
  };
  activityPreference?: string;
  flight: FlightDetails;
  travelers: TravelerInfo;
  transport: string[];
  interests: string[];
  mustIncludes: string[];
  accommodations: AccommodationDetails[];
  dietary: string[];
  foodPreferences: string[];
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
  location?: string;
  lat?: number;
  lng?: number;
  website?: string; 
  phone?: string;
  priceLevel?: string; 
  cost?: number; 
  actualSpent?: number;
  rating?: number;
  reviewCount?: string;
  dayNumber?: number;
  meta?: {
    flightNumber?: string;
    airline?: string;
    departureAirport?: string;
    arrivalAirport?: string;
    departureTime?: string;
    arrivalTime?: string;
    address?: string;
    ctaType?: 'Buy Tickets' | 'View Event' | 'Call Company' | 'Book a Table';
    legs?: FlightLeg[];
  };
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

export interface TripPlan {
  id: string; 
  tripTitle: string; 
  destinationSummary: string;
  tripDuration: string;
  travelVibe: string;
  intro: string;
  currency: string;
  importantContacts: Array<{ role: string; name: string; phone: string }>;
  days: TripDay[];
  receipts?: Receipt[];
  createdAt: number; 
  transportResources?: Array<{ name: string; contact: string; notes: string }>;
  metadata: {
      flights: FlightDetails;
      accommodations: AccommodationDetails[];
      travelers: TravelerInfo;
      dates: { start: string; end: string; duration: number };
      budget?: number;
      budgetType?: 'total' | 'perPerson';
      timePreference?: { start: string; end: string };
      activityPreference?: string;
  };
  collaboration?: {
    comments: Array<{ id: string; author: string; text: string; timestamp: number }>;
  };
  budgetOverrides?: {
      flightCost?: number;
      actualFlightSpent?: number;
      accommodationCost?: number;
      actualAccommodationSpent?: number;
      transportCost?: number;
      actualTransportSpent?: number;
      activityCosts?: Record<string, number>;
      actualActivitySpent?: Record<string, number>;
      includeFlight?: boolean;
      includeAccommodation?: boolean;
      includeTransport?: boolean;
  };
}

export interface LiveContext {
  weather?: { temp: string; condition: string; icon: string };
  events?: Array<{ title: string; time: string; location: string }>;
}