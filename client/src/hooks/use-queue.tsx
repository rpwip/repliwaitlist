import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type RegistrationData = {
  fullName: string;
  email: string | null;
  mobile: string;
};

export function useQueue() {
  const { toast } = useToast();
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    function connect() {
      if (wsRef.current?.readyState === WebSocket.OPEN) return;

      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        const ws = new WebSocket(`${protocol}//${host}/ws`);

        ws.onopen = () => {
          console.log('WebSocket connected');
          setIsConnected(true);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === "QUEUE_UPDATE") {
              queryClient.invalidateQueries({ queryKey: ["/api/queue"] });
            }
          } catch (error) {
            console.error('WebSocket message parsing error:', error);
          }
        };

        ws.onerror = () => {
          setIsConnected(false);
          queryClient.invalidateQueries({ queryKey: ["/api/queue"] });
        };

        ws.onclose = () => {
          console.log('WebSocket disconnected');
          setIsConnected(false);
        };

        wsRef.current = ws;
      } catch (error) {
        console.error('WebSocket connection error:', error);
        setIsConnected(false);
      }
    }

    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  const queueQuery = useQuery({
    queryKey: ["/api/queue"],
    refetchInterval: isConnected ? false : 5000,
  });

  const clinicsQuery = useQuery({
    queryKey: ["/api/clinics"]
  });

  const registerPatientMutation = useMutation({
    mutationFn: async (data: RegistrationData) => {
      const res = await apiRequest("POST", "/api/register-patient", data);
      if (!res.ok) {
        const error = await res.text();
        throw new Error(error || 'Failed to register patient');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/queue"] });
    },
    onError: (error: Error) => {
      console.error('Registration failed:', error);
      throw error;
    }
  });

  return {
    queue: queueQuery.data ?? [],
    clinics: clinicsQuery.data ?? [],
    isLoading: queueQuery.isLoading || clinicsQuery.isLoading,
    isError: queueQuery.isError || clinicsQuery.isError,
    isConnected,
    registerPatient: registerPatientMutation.mutateAsync,
  };
}