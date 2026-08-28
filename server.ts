/**
 * server.ts - Full-Stack Express Server with Vite integration & API routes.
 */

import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import weatherHandler from "./api/weather.js";
import busHandler from "./api/bus.js";
import trainHandler from "./api/train.js";
import busStopsHandler from "./api/bus-stops.js";

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
      service: "CROWDCON Singapore Crowd Intelligence",
      timestamp: new Date().toISOString(),
    });
  });

  app.get("/api/weather", async (req, res) => {
    try {
      await weatherHandler(req, res);
    } catch (error) {
      console.error("Server Weather API error:", error);
      res.status(500).json({ success: false, error: "Internal Server Error" });
    }
  });

  app.get("/api/bus", async (req, res) => {
    try {
      await busHandler(req, res);
    } catch (error) {
      console.error("Server Bus API error:", error);
      res.status(500).json({ success: false, error: "Internal Server Error" });
    }
  });

  app.get("/api/bus-stops", async (req, res) => {
    try {
      await busStopsHandler(req, res);
    } catch (error) {
      console.error("Server Bus Stops API error:", error);
      res.status(500).json({ success: false, error: "Internal Server Error" });
    }
  });

  app.get("/api/train", async (req, res) => {
    try {
      await trainHandler(req, res);
    } catch (error) {
      console.error("Server Train API error:", error);
      res.status(500).json({ success: false, error: "Internal Server Error" });
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
