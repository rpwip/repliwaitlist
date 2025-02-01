import { useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function useQueue() {
  const { toast } = useToast();
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    function connect() {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

      ws.onopen = () => {
        console.log('WebSocket connected');
      };

      ws.onmessage = () => {
        queryClient.invalidateQueries({ queryKey: ["/api/queue"] });
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        toast({
          title: "Connection Error",
          description: "Having trouble connecting to real-time updates",
          variant: "destructive",
        });
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected, attempting to reconnect...');
        setTimeout(connect, 3000);
      };

      wsRef.current = ws;
    }

    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [toast]);

  const queueQuery = useQuery<any[]>({
    queryKey: ["/api/queue"],
    refetchInterval: 30000, // Fallback polling every 30 seconds if WebSocket fails
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

  const confirmPaymentMutation = useMutation({
    mutationFn: async (queueId: number) => {
      const res = await apiRequest("POST", `/api/confirm-payment/${queueId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/queue"] });
    },
  });

  const verifyPaymentMutation = useMutation({
    mutationFn: async ({ queueId, transactionRef }: { queueId: number; transactionRef: string }) => {
      const res = await apiRequest("GET", `/api/verify-payment/${queueId}/${transactionRef}`);
      return res.json();
    },
  });

  return {
    queue: queueQuery.data ?? [],
    isLoading: queueQuery.isLoading,
    isError: queueQuery.isError,
    updateStatus: updateStatusMutation.mutate,
    registerPatient: registerPatientMutation.mutateAsync,
    confirmPayment: confirmPaymentMutation.mutate,
    verifyPayment: verifyPaymentMutation.mutateAsync,
  };
}