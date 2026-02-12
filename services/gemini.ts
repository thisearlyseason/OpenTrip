
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
    throw new Error("No JSON found");
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
      contents: { parts: [{ text: `${prompt}. Breathtaking professional travel photography, highly detailed, cinematic lighting.` }] },
      config: { imageConfig: { aspectRatio } },
    });
    const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
    return part?.inlineData ? `data:image/png;base64,${part.inlineData.data}` : 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&q=80';
  } catch {
    return 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&q=80';
  }
};

export const generateTripPlan = async (request: TripRequest): Promise<{ plan: TripPlan, groundingUrls: any[] }> => {
  const ai = getAi();
  const prompt = `Act as an Expert Travel Planner.
  Dates: ${request.dates.start} to ${request.dates.end}.
  Location: ${request.destination}.
  Currency: ${request.currency}.
  Budget: ${request.budget} ${request.currency} (${request.budgetType}).
  Group: ${request.travelers.adults}A, ${request.travelers.children}C.
  Vibe: ${request.vibe.join(', ')}.
  Must Includes: ${request.mustIncludes.join(', ')}.
  Transit Preference: ${request.transport.join(', ')}.

  INSTRUCTIONS:
  1. CHRONOLOGICAL INTERLEAVING: Interleave Flights, Hotel checks, Meals, and Activities.
  2. TRANSIT: suggest optimal mode (e.g. Subway, Walking) between EVERY activity in "transportToNext".
  3. RESOURCES: Provide 10 local transport resources (apps, taxi URLs, transit maps) in "transportResources".
  4. LIVE DATA: Search for specific events happening during these dates.
  5. JSON SCHEMA: ${STRICT_JSON_SCHEMA}.
  6. IMPORTANT: Always set "actualSpent" to 0 for all activities.`;

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

export const regenerateDayPlan = async (destination: string, vibe: string, dayNumber: number, currency: string): Promise<TripDay> => {
  const ai = getAi();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Regenerate Day ${dayNumber} for ${destination}. Vibe: ${vibe}. Currency: ${currency}. Return JSON matching TripDay schema. Ensure actualSpent is 0.`,
    config: { responseMimeType: 'application/json' },
  });
  return parseJsonFromText(response.text || '{}') as TripDay;
};

export const regenerateSingleActivity = async (destination: string, vibe: string, currentActivity: DayActivity, currency: string): Promise<DayActivity> => {
  const ai = getAi();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Find realistic alternative for ${currentActivity.title} in ${destination}. Match DayActivity schema (including lat, lng, and actualSpent: 0). Return JSON.`,
    config: { responseMimeType: 'application/json' },
  });
  return parseJsonFromText(response.text || '{}') as DayActivity;
};

export const generateActivityFromPrompt = async (destination: string, activityDescription: string, currency: string): Promise<DayActivity> => {
  const ai = getAi();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `The user wants to add a stop to their itinerary in ${destination}: "${activityDescription}". 
    Create a DayActivity object in JSON format with realistic title, description, type, location, website, phone, cost, imagePrompt, and CRITICALLY, valid lat/lng coordinates and actualSpent: 0.`,
    config: { responseMimeType: 'application/json' },
  });
  return parseJsonFromText(response.text || '{}') as DayActivity;
};

export const fetchLiveContext = async (destination: string): Promise<LiveContext> => {
  const ai = getAi();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Current weather and events in ${destination}. JSON: { weather: { temp, condition, icon }, events: [] }`,
    config: { responseMimeType: 'application/json', tools: [{ googleSearch: {} }] }
  });
  return parseJsonFromText(response.text || '{}');
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
