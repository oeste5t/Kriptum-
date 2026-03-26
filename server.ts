import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import admin from "firebase-admin";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: process.env.PROJECT_ID || "gen-lang-client-0266664207",
  });
}

const dbAdmin = admin.firestore();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Endpoint de Diagnóstico (Para ajudar o usuário a ver se a chave está configurada)
  app.get("/api/system/status", (req, res) => {
    const clientKey = req.headers['x-gemini-key'] as string;
    const apiKey = clientKey || process.env.API_KEY || process.env.GEMINI_API_KEY;
    res.json({
      status: "online",
      apiKeyConfigured: !!apiKey,
      apiKeyLength: apiKey ? apiKey.length : 0,
      environment: process.env.NODE_ENV || "development"
    });
  });

  // API Proxy para Gemini (Segurança e Funcionamento Externo)
  app.post("/api/ai/generate", async (req, res) => {
    try {
      const { model, contents, systemInstruction, config } = req.body;
      // Tenta pegar a chave do cabeçalho (enviada pelo cliente) ou do ambiente
      const clientKey = req.headers['x-gemini-key'] as string;
      const apiKey = clientKey || process.env.API_KEY || process.env.GEMINI_API_KEY;

      console.log(`[AI Proxy] Request for model: ${model}`);
      if (!apiKey) {
        console.error("[AI Proxy] ERRO: Nenhuma chave de API encontrada.");
        return res.status(500).json({ error: "Chave da IA não configurada. Por favor, configure no app ou no servidor." });
      }

      console.log(`[AI Proxy] Usando chave com tamanho: ${apiKey.length}`);
      
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model,
        contents,
        config: {
          ...config,
          systemInstruction
        }
      });

      res.json(response);
    } catch (error: any) {
      console.error("[AI Proxy] Erro na chamada da API Gemini:", error);
      res.status(500).json({ error: error.message || "Erro interno na IA." });
    }
  });

  // Proxy para Geração de Vídeo (Veo)
  app.post("/api/ai/generate-video", async (req, res) => {
    try {
      const { model, prompt, image, config } = req.body;
      const clientKey = req.headers['x-gemini-key'] as string;
      const apiKey = clientKey || process.env.API_KEY || process.env.GEMINI_API_KEY;

      console.log(`[Video Proxy] Request for model: ${model}`);
      if (!apiKey) {
        console.error("[Video Proxy] ERRO: Nenhuma chave de API encontrada.");
        return res.status(500).json({ error: "Chave da IA não configurada." });
      }

      const ai = new GoogleGenAI({ apiKey });
      const operation = await ai.models.generateVideos({
        model,
        prompt,
        image,
        config
      });

      res.json({ operationId: (operation as any).id, done: operation.done });
    } catch (error: any) {
      console.error("[Video Proxy] Erro na geração de vídeo:", error);
      res.status(500).json({ error: error.message || "Erro interno na geração de vídeo." });
    }
  });

  // Polling para status do vídeo
  app.get("/api/ai/video-status/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;

      const ai = new GoogleGenAI({ apiKey: apiKey! });
      const operation = await ai.operations.getVideosOperation({ operation: { id } as any });

      res.json(operation);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Proxy para download de vídeo seguro
  app.get("/api/ai/video-download", async (req, res) => {
    try {
      const { url } = req.query;
      const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;

      if (!url || !apiKey) return res.status(400).send("URL ou Chave faltando.");

      const response = await fetch(url as string, {
        headers: { 'x-goog-api-key': apiKey }
      });

      if (!response.ok) throw new Error("Falha ao baixar vídeo do Google.");

      const contentType = response.headers.get('content-type');
      if (contentType) res.setHeader('Content-Type', contentType);
      
      const buffer = await response.arrayBuffer();
      res.send(Buffer.from(buffer));
    } catch (error: any) {
      res.status(500).send(error.message);
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
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
