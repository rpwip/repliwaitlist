import { WebSocketServer, WebSocket } from "ws";
import { Server } from "http";

type WebSocketMessage = {
  type: "QUEUE_UPDATE";
};

export function setupWebSocketServer(server: Server) {
  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (ws) => {
    ws.on("error", console.error);
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
