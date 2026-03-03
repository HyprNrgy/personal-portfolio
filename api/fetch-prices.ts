import { GoogleGenAI } from "@google/genai";

export default async function handler(req: any, res: any) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { symbols } = req.body;
  console.log("Fetching prices for symbols:", symbols);

  try {
    // Try both common environment variable names
    const apiKey = (process.env.GEMINI_API_KEY || process.env.API_KEY)?.trim();
    
    if (!apiKey) {
      console.error("No API key found in GEMINI_API_KEY or API_KEY environment variables");
      return res.status(500).json({ error: "API Key missing on server. Please set GEMINI_API_KEY in Vercel settings." });
    }

    // Debugging (Safe): Log the format of the key
    console.log(`API Key check: Length=${apiKey.length}, StartsWithAIza=${apiKey.startsWith('AIza')}`);
    if (!apiKey.startsWith('AIza')) {
      console.warn("Warning: API Key does not start with 'AIza'. This is likely an invalid Google API key.");
    }

    const ai = new GoogleGenAI({ apiKey });
    
    // Using gemini-2.0-flash for speed to avoid Vercel 10s timeout
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: `Return a JSON object with the latest market prices in INR for these symbols: ${symbols}. 
      Include 'BOND_UGRO' at ~19028.
      Format: { "SYMBOL": price_as_number }. Return ONLY the JSON.`,
      config: {
        responseMimeType: "application/json",
      }
    });

    const text = response.text;
    console.log("AI Response:", text);

    if (!text) {
      throw new Error("Empty response from AI");
    }

    const data = JSON.parse(text);
    res.status(200).json(data);
  } catch (error: any) {
    console.error("API Error:", error);
    res.status(500).json({ error: error.message || "Internal Server Error" });
  }
}
