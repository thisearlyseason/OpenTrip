
import { GoogleGenAI, Type } from "@google/genai";
import { TripRequest, TripPlan, DayActivity, LiveContext, TripDay } from "../types";

const sessionCache = new Map<string, any>();

/**
 * Returns a new AI instance to ensure we always use the latest environment API key.
 */
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
          "time": "string (e.g. 09:00 AM)",
          "durationMinutes": number,
          "title": "string",
          "description": "string",
          "type": "sightseeing|food|nature|relax|culture|shopping|transport|other|arrival|departure",
          "location": "string",
          "lat": number,
          "lng": number,
          "priceLevel": "string (MUST provide range like '$25 - $45 pp')",
          "rating": number,
          "reviewCount": "string",
          "imageUrl": "", 
          "transportToNext": {
            "mode": "string",
            "duration": "string (e.g. '15 mins')",
            "description": "string",
            "cost": "string (e.g. '$5' or 'Free')"
          }
        }
      ]
    }
  ],
  "transportResources": [{ "type": "string (Taxi|Rideshare|Public Transit|Rental)", "name": "string", "contact": "string (REAL website URL or app link preferred, or real local phone number)", "notes": "string" }],
  "importantContacts": [{ "role": "string", "name": "string", "phone": "string" }]
}
`;

const parseJsonFromText = (text: string) => {
  try {
    let cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const startIdx = cleanText.indexOf('{');
    const endIdx = cleanText.lastIndexOf('}');
    if (startIdx === -1 || endIdx === -1) {
      const arrStart = cleanText.indexOf('[');
      const arrEnd = cleanText.lastIndexOf(']');
      if (arrStart !== -1 && arrEnd !== -1) return JSON.parse(cleanText.substring(arrStart, arrEnd + 1));
      throw new Error("No JSON found");
    }
    return JSON.parse(cleanText.substring(startIdx, endIdx + 1).replace(/,\s*([}\]])/g, '$1'));
  } catch (e) {
    throw new Error("AI returned malformed data.");
  }
};

const getUserLocation = (): Promise<{ latitude: number, longitude: number } | null> => {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => resolve(null), { timeout: 5000 }
    );
  });
};

/**
 * Generates high-quality travel photography using Gemini 2.5 Flash Image.
 * Optimized with descriptive prompts to look like TripAdvisor/Professional photography.
 */
export const generateImage = async (prompt: string, aspectRatio: '1:1' | '3:4' | '4:3' | '16:9' | '9:16' = '4:3'): Promise<string> => {
  try {
    const ai = getAi();
    // Enhanced prompt for TripAdvisor/Professional quality
    const enhancedPrompt = `${prompt}. Professional travel photography, cinematic lighting, 8k resolution, National Geographic style, vibrant colors, realistic textures. ABSOLUTELY NO text, captions, watermarks, logos, or blurred edges. High-end real-world scenery.`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: enhancedPrompt }] },
      config: { 
        imageConfig: { aspectRatio } 
      },
    });
    
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
    throw new Error("No image data returned");
  } catch (error: any) {
    console.warn("Gemini Image generation failed, falling back to Unsplash service.", error);
    // Use a high-quality dynamic Unsplash source as secondary fallback if AI generation fails
    const keyword = encodeURIComponent(prompt.split(',')[0].replace(/[^a-zA-Z0-9 ]/g, ''));
    return `https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&q=80`;
  }
};

export const getTailoredInterests = async (destination: string): Promise<string[]> => {
  const cacheKey = `interests_${destination}`;
  if (sessionCache.has(cacheKey)) return sessionCache.get(cacheKey);
  try {
    const ai = getAi();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `List 18 highly specific local travel interests for ${destination}. Format as comma-separated list with emojis.`,
    });
    const list = (response.text || "").split(',').map(i => i.trim()).filter(i => i.length > 0);
    sessionCache.set(cacheKey, list);
    return list;
  } catch (e) { return ["🏛️ Local History", "🥘 Regional Cuisine", "🌿 Hidden Parks"]; }
};

export const generateTripPlan = async (request: TripRequest): Promise<{ plan: TripPlan, groundingUrls: any[] }> => {
  const ai = getAi();
  const location = await getUserLocation();
  const flightText = request.flight.booked ? request.flight.legs.map(l => `Flight ${l.flightNumber}`).join(', ') : "No flights booked.";
  const hotelText = request.accommodations.length > 0 ? request.accommodations.map(a => `Stay at ${a.hotelName}`).join(', ') : "No hotels booked.";

  const prompt = `Act as a Senior Trip Planner with 20+ years of experience. Create a ${request.dates.duration}-day travel itinerary for ${request.destination}.
  TRAVEL DATES: ${request.dates.start} to ${request.dates.end}.
  USER DAILY RHYTHM: Start: ${request.timePreference.start}, Finish: ${request.timePreference.end}.
  BUDGET: $${request.budget} ${request.budgetType}.
  INTERESTS: ${request.interests.join(', ')}.
  MUST INCLUDE: ${request.mustIncludes.join(', ')}.
  LOGISTICS: Flights (${flightText}), Hotels (${hotelText}).
  TRANSPORT PREFERENCE: ${request.transport.join(', ')}.

  SENIOR PLANNER REQUIREMENTS:
  1. DENSE ITINERARY: Fill the day with 4-6 distinct activities (e.g., Morning Coffee/Walk, Major Attraction, Authentic Lunch, Hidden Gem, Cultural Stop, Dinner). Do not leave empty time blocks.
  2. ACCURATE BUDGETS: Every activity/meal MUST have a specific "priceLevel" range like "$20 - $50 pp". 
  3. BUSINESS LINKS: In "transportResources", find and provide REAL local business names and ACTUAL clickable URLs (websites/app links) or real local phone numbers.
  4. INTER-STOP LOGISTICS: In "transportToNext", provide specific estimated costs and durations based on user transportation preferences.
  5. IMAGES: Set "imageUrl" to empty string (""). The frontend will generate professional TripAdvisor-quality photos based on your "title" and "location".
  6. JSON OUTPUT ONLY: Use this schema: ${STRICT_JSON_SCHEMA}. No markdown text outside the JSON.`;

  const hydratePlan = (plan: TripPlan) => {
    plan.metadata = { ...plan.metadata, flights: request.flight, accommodations: request.accommodations, travelers: request.travelers, dates: request.dates, transportModes: request.transport, interests: request.interests, dietary: request.dietary, foodPreferences: request.foodPreferences, budget: request.budget, budgetType: request.budgetType, timePreference: request.timePreference };
    return plan;
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview', // Upgraded to Pro for better reasoning and grounding
      contents: prompt,
      config: { 
        systemInstruction: "Expert Senior Travel Planner. Rich 4-6 activity days. Real business links. Precise per-person budgets. No nulls.",
        tools: [{ googleMaps: {} }, { googleSearch: {} }],
        toolConfig: location ? { retrievalConfig: { latLng: location } } : undefined
      },
    });
    const plan = parseJsonFromText(response.text || '') as TripPlan;
    return { plan: hydratePlan(plan), groundingUrls: response.candidates?.[0]?.groundingMetadata?.groundingChunks || [] };
  } catch (error) {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });
    const plan = parseJsonFromText(response.text || '') as TripPlan;
    return { plan: hydratePlan(plan), groundingUrls: [] };
  }
};

export const regenerateDayPlan = async (destination: string, vibe: string, dayNumber: number, existingDay?: TripDay): Promise<TripDay> => {
  const ai = getAi();
  const prompt = `Regenerate Day ${dayNumber} for ${destination} with 4-6 diverse activities. Vibe: ${vibe}. Include per-person budget ranges and logistics. Set imageUrl to "". JSON only.`;
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: { systemInstruction: "Senior planner mode. Output JSON Day object.", tools: [{ googleMaps: {} }, { googleSearch: {} }] },
  });
  return parseJsonFromText(response.text || '{}') as TripDay;
};

export const regenerateSingleActivity = async (destination: string, vibe: string, currentActivity: DayActivity): Promise<DayActivity> => {
  const ai = getAi();
  const prompt = `Find alternative for ${currentActivity.title} in ${destination}. Must include per-person budget range and transport next. Set imageUrl to "". JSON only.`;
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: { systemInstruction: "Output JSON Activity object.", tools: [{ googleMaps: {} }, { googleSearch: {} }] },
  });
  return parseJsonFromText(response.text || '{}') as DayActivity;
};

export const fetchLiveContext = async (destination: string): Promise<LiveContext> => {
  const ai = getAi();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Weather and events in ${destination}. JSON: { weather: { temp, condition, icon }, events: [] }`,
    config: { responseMimeType: 'application/json', tools: [{ googleSearch: {} }] }
  });
  return parseJsonFromText(response.text || '{}');
};

/**
 * Handles AI concierge chat messages.
 */
export const assistantChat = async (message: string, plan: TripPlan): Promise<string> => {
  const ai = getAi();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Context: I am traveling on a trip titled "${plan.tripTitle}" to ${plan.destinationSummary}. It's a ${plan.metadata.dates.duration}-day trip. The vibe is ${plan.travelVibe}.\n\nUser Question: ${message}`,
    config: {
      systemInstruction: "You are a helpful travel concierge assistant for OpenTrip. Answer questions about the user's specific trip plan. Be concise, friendly, and helpful."
    }
  });
  return response.text || "I'm sorry, I couldn't process that request.";
};
