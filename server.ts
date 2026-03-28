import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { GoogleGenAI } from "@google/genai";
import fs from "fs";

dotenv.config();

// Load Firebase Config to get database ID
let firebaseConfig: any = {};
try {
  firebaseConfig = JSON.parse(fs.readFileSync(path.join(process.cwd(), "firebase-applet-config.json"), "utf-8"));
} catch (error) {
  console.error("Erro ao carregar firebase-applet-config.json:", error);
}

// Initialize Firebase Admin
if (!admin.apps.length) {
  const projectId = process.env.PROJECT_ID || firebaseConfig.projectId || "gen-lang-client-0266664207";
  console.log(`[Firebase Admin] Inicializando com Project ID: ${projectId}`);
  admin.initializeApp({
    projectId: projectId,
  });
}

const dbAdmin = firebaseConfig.firestoreDatabaseId 
  ? getFirestore(admin.app(), firebaseConfig.firestoreDatabaseId)
  : getFirestore(admin.app());

console.log(`[Firebase Admin] Firestore inicializado no banco: ${firebaseConfig.firestoreDatabaseId || "(default)"}`);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware de Log para depuração
  app.use((req, res, next) => {
    console.log(`[Server] ${req.method} ${req.url}`);
    next();
  });

  app.use(express.json({ limit: '100mb' }));
  app.use(express.urlencoded({ limit: '100mb', extended: true }));

  // Endpoint de Diagnóstico
  app.get(["/api/system/status", "/api/system/status/"], (req, res) => {
    const clientKey = req.headers['x-gemini-key'] as string;
    const apiKey = clientKey || process.env.API_KEY || process.env.GEMINI_API_KEY;
    res.json({
      status: "online",
      apiKeyConfigured: !!apiKey,
      apiKeyLength: apiKey ? apiKey.length : 0,
      environment: process.env.NODE_ENV || "development"
    });
  });

  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
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

  return app;
}

const appPromise = startServer();
export default appPromise;
