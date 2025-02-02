import { WebSocketServer, WebSocket } from "ws";
import { Server } from "http";

type WebSocketMessage = {
  type: "QUEUE_UPDATE" | "CONNECTED" | "AUTH";
  token?: string;
};

type AuthenticatedWebSocket = WebSocket & {
  isAuthenticated?: boolean;
  userId?: number;
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

  wss.on("connection", (ws: AuthenticatedWebSocket) => {
    console.log('WebSocket client connected');
    ws.isAuthenticated = false;

    ws.on("message", (data) => {
      try {
        const message = JSON.parse(data.toString()) as WebSocketMessage;

        if (message.type === "AUTH" && message.token) {
          ws.isAuthenticated = true;
          ws.userId = parseInt(message.token);
          console.log('WebSocket client authenticated:', ws.userId);
          ws.send(JSON.stringify({ type: "CONNECTED", authenticated: true }));
        }
      } catch (error) {
        console.error('WebSocket message parsing error:', error);
      }
    });

    ws.on("error", (error) => {
      console.error('WebSocket error:', error);
    });

    ws.on("close", () => {
      console.log('WebSocket client disconnected');
    });

    // Send initial connection confirmation
    ws.send(JSON.stringify({ type: "CONNECTED", authenticated: false }));
  });

  return {
    broadcast: (message: WebSocketMessage) => {
      wss.clients.forEach((client: AuthenticatedWebSocket) => {
        if (client.readyState === WebSocket.OPEN && client.isAuthenticated) {
          client.send(JSON.stringify(message));
        }
      });
    },
  };
}