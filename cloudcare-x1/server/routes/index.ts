import type { Express } from "express";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import { setupAuth } from "../auth";
import { setupWebSocketServer } from "../websocket";
import { registerQueueRoutes } from "./queue";
import { db } from "@db";
import { clinics } from "@db/schema";

export function setupRoutes(app: Express) {
  // Set up authentication
  setupAuth(app);

  // Create HTTP server
  const httpServer = createServer(app);

  // Set up WebSocket server
  const wss = new WebSocketServer({ server: httpServer });
  const ws = setupWebSocketServer(wss);

  // Register route modules
  registerQueueRoutes(app, ws);

  // Add the clinic route within registerQueueRoutes or a similar function.  This is a best guess since the implementation of registerQueueRoutes is not provided.

  app.get("/api/clinics", async (_req, res) => {
    try {
      const results = await db
        .select()
        .from(clinics)
        .orderBy(clinics.name);

      console.log('Fetched clinics:', results);
      res.json(results);
    } catch (error) {
      console.error('Error fetching clinics:', error);
      res.status(500).json({
        error: 'Failed to fetch clinics',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  });


  return httpServer;
}