import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import path from "path";

async function generateAndSaveLogo() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  console.log("Gerando logo baseada na imagem do usuário...");
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        {
          text: "A high-quality, professional tech logo. A sharp, futuristic white 'K' symbol that looks like a lightning bolt or a blade. The 'K' is centered on a solid black background. To the right of the 'K', there is a subtle but intense blue lens flare or glow effect. Below the 'K', the word 'KRIPTUM' is written in a bold, wide, futuristic sans-serif white font. 512x512, centered, minimalist, high resolution.",
        },
      ],
    },
  });

  let base64Data = null;
  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      base64Data = part.inlineData.data;
      break;
    }
  }

  if (base64Data) {
    const buffer = Buffer.from(base64Data, 'base64');
    const publicDir = path.join(process.cwd(), 'public');
    
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir);
    }

    fs.writeFileSync(path.join(publicDir, 'icon-192.png'), buffer);
    fs.writeFileSync(path.join(publicDir, 'icon-512.png'), buffer);
    
    console.log("Logos geradas e salvas em /public/icon-192.png e /public/icon-512.png");
  } else {
    console.error("Falha ao gerar a logo.");
  }
}

generateAndSaveLogo();