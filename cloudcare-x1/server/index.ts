import express from "express";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import { setupRoutes } from "./routes";
import { setupWebSocketServer } from "./websocket";

const app = express();
const httpServer = createServer(app);

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