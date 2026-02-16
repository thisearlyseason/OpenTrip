import { GoogleGenAI, Type } from "@google/genai";
import { TripRequest, TripPlan, DayActivity, LiveContext, TripDay } from "../types";

const getAi = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

const STRICT_JSON_SCHEMA = `
{
  "tripTitle": "string",
  "destinationSummary": "string",
  "tripDuration": "string",
  "travelVibe": "string",
  "intro": "string",
  "days": [
    {
      "dayNumber": number,
      "theme": "string",
      "summary": "string",
      "activities": [
        {
          "id": "string",
          "time": "string (24h format)",
          "durationMinutes": number,
          "title": "string",
          "description": "string",
          "type": "sightseeing|food|nature|relax|culture|shopping|transport|flight|hotel-checkin|hotel-checkout|meal",
          "location": "string",
          "lat": number,
          "lng": number,
          "website": "string",
          "phone": "string",
          "cost": number,
          "actualSpent": 0,
          "rating": number,
          "imagePrompt": "string",
          "transportToNext": {
            "mode": "string (e.g., Subway, Uber, Walking)",
            "duration": "string (e.g., 20m)",
            "cost": "string (e.g., $5)"
          },
          "meta": {
            "ctaType": "Buy Tickets|View Event|Call Company|Book a Table",
            "airline": "string",
            "flightNumber": "string",
            "departureAirport": "string",
            "arrivalAirport": "string",
            "departureTime": "string",
            "arrivalTime": "string",
            "address": "string",
            "legs": [
              {
                "airline": "string",
                "flightNumber": "string",
                "departureAirport": "string",
                "arrivalAirport": "string",
                "departureTime": "string",
                "arrivalTime": "string"
              }
            ]
          }
        }
      ]
    }
  ],
  "transportResources": [
     { "name": "string", "contact": "string", "notes": "string" }
  ]
}
`;

const parseJsonFromText = (text: string) => {
  const codeBlockMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
  let cleanedText = codeBlockMatch ? codeBlockMatch[1] : text;
  cleanedText = cleanedText.replace(/\[\d+\]/g, '');

  try {
    const firstBrace = cleanedText.indexOf('{');
    const lastBrace = cleanedText.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      return JSON.parse(cleanedText.substring(firstBrace, lastBrace + 1));
    }
    return JSON.parse(cleanedText);
  } catch (e) {
    console.error("JSON Parsing Error:", text);
    throw new Error("AI returned unreadable data. Please try again.");
  }
};

export const generateImage = async (prompt: string, aspectRatio: '1:1' | '3:4' | '4:3' | '16:9' | '9:16' = '4:3'): Promise<string> => {
  try {
    const ai = getAi();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: `${prompt}. Breathtaking professional travel photography, highly detailed, cinematic lighting. ABSOLUTELY NO watermarks, NO text, NO overlays, NO logos, NO signatures, NO brand names. Clear, clean image.` }] },
      config: { imageConfig: { aspectRatio } },
    });
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&q=80';
  } catch {
    return 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&q=80';
  }
};

export const generateTripPlan = async (request: TripRequest): Promise<{ plan: TripPlan, groundingUrls: any[] }> => {
  const ai = getAi();
  
  const accommodationsText = request.accommodations.length > 0 
    ? request.accommodations.map(a => `${a.hotelName} (Address: ${a.address || 'Unknown'}, In: ${a.checkInDate} @ ${a.checkInTime}, Out: ${a.checkOutDate} @ ${a.checkOutTime})`).join('; ')
    : "No hotels provided by user.";

  const flightText = request.flight.legs.length > 0
    ? request.flight.legs.map(l => `Flight ${l.airline} ${l.flightNumber} from ${l.departureAirport} to ${l.arrivalAirport} at ${l.departureTime} on ${l.departureDate}`).join('; ')
    : "No flights provided.";

  const prompt = `Act as an Expert Travel Planner.
  Dates: ${request.dates.start} to ${request.dates.end}.
  Location: ${request.destination}.
  Currency: ${request.currency}.
  Budget: ${request.budget} ${request.currency} (${request.budgetType}).
  Group: ${request.travelers.adults}A, ${request.travelers.children}C.
  Vibe: ${request.vibe.join(', ')}.
  Must Includes: ${request.mustIncludes.join(', ')}.
  Transit Preference: ${request.transport.join(', ')}.
  User-Provided Accommodations: ${accommodationsText}
  User-Provided Flights: ${flightText}

  DAILY STRUCTURE INSTRUCTIONS (STRICT):
  1. DAY ONE START: If a flight departure is provided, it MUST be the very first activity in Day 1.
  2. LAST DAY END: If a flight return is provided, it MUST be the very last activity on the final day.
  3. HOTEL SANDWICH: Every day MUST start and end at the hotel (except for initial arrival and final departure flights).
  4. FLIGHTS ARE ACTIVITIES: You MUST include flight departures and arrivals as actual activity items in the "activities" array for the specific day they occur. Mark them with "type": "flight".
  5. FILL THE TIMEFRAME: The user wants to be busy from ${request.timePreference.start} to ${request.timePreference.end}.
  6. TRANSIT: suggest mode between EVERY activity in "transportToNext".
  7. LOCAL TRANSIT DATA: Provide 10 local transport resources (taxi companies, apps) with names and contact info.
  8. JSON SCHEMA: ${STRICT_JSON_SCHEMA}.
  9. IMPORTANT: Set realistic "cost" values for all activities. Set "actualSpent" to 0 for all generated activities.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: { 
        tools: [{ googleSearch: {} }],
        thinkingConfig: { thinkingBudget: 15000 }
      },
    });
    
    const plan = parseJsonFromText(response.text || '') as TripPlan;
    plan.currency = request.currency;
    plan.metadata = { 
      ...plan.metadata, 
      flights: request.flight, 
      accommodations: request.accommodations, 
      travelers: request.travelers, 
      dates: request.dates, 
      budget: request.budget, 
      budgetType: request.budgetType,
      timePreference: request.timePreference
    };
    plan.createdAt = Date.now();
    return { plan, groundingUrls: response.candidates?.[0]?.groundingMetadata?.groundingChunks || [] };
  } catch (error) {
    const fallback = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });
    const plan = parseJsonFromText(fallback.text || '') as TripPlan;
    plan.currency = request.currency;
    return { plan, groundingUrls: [] };
  }
};

export const assistantChat = async (message: string, plan: TripPlan): Promise<string> => {
  const ai = getAi();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Context: Trip to ${plan.destinationSummary}. User: ${message}`,
  });
  return response.text || "I'm thinking...";
};

export const getTailoredInterests = async (destination: string): Promise<string[]> => {
  try {
    const ai = getAi();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `List 15 specific local travel interests for ${destination}. Comma separated.`,
    });
    return (response.text || "").split(',').map(i => i.trim());
  } catch { return ["Food", "History", "Nature"]; }
};

export const fetchLiveContext = async (destination: string): Promise<LiveContext> => {
  const ai = getAi();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Get current weather and upcoming events for ${destination}. Return JSON.`,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            weather: {
              type: Type.OBJECT,
              properties: {
                temp: { type: Type.STRING },
                condition: { type: Type.STRING },
                icon: { type: Type.STRING }
              }
            },
            events: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  time: { type: Type.STRING },
                  location: { type: Type.STRING }
                }
              }
            }
          }
        }
      }
    });
    return JSON.parse(response.text || '{}');
  } catch (e) {
    console.error("fetchLiveContext error:", e);
    return {};
  }
};

export const regenerateDayPlan = async (destination: string, vibe: string, dayNumber: number, currency: string): Promise<TripDay> => {
  const ai = getAi();
  const prompt = `Regenerate the itinerary for Day ${dayNumber} of a trip to ${destination} with a ${vibe} vibe. Currency: ${currency}. Return JSON.`;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            dayNumber: { type: Type.NUMBER },
            theme: { type: Type.STRING },
            summary: { type: Type.STRING },
            activities: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  time: { type: Type.STRING },
                  durationMinutes: { type: Type.NUMBER },
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  type: { type: Type.STRING },
                  location: { type: Type.STRING },
                  cost: { type: Type.NUMBER },
                  imagePrompt: { type: Type.STRING }
                }
              }
            }
          }
        }
      }
    });
    return JSON.parse(response.text || '{}');
  } catch (e) {
    console.error("regenerateDayPlan error:", e);
    throw new Error("Failed to regenerate day plan.");
  }
};

export const regenerateSingleActivity = async (activity: DayActivity, destination: string, vibe: string): Promise<DayActivity> => {
  const ai = getAi();
  const prompt = `Provide an alternative travel activity for ${destination} based on this current one: ${activity.title} (${vibe} vibe). Return JSON.`;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            time: { type: Type.STRING },
            durationMinutes: { type: Type.NUMBER },
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            type: { type: Type.STRING },
            location: { type: Type.STRING },
            cost: { type: Type.NUMBER },
            imagePrompt: { type: Type.STRING }
          }
        }
      }
    });
    return JSON.parse(response.text || '{}');
  } catch (e) {
    return activity;
  }
};

export const generateActivityFromPrompt = async (userPrompt: string, destination: string, vibe: string, currency: string): Promise<DayActivity[]> => {
  const ai = getAi();
  const prompt = `The user wants to add an activity to their trip in ${destination}: "${userPrompt}". Preferred currency: ${currency}. Return an array of DayActivity objects. Include valid lat/lng and realistic cost estimations. Return JSON.`;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });
    const result = JSON.parse(response.text || '[]');
    return Array.isArray(result) ? result : [result];
  } catch (e) {
    throw new Error("Failed to generate magic stop.");
  }
};