import { GoogleGenAI } from "@google/genai";
import fs from "fs";

async function generateLogo() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        {
          text: "A professional, minimalist, futuristic tech logo for a brand named 'Kriptum'. Sleek, sharp white 'K' symbol, high-tech arsenal aesthetic, dark blue and neon cyan glow on a black background, 512x512, centered, high quality. It should look exactly like a stylized 'K' with sharp edges and a blue aura.",
        },
      ],
    },
  });

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      const base64Data = part.inlineData.data;
      const buffer = Buffer.from(base64Data, 'base64');
      fs.writeFileSync('public/logo.png', buffer);
      console.log('Logo updated successfully in public/logo.png');

      // Update Android icons
      const androidResPath = 'app/src/main/res';
      const mipmapDirs = [
        'mipmap-hdpi',
        'mipmap-mdpi',
        'mipmap-xhdpi',
        'mipmap-xxhdpi',
        'mipmap-xxxhdpi'
      ];

      for (const dir of mipmapDirs) {
        const iconPath = `${androidResPath}/${dir}/ic_launcher_foreground.png`;
        if (fs.existsSync(iconPath)) {
          fs.writeFileSync(iconPath, buffer);
          console.log(`Updated Android icon: ${iconPath}`);
        }
      }

      // Update background color to black
      const backgroundXmlPath = 'app/src/main/res/values/ic_launcher_background.xml';
      if (fs.existsSync(backgroundXmlPath)) {
        const backgroundXml = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#0a0a0a</color>
</resources>`;
        fs.writeFileSync(backgroundXmlPath, backgroundXml);
        console.log('Updated Android icon background color to black.');
      }

      return;
    }
  }
  console.error('Failed to generate logo.');
}

generateLogo();
