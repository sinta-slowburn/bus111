/**
 * server.ts - Full-Stack Express Server with Vite integration & API routes.
 */

import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import insightHandler from "./api/insight.js";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON body parsing middleware
  app.use(express.json());

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      service: "CROWDCON Singapore Day-Trip & Crowd Intelligence",
      timestamp: new Date().toISOString(),
    });
  });

  // Vercel serverless function proxy route
  app.post("/api/insight", async (req, res) => {
    try {
      await insightHandler(req, res);
    } catch (error) {
      console.error("Server API error:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Vite development middleware or static asset serving
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
    console.log(`CROWDCON Server running at http://localhost:${PORT}`);
  });
}

startServer();
