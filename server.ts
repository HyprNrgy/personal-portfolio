import express from "express";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for fetching prices - keeps the API key secure on the server
  app.post("/api/fetch-prices", async (req, res) => {
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
      res.json(data);
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      res.status(500).json({ error: error.message || "Failed to fetch prices from AI service." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // In production, serve built files
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
