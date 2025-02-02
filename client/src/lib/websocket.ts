import { toast } from "@/components/ui/use-toast";

let ws: WebSocket | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

export function setupWebSocket() {
  if (ws) {
    ws.close();
    ws = null;
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host; // This includes hostname:port
  const wsUrl = `${protocol}//${host}`;

  console.log('Setting up WebSocket connection to:', wsUrl);

  try {
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('WebSocket connected');
      reconnectAttempts = 0;
      toast({
        title: "Connected to server",
        description: "Real-time updates are now active",
      });
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        setTimeout(setupWebSocket, 1000 * Math.min(reconnectAttempts, 30));
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      toast({
        title: "Connection Error",
        description: "Failed to connect to real-time updates",
        variant: "destructive",
      });
    };

    return ws;
  } catch (error) {
    console.error('Error setting up WebSocket:', error);
    return null;
  }
}

export function getWebSocket() {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    return setupWebSocket();
  }
  return ws;
}