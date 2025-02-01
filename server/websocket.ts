import { WebSocketServer, WebSocket } from "ws";
import { Server } from "http";

type WebSocketMessage = {
  type: "QUEUE_UPDATE";
};

export function setupWebSocketServer(server: Server) {
  const wss = new WebSocketServer({ 
    server,
    path: "/ws",
    verifyClient: (info, done) => {
      // Ignore vite-hmr requests
      if (info.req.headers['sec-websocket-protocol'] === 'vite-hmr') {
        done(false);
        return;
      }
      done(true);
    }
  });

  wss.on("connection", (ws) => {
    console.log('WebSocket client connected');

    ws.on("error", (error) => {
      console.error('WebSocket error:', error);
    });

    // Send initial connection confirmation
    ws.send(JSON.stringify({ type: "CONNECTED" }));
  });

  return {
    broadcast: (message: WebSocketMessage) => {
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(message));
        }
      });
    },
  };
}