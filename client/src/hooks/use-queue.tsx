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
          console.error('WebSocket error occurred');
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
      console.log('Starting patient registration with data:', data);
      try {
        const res = await apiRequest("POST", "/api/register-patient", data);
        console.log('Registration API response status:', res.status);

        if (!res.ok) {
          const errorText = await res.text();
          console.error('Registration API error:', errorText);
          throw new Error(errorText || 'Failed to register patient');
        }

        const jsonResponse = await res.json();
        console.log('Registration API success response:', jsonResponse);
        return jsonResponse;
      } catch (error) {
        console.error('Registration mutation error:', error);
        throw error;
      }
    },
    onSuccess: () => {
      console.log('Registration successful, invalidating queue query');
      queryClient.invalidateQueries({ queryKey: ["/api/queue"] });
    },
    onError: (error: Error) => {
      console.error('Registration mutation failed:', error);
      throw error;
    }
  });

  // Add payment verification mutation
  const verifyPaymentMutation = useMutation({
    mutationFn: async ({ queueId, transactionRef }: { queueId: number, transactionRef: string }) => {
      const res = await apiRequest(
        "GET",
        `/api/verify-payment/${queueId}/${transactionRef}`
      );
      return res.json();
    }
  });

  // Add payment confirmation mutation
  const confirmPaymentMutation = useMutation({
    mutationFn: async (queueId: number) => {
      const res = await apiRequest("POST", `/api/confirm-payment/${queueId}`);
      if (!res.ok) {
        throw new Error("Failed to confirm payment");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/queue"] });
      toast({
        title: "Payment confirmed",
        description: "Your queue number has been activated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Payment confirmation failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    queue: queueQuery.data ?? [],
    clinics: clinicsQuery.data ?? [],
    isLoading: queueQuery.isLoading || clinicsQuery.isLoading,
    isError: queueQuery.isError || clinicsQuery.isError,
    isConnected,
    registerPatient: registerPatientMutation.mutateAsync,
    verifyPayment: verifyPaymentMutation.mutateAsync,
    confirmPayment: confirmPaymentMutation.mutateAsync,
  };
}