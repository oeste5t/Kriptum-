import { GoogleGenAI } from "@google/genai";

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { prompt, systemInstruction, image, userPrompt, responseSchema } = req.body;
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "GEMINI_API_KEY não configurada no servidor." });
    }

    const ai = new GoogleGenAI({ apiKey });
    
    let contents;
    if (image) {
      contents = [
        { 
          role: "user",
          parts: [
            { inlineData: { mimeType: "image/jpeg", data: image } },
            { text: userPrompt || prompt }
          ] 
        }
      ];
    } else {
      contents = [{ parts: [{ text: prompt }] }];
    }

    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
        responseMimeType: (image || responseSchema) ? "application/json" : undefined,
      }
    });

    if (!response.text) {
      throw new Error("Resposta vazia da IA.");
    }

    res.status(200).json({ text: response.text });
  } catch (error: any) {
    console.error("Erro na geração (api/generate):", error);
    res.status(500).json({ error: error.message || "Erro interno na geração." });
  }
}
