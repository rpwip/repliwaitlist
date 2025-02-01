import { WebSocketServer, WebSocket } from "ws";
import { Server } from "http";

type WebSocketMessage = {
  type: "QUEUE_UPDATE" | "CONNECTED";
};

export function setupWebSocketServer(server: Server) {
  const wss = new WebSocketServer({ 
    server,
    path: "/ws",
    verifyClient: (info, done) => {
      // Only ignore vite-hmr requests, accept all others
      if (info.req.headers['sec-websocket-protocol'] === 'vite-hmr') {
        done(false);
      } else {
        done(true);
      }
    }
  });

  wss.on("connection", (ws) => {
    console.log('WebSocket client connected');

    ws.on("error", (error) => {
      console.error('WebSocket error:', error);
    });

    ws.on("close", () => {
      console.log('WebSocket client disconnected');
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