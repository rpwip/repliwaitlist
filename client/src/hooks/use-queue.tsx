import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function useQueue() {
  const { toast } = useToast();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;

    function connect() {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        return;
      }

      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        const ws = new WebSocket(`${protocol}//${host}/ws`);

        ws.onopen = () => {
          console.log('WebSocket connected');
          setIsConnected(true);
          reconnectAttempts = 0;
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = undefined;
          }
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === "QUEUE_UPDATE") {
              queryClient.invalidateQueries({ queryKey: ["/api/queue"] });
            } else if (data.type === "CONNECTED") {
              console.log("WebSocket connection confirmed");
            }
          } catch (error) {
            console.error('WebSocket message parsing error:', error);
          }
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          setIsConnected(false);
          // Invalidate queries to trigger polling
          queryClient.invalidateQueries({ queryKey: ["/api/queue"] });
          queryClient.invalidateQueries({ queryKey: ["/api/clinics"] });
        };

        ws.onclose = () => {
          console.log('WebSocket disconnected');
          setIsConnected(false);

          if (reconnectAttempts < maxReconnectAttempts) {
            const timeout = Math.min(1000 * Math.pow(2, reconnectAttempts), 10000);
            reconnectAttempts++;

            console.log(`Attempting to reconnect in ${timeout}ms (attempt ${reconnectAttempts}/${maxReconnectAttempts})`);
            reconnectTimeoutRef.current = setTimeout(connect, timeout);
          } else {
            console.log('Max reconnection attempts reached');
            toast({
              title: "Connection Status",
              description: "Using offline mode. Data will update periodically.",
              variant: "default"
            });
          }
        };

        wsRef.current = ws;
      } catch (error) {
        console.error('WebSocket connection error:', error);
        setIsConnected(false);
      }
    }

    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [toast]);

  const queueQuery = useQuery<any[]>({
    queryKey: ["/api/queue"],
    refetchInterval: isConnected ? false : 5000, // Poll every 5 seconds when WebSocket is down
  });

  const clinicsQuery = useQuery<any[]>({
    queryKey: ["/api/clinics"],
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    refetchOnMount: true,
    retry: 3,
    onSuccess: (data) => {
      console.log('Clinics data fetched successfully:', data);
    },
    onError: (error) => {
      console.error('Error fetching clinics:', error);
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ queueId, status }: { queueId: number; status: string }) => {
      const res = await apiRequest("POST", `/api/queue/${queueId}/status`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/queue"] });
    },
  });

  const registerPatientMutation = useMutation({
    mutationFn: async (data: {
      fullName: string;
      email: string;
      mobile: string;
    }) => {
      const res = await apiRequest("POST", "/api/register-patient", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/queue"] });
    },
    onError: (error) => {
      console.error('Registration failed:', error);
      throw error;
    }
  });

  console.log('Current clinics data:', clinicsQuery.data);
  console.log('Clinics loading state:', clinicsQuery.isLoading);
  console.log('Clinics error state:', clinicsQuery.isError);


  return {
    queue: queueQuery.data ?? [],
    clinics: clinicsQuery.data ?? [],
    isLoading: queueQuery.isLoading || clinicsQuery.isLoading,
    isError: queueQuery.isError || clinicsQuery.isError,
    isConnected,
    updateStatus: updateStatusMutation.mutate,
    registerPatient: registerPatientMutation.mutateAsync,
  };
}