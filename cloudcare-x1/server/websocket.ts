import { WebSocketServer } from "ws";
import type { Server } from "http";

export function setupWebSocketServer(wss: WebSocketServer) {
  wss.on("connection", (ws) => {
    console.log("WebSocket client connected");

    ws.on("message", (message) => {
      try {
        const data = JSON.parse(message.toString());
        console.log("Received WebSocket message:", data);

        if (data.type === "AUTH") {
          console.log("WebSocket client authenticated:", data.token);
          ws.send(JSON.stringify({ type: "AUTH_SUCCESS" }));
        }
      } catch (error) {
        console.error("WebSocket message error:", error);
        ws.send(JSON.stringify({ type: "ERROR", message: "Invalid message format" }));
      }
    });

    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
    });

    ws.on("close", () => {
      console.log("WebSocket client disconnected");
    });
  });

  return {
    broadcast: (data: any) => {
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(data));
        }
      });
    }
  };
}
