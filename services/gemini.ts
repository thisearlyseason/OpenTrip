// FIX: The Schema type is not intended for direct import and use. The schema object can be defined without it.
import { GoogleGenAI, Type } from "@google/genai";
import { TripRequest, TripPlan, DayActivity, LiveContext, TripDay } from "../types";

const getAiClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

// FIX: Removed Schema type annotation.
const tripPlanSchema = {
  type: Type.OBJECT,
  properties: {
    tripTitle: { type: Type.STRING, description: "Location name followed by a clever subtitle. e.g. 'Paris: A Flâneur's Guide to Culinary Bliss'" },
    destinationSummary: { type: Type.STRING },
    tripDuration: { type: Type.STRING },
    travelVibe: { type: Type.STRING },
    intro: { type: Type.STRING },
    coverImagePrompt: { type: Type.STRING },
    importantContacts: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          role: { type: Type.STRING },
          name: { type: Type.STRING },
          phone: { type: Type.STRING },
          address: { type: Type.STRING }
        }
      }
    },
    days: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          dayNumber: { type: Type.INTEGER },
          date: { type: Type.STRING },
          theme: { type: Type.STRING },
          activities: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING, description: "A unique client-side identifier for the activity. Can be omitted." },
                time: { type: Type.STRING, description: "Time in 12-hour format with AM/PM (e.g., 9:00 AM, 2:30 PM)." },
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                type: { 
                  type: Type.STRING, 
                  enum: ['sightseeing', 'food', 'nature', 'relax', 'culture', 'shopping', 'transport', 'other', 'arrival', 'departure'] 
                },
                imageUrl: { type: Type.STRING, description: "A detailed, descriptive prompt for an Unsplash image that visually represents the activity. e.g., 'A cozy Parisian cafe with patrons enjoying croissants and coffee'." },
                location: { type: Type.STRING },
                address: { type: Type.STRING },
                website: { type: Type.STRING },
                contact: { type: Type.STRING },
                hours: { type: Type.STRING },
                searchQuery: { type: Type.STRING, description: "A succinct Google Search query to find more information, e.g., 'Eiffel Tower tickets'." },
                externalLink: { type: Type.STRING, description: "URL to purchase tickets or official website, especially for sports or events." },
                costEstimate: { type: Type.STRING },
                rating: { type: Type.NUMBER },
                reviewCount: { type: Type.INTEGER },
                transportToNext: {
                   type: Type.OBJECT,
                   properties: {
                      mode: { type: Type.STRING },
                      duration: { type: Type.STRING, description: "Accurate travel time between locations." },
                      description: { type: Type.STRING },
                      website: { type: Type.STRING },
                      distance: { type: Type.STRING },
                   }
                }
              },
              required: ['time', 'title', 'description', 'type'],
            },
          },
        },
        required: ['dayNumber', 'theme', 'activities'],
      },
    },
    metadata: {
        type: Type.OBJECT,
        properties: {
            flights: {
              type: Type.OBJECT,
              properties: {
                booked: { type: Type.BOOLEAN },
                legs: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      flightNumber: { type: Type.STRING },
                      departureAirport: { type: Type.STRING },
                      departureTime: { type: Type.STRING },
                      arrivalAirport: { type: Type.STRING },
                      arrivalTime: { type: Type.STRING },
                      confirmationNumber: { type: Type.STRING }
                    }
                  }
                }
              }
            },
            accommodation: {
              type: Type.OBJECT,
              properties: {
                booked: { type: Type.BOOLEAN },
                hotelName: { type: Type.STRING },
                address: { type: Type.STRING },
                checkIn: { type: Type.STRING },
                checkOut: { type: Type.STRING },
                confirmationNumber: { type: Type.STRING },
                contactInfo: { type: Type.STRING },
                wantsSuggestions: { type: Type.BOOLEAN }
              }
            },
            travelers: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING },
                adults: { type: Type.INTEGER },
                children: { type: Type.INTEGER },
                details: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      name: { type: Type.STRING },
                      age: { type: Type.STRING },
                      isChild: { type: Type.BOOLEAN }
                    }
                  }
                }
              }
            },
            dates: {
              type: Type.OBJECT,
              properties: {
                start: { type: Type.STRING },
                end: { type: Type.STRING },
                duration: { type: Type.INTEGER }
              }
            },
            transportModes: { type: Type.ARRAY, items: { type: Type.STRING } },
            interests: { type: Type.ARRAY, items: { type: Type.STRING } },
            dietary: { type: Type.ARRAY, items: { type: Type.STRING } },
            budget: { type: Type.NUMBER }
        }
    }
  },
  required: ['tripTitle', 'destinationSummary', 'tripDuration', 'travelVibe', 'intro', 'days', 'metadata'],
};

export const suggestVibes = async (destination: string, interests: string[]): Promise<string[]> => {
  const ai = getAiClient();
  const prompt = `Suggest 4 creative and evocative "trip vibes" for a trip to ${destination} with interests in ${interests.join(', ')}. JSON array of strings only.`;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { responseMimeType: 'application/json', responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } } }
    });
    return JSON.parse(response.text || '[]');
  } catch (error) { return ["Luxurious", "Adventurous", "Family Friendly", "Cultural"]; }
};

export const generateTripPlan = async (request: TripRequest): Promise<{ plan: TripPlan, groundingUrls: any[] }> => {
  const ai = getAiClient();
  const travelerDesc = request.travelers.details.map(t => `${t.name} (${t.isChild ? `Age ${t.age}` : 'Adult'})`).join(', ');
  const prompt = `
  You are Vesper, an elite AI travel consultant with the soul of a professional trip planner. Your task is to craft a hyper-personalized, realistic, and engaging travel itinerary based on the user's request. Your plans must be authentic, reliable, and inspiring.

  **CRITICAL DIRECTIVES:**
  1.  **DEEPLY PERSONALIZE:** Scrutinize every piece of user input—destination, vibe, budget, traveler details, interests, transport preferences, and must-includes. The itinerary MUST reflect these choices. For example, if the user specifies 'hiking' and 'local markets', these must be prominent activities.
  2.  **REALISTIC PACING & DURATION:** Do not just list places. Create a realistic flow. Allocate appropriate time for each activity (e.g., a major museum visit should be 2-3 hours, not 1 hour). Crucially, factor in the 'transportToNext' duration when scheduling the next event. Avoid packing the day too tightly; build in moments for relaxation and spontaneous discovery.
  3.  **RICH, DETAILED CONTENT:** Generate at least 4-6 high-quality activities per full day. For each activity:
      - Write a compelling 'description' that explains *why* this activity is a great choice for the user.
      - Provide a specific 'location' and 'address' where possible.
      - Generate a highly descriptive 'imageUrl' prompt suitable for an image service like Unsplash (e.g., "A vibrant, busy street food stall in Bangkok at night, cinematic lighting"). This is NOT a URL.
      - For 'transportToNext', provide accurate travel mode, duration, and a helpful description.
  4.  **BUDGET-CONSCIOUS PLANNING:** Adhere to the specified budget. The 'costEstimate' for activities should be realistic. Use "FREE" for no-cost activities.
  5.  **AUTHENTICITY & RELIABILITY:** Suggest a mix of famous landmarks and local hidden gems. Ensure the plan feels like it was made by a seasoned traveler, not just a list from a search engine.

  **USER REQUEST DETAILS:**
  - Destination: ${request.destination}
  - Vibe: "${request.vibe}"
  - Travelers: ${travelerDesc} (${request.travelers.adults} adults, ${request.travelers.children} children)
  - Dates: ${request.dates.start} to ${request.dates.end} (${request.dates.duration} days)
  - Budget: $${request.budget || 'Not specified'}
  - Interests: ${request.interests.join(', ')}
  - Must-Includes: ${request.mustIncludes.join(', ')}
  - Preferred Transport: ${request.transport.join(', ')}
  - Dietary Needs: ${request.dietary.join(', ')}

  **STRUCTURE REMINDERS:**
  - On the first day, include an 'arrival' type activity.
  - On the last day, include a 'departure' type activity.
  - Use 12-hour AM/PM time format.
  - For the main 'coverImagePrompt', provide a single, detailed prompt for a beautiful stock photo that encapsulates the entire trip's vibe.
  - Your entire response must be a single valid JSON object, without any surrounding text or markdown.
`;
  
  try {
    const response = await ai.models.generateContent({
      // FIX: Use gemini-3-pro-preview for complex travel reasoning as per task guidelines.
      model: 'gemini-3-pro-preview',
      contents: prompt,
      // FIX: Per @google/genai guidelines, responseMimeType and responseSchema should not be used with grounding tools like googleSearch.
      config: { tools: [{ googleSearch: {} }] },
    });
    
    // FIX: Per @google/genai guidelines, response.text is not guaranteed to be JSON when using grounding. Safely parsing.
    let parsedPlan = {};
    const text = response.text;
    if (text) {
      try {
        parsedPlan = JSON.parse(text);
      } catch (e) {
        const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
        if (jsonMatch && jsonMatch[1]) {
          try {
            parsedPlan = JSON.parse(jsonMatch[1]);
          } catch (parseError) {
            console.error("Failed to parse extracted JSON from trip plan:", parseError);
          }
        }
      }
    }
    return { plan: parsedPlan as TripPlan, groundingUrls: response.candidates?.[0]?.groundingMetadata?.groundingChunks || [] };
  } catch (error) { throw error; }
};

export const regenerateDayPlan = async (destination: string, vibe: string, dayNumber: number, existingDay: TripDay): Promise<TripDay> => {
  const ai = getAiClient();
  const prompt = `Smart Regenerate for Day ${dayNumber} in ${destination}. Current Vibe Engine™ setting: ${vibe}. 
  Generate a new set of activities for this day that are different from the current ones but still follow the vibe. 
  Maintain the 12h format and ensure logical travel flow. Return a single TripDay object as JSON.`;
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: (tripPlanSchema.properties!.days as any).items
      }
    });
    return JSON.parse(response.text || '{}');
  } catch (e) {
    return existingDay;
  }
};

export const fetchLiveContext = async (destination: string): Promise<LiveContext> => {
  const ai = getAiClient();
  const prompt = `Current weather, major news alerts, and trending local events for ${destination} today. Return a single valid JSON object only.`;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      // FIX: Per @google/genai guidelines, responseMimeType and responseSchema should not be used with grounding tools like googleSearch.
      config: {
        tools: [{ googleSearch: {} }],
      }
    });
    // FIX: Per @google/genai guidelines, response.text is not guaranteed to be JSON when using grounding. Safely parsing.
    const text = response.text || '{}';
    try {
      return JSON.parse(text);
    } catch (e) {
      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch && jsonMatch[1]) {
        try {
          return JSON.parse(jsonMatch[1]);
        } catch (parseError) {
          console.error("Failed to parse extracted JSON from live context:", parseError);
        }
      }
      return {};
    }
  } catch (e) { return {}; }
};

export const assistantChat = async (message: string, contextPlan: TripPlan): Promise<string> => {
  const ai = getAiClient();
  const chat = ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: { systemInstruction: `You are the PlanBuddy AI assistant. Helping user with their itinerary for ${contextPlan.tripTitle}. Keep it brief.` }
  });
  const response = await chat.sendMessage({ message });
  return response.text || "I'm here to help!";
};

export const getAlternativeActivities = async (destination: string, activity: DayActivity, dietary: string[]): Promise<DayActivity[]> => {
  const ai = getAiClient();
  const prompt = `3 alternatives for '${activity.title}' in ${destination}. Dietary: ${dietary.join(', ')}. Respond with a JSON array of activity objects only.`;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      // FIX: Per @google/genai guidelines, responseMimeType and responseSchema should not be used with grounding tools like googleSearch.
      config: { tools: [{ googleSearch: {} }] },
    });
    // FIX: Per @google/genai guidelines, response.text is not guaranteed to be JSON when using grounding. Safely parsing.
    const text = response.text || '[]';
    try {
      return JSON.parse(text);
    } catch (e) {
      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch && jsonMatch[1]) {
        try {
          return JSON.parse(jsonMatch[1]);
        } catch (parseError) {
          console.error("Failed to parse extracted JSON from alternatives:", parseError);
        }
      }
      return [];
    }
  } catch (e) { return []; }
};