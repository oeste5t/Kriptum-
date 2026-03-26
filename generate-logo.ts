import { GoogleGenAI } from "@google/genai";

async function generateLogo() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        {
          text: "A professional, minimalist, futuristic tech logo for a brand named 'Kriptum'. Sleek 'K' symbol, high-tech arsenal aesthetic, dark blue and neon cyan accents, 512x512, centered, high quality.",
        },
      ],
    },
  });

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      return part.inlineData.data;
    }
  }
  return null;
}

// This is a script to be run once to generate the logo
// In a real scenario, I'd just do this and save the file.
