import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { Ollama } from "ollama";
import net from "net";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Ollama Client
  const ollamaHost = process.env.OLLAMA_HOST || "http://localhost:11434";
  const ollamaClient = new Ollama({ host: ollamaHost });
  const DEFAULT_MODEL = "mistral"; // As per user's python script example

  let currentStatus = "INITIALIZING";

  // Bridge Initialization Logic (Translated from Python)
  async function isServiceRunning(host: string): Promise<boolean> {
    try {
      const url = new URL(host);
      const hostName = url.hostname;
      const port = parseInt(url.port) || 80;
      
      return new Promise((resolve) => {
        const socket = net.createConnection(port, hostName);
        socket.setTimeout(2000);
        socket.on('connect', () => {
          socket.end();
          resolve(true);
        });
        socket.on('error', () => resolve(false));
        socket.on('timeout', () => {
          socket.destroy();
          resolve(false);
        });
      });
    } catch {
      return false;
    }
  }

  async function initializeBridge() {
    console.log(`--- Initializing Ollama Bridge at ${ollamaHost} ---`);
    
    const running = await isServiceRunning(ollamaHost);
    if (!running) {
      console.log("Status: [OFFLINE] - Please ensure the Ollama App is running.");
      currentStatus = "OFFLINE";
      return;
    }

    try {
      const modelsResponse = await ollamaClient.list();
      console.log("Status: [CONNECTED]");
      
      const modelExists = modelsResponse.models.some(m => m.name.startsWith(DEFAULT_MODEL));
      
      if (!modelExists) {
        console.log(`Model '${DEFAULT_MODEL}' not found. Pulling now...`);
        currentStatus = "PULLING_MODEL";
        await ollamaClient.pull({ model: DEFAULT_MODEL });
        console.log(`Model '${DEFAULT_MODEL}' ready.`);
      } else {
        console.log(`Model '${DEFAULT_MODEL}': [READY]`);
      }
      
      currentStatus = "ONLINE";
    } catch (e) {
      console.log(`Initialization Error: ${e}`);
      currentStatus = "ERROR";
    }
  }

  // Run initialization
  initializeBridge();

  // API Routes
  app.get("/api/status", (req, res) => {
    res.json({ status: currentStatus });
  });

  app.get("/api/models", async (req, res) => {
    try {
      const response = await ollamaClient.list();
      currentStatus = "ONLINE";
      res.json(response.models);
    } catch (error: any) {
      // Only log once or if it's not a connection error to avoid spam
      if (error.code !== 'ECONNREFUSED') {
        console.error("Error fetching models:", error);
      }
      
      currentStatus = "OFFLINE";
      res.status(500).json({ error: "Could not connect to Ollama service" });
    }
  });

  app.post("/api/chat", async (req, res) => {
    const { model, messages } = req.body;
    
    try {
      const response = await ollamaClient.chat({
        model: model || "llama3",
        messages: messages,
        stream: false,
      });
      res.json(response);
    } catch (error) {
      console.error("Chat error:", error);
      res.status(500).json({ error: "Ollama communication error" });
    }
  });

  app.post("/api/pull", async (req, res) => {
    const { model } = req.body;
    currentStatus = "PULLING_MODEL";
    try {
      // Pulling can be slow, so we just start it or wait
      await ollamaClient.pull({ model });
      currentStatus = "ONLINE";
      res.json({ status: "success", model });
    } catch (error) {
      console.error("Pull error:", error);
      currentStatus = "ERROR";
      res.status(500).json({ error: "Failed to pull model" });
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
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
