import { GoogleGenAI } from "@google/genai";

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { symbols } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      console.error("GEMINI_API_KEY is not set in environment variables.");
      return res.status(500).json({ error: "Server configuration error: API Key missing." });
    }

    const ai = new GoogleGenAI({ apiKey });
    
    let response;
    try {
      // Primary attempt with Google Search grounding
      response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Return a JSON object with the latest market prices in INR for these symbols: ${symbols}. 
        Also include a price for 'BOND_UGRO' which is a corporate bond (current value is roughly 19028).
        Format: { "SYMBOL": price_as_number }. Return ONLY the JSON.`,
        config: {
          responseMimeType: "application/json",
          tools: [{ googleSearch: {} }]
        }
      });
    } catch (searchErr) {
      console.warn("Search tool failed, falling back to standard generation:", searchErr);
      // Fallback attempt without tools
      response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Return a JSON object with the latest market prices in INR for these symbols: ${symbols}. 
        Also include a price for 'BOND_UGRO' which is a corporate bond (current value is roughly 19028).
        Format: { "SYMBOL": price_as_number }. Return ONLY the JSON.`,
        config: { responseMimeType: "application/json" }
      });
    }

    const text = response.text;
    if (!text) {
      throw new Error("Empty response from AI model.");
    }

    const data = JSON.parse(text);
    res.status(200).json(data);
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    res.status(500).json({ error: error.message || "Failed to fetch prices from AI service." });
  }
}
