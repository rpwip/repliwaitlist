import express from "express";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { setupRoutes } from "./routes";
import { setupWebSocketServer } from "./websocket";
import { setupAuth } from "./auth";

const app = express();
const httpServer = createServer(app);

// Database setup
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool);

// Middleware
app.use(express.json());

// Authentication setup
setupAuth(app);

// Routes setup
setupRoutes(app);

// WebSocket setup
const wss = new WebSocketServer({ server: httpServer });
setupWebSocketServer(wss);

// Start server
const port = process.env.PORT || 3000;
httpServer.listen(port, "0.0.0.0", () => {
  console.log(`Server running on port ${port}`);
});

export { app, httpServer };
