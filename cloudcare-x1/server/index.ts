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
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (req.path.startsWith("/api")) {
      console.log(`${req.method} ${req.path} ${res.statusCode} in ${duration}ms`);
    }
  });
  next();
});

// Authentication setup
setupAuth(app);

// Routes setup
setupRoutes(app);

// WebSocket setup
const wss = new WebSocketServer({ server: httpServer });
setupWebSocketServer(wss);

// Start server
const port = 5001; // CloudCare X1 port
httpServer.listen(port, "0.0.0.0", () => {
  console.log(`CloudCare X1 server running on port ${port}`);
});

export { app, httpServer };