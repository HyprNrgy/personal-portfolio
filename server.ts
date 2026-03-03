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
      const apiKey = (process.env.GEMINI_API_KEY || process.env.API_KEY)?.trim();
      
      if (!apiKey) {
        console.error("No API key found in GEMINI_API_KEY or API_KEY environment variables");
        return res.status(500).json({ error: "API Key missing on server." });
      }

      const ai = new GoogleGenAI({ apiKey });
      
      // Using gemini-2.0-flash for speed
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
      if (!text) {
        throw new Error("Empty response from AI");
      }

      const data = JSON.parse(text);
      res.json(data);
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      res.status(500).json({ error: error.message || "Failed to fetch prices." });
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
