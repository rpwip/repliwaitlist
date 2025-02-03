import { WebSocketServer, WebSocket } from "ws";
import { Server } from "http";

type WebSocketMessage = {
  type: "QUEUE_UPDATE" | "CONNECTED" | "AUTH";
  token?: string;
};

type AuthenticatedWebSocket = WebSocket & {
  isAuthenticated?: boolean;
  userId?: number;
  lastPing?: number;
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

  // Set up heartbeat interval to detect stale connections
  const interval = setInterval(() => {
    wss.clients.forEach((ws: AuthenticatedWebSocket) => {
      if (!ws.lastPing) {
        ws.lastPing = Date.now();
        return;
      }

      if (Date.now() - ws.lastPing > 30000) {
        console.log('Client connection stale, terminating');
        return ws.terminate();
      }

      ws.ping();
    });
  }, 10000);

  wss.on("connection", (ws: AuthenticatedWebSocket) => {
    console.log('WebSocket client connected');
    ws.isAuthenticated = false;
    ws.lastPing = Date.now();

    // Send initial connection confirmation
    ws.send(JSON.stringify({ 
      type: "CONNECTED", 
      authenticated: false,
      message: "Please authenticate with your user ID"
    }));

    ws.on("pong", () => {
      ws.lastPing = Date.now();
    });

    ws.on("message", (data) => {
      try {
        const message = JSON.parse(data.toString()) as WebSocketMessage;
        console.log('Received WebSocket message:', message);

        if (message.type === "AUTH" && message.token) {
          const userId = parseInt(message.token);
          if (!isNaN(userId)) {
            ws.isAuthenticated = true;
            ws.userId = userId;
            console.log('WebSocket client authenticated:', ws.userId);
            ws.send(JSON.stringify({ 
              type: "CONNECTED", 
              authenticated: true,
              userId: ws.userId 
            }));
          } else {
            console.error('Invalid user ID received:', message.token);
            ws.send(JSON.stringify({ 
              type: "CONNECTED", 
              authenticated: false,
              error: "Invalid user ID" 
            }));
          }
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
  });

  // Clean up interval on server close
  server.on('close', () => {
    clearInterval(interval);
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