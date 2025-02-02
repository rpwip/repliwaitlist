import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type Clinic = {
  id: number;
  name: string;
  address: string;
  contact_number: string;
  type: string;
};

type QueueEntry = {
  id: number;
  queueNumber: number;
  status: string;
  patient: {
    id: number;
    fullName: string;
  };
  estimatedWaitTime: number;
  clinicId: number;
};

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
            }
          } catch (error) {
            console.error('WebSocket message parsing error:', error);
          }
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          setIsConnected(false);
          queryClient.invalidateQueries({ queryKey: ["/api/queue"] });
          queryClient.invalidateQueries({ queryKey: ["/api/clinics"] });
        };

        ws.onclose = () => {
          console.log('WebSocket disconnected');
          setIsConnected(false);

          if (reconnectAttempts < maxReconnectAttempts) {
            const timeout = Math.min(1000 * Math.pow(2, reconnectAttempts), 10000);
            reconnectAttempts++;
            reconnectTimeoutRef.current = setTimeout(connect, timeout);
          } else {
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

  const queueQuery = useQuery<QueueEntry[]>({
    queryKey: ["/api/queue"],
    refetchInterval: isConnected ? false : 5000,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * Math.pow(2, attemptIndex), 5000),
    onError: (error: Error) => {
      console.error('Error fetching queue:', error);
      toast({
        title: "Queue Update Failed",
        description: "Could not fetch latest queue data. Will retry automatically.",
        variant: "destructive",
      });
    }
  });

  const clinicsQuery = useQuery<Clinic[]>({
    queryKey: ["/api/clinics"],
    retry: false,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    staleTime: 0,
    gcTime: 0,
    onSuccess: (data: Clinic[]) => {
      console.log('Clinics query succeeded:', data);
    },
    onError: (error: Error) => {
      console.error('Clinics query failed:', error);
      toast({
        title: "Error Loading Clinics",
        description: "Failed to load clinic data. Please refresh the page.",
        variant: "destructive",
      });
    }
  });

  useEffect(() => {
    console.log('Clinics Query State:', {
      data: clinicsQuery.data,
      isLoading: clinicsQuery.isLoading,
      isError: clinicsQuery.isError,
      error: clinicsQuery.error
    });
  }, [clinicsQuery.data, clinicsQuery.isLoading, clinicsQuery.isError, clinicsQuery.error]);

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
    updateStatus: updateStatusMutation.mutate,
    registerPatient: registerPatientMutation.mutateAsync,
  };
}