import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type RegistrationData = {
  fullName: string;
  email: string | null;
  mobile: string;
  clinicId: number;
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

        ws.onerror = (error) => {
          console.error('WebSocket error occurred:', error);
          setIsConnected(false);
        };

        ws.onclose = () => {
          console.log('WebSocket disconnected');
          setIsConnected(false);
          setTimeout(connect, 5000);
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
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", "/api/queue");
        if (!res.ok) {
          const errorText = await res.text();
          console.error('Queue fetch error:', errorText);
          throw new Error('Failed to fetch queue data');
        }
        return res.json();
      } catch (error) {
        console.error('Error fetching queue:', error);
        throw error;
      }
    },
    retry: 1
  });

  const clinicsQuery = useQuery({
    queryKey: ["/api/clinics"],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", "/api/clinics");
        if (!res.ok) {
          const errorText = await res.text();
          console.error('Clinics fetch error:', errorText);
          throw new Error('Failed to fetch clinics data');
        }
        const data = await res.json();
        console.log('Fetched clinics:', data);
        return data;
      } catch (error) {
        console.error('Error fetching clinics:', error);
        throw error;
      }
    },
    retry: 1,
    onError: (error) => {
      toast({
        title: "Error fetching clinics",
        description: error instanceof Error ? error.message : "Failed to load clinics",
        variant: "destructive",
      });
    }
  });

  const registerPatientMutation = useMutation({
    mutationFn: async (data: RegistrationData) => {
      console.log('Starting patient registration with data:', data);
      try {
        const res = await apiRequest("POST", "/api/register-patient", data);
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
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const confirmPaymentMutation = useMutation({
    mutationFn: async (queueId: number) => {
      console.log('Confirming payment for queue ID:', queueId);
      const res = await apiRequest("POST", `/api/confirm-payment/${queueId}`);
      if (!res.ok) {
        const errorText = await res.text();
        console.error('Payment confirmation error:', errorText);
        throw new Error(errorText || "Failed to confirm payment");
      }
      const data = await res.json();
      console.log('Payment confirmation response:', data);
      return data;
    },
    onSuccess: () => {
      console.log('Payment confirmation successful, invalidating queue query');
      queryClient.invalidateQueries({ queryKey: ["/api/queue"] });
      toast({
        title: "Payment confirmed",
        description: "Your queue number has been activated.",
      });
    },
    onError: (error: Error) => {
      console.error('Payment confirmation failed:', error);
      toast({
        title: "Payment confirmation failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const verifyPaymentMutation = useMutation({
    mutationFn: async ({ queueId, transactionRef }: { queueId: number, transactionRef: string }) => {
      console.log('Verifying payment:', { queueId, transactionRef });
      const res = await apiRequest(
        "GET",
        `/api/verify-payment/${queueId}/${transactionRef}`
      );
      if (!res.ok) {
        const errorText = await res.text();
        console.error('Payment verification error:', errorText);
        throw new Error(errorText || "Failed to verify payment");
      }
      const data = await res.json();
      console.log('Payment verification response:', data);
      return data;
    }
  });

  return {
    queue: queueQuery.data ?? [],
    clinics: clinicsQuery.data ?? [],
    isLoading: queueQuery.isLoading || clinicsQuery.isLoading,
    isError: queueQuery.isError || clinicsQuery.isError,
    isConnected,
    registerPatient: registerPatientMutation.mutateAsync,
    confirmPayment: confirmPaymentMutation.mutateAsync,
    verifyPayment: verifyPaymentMutation.mutateAsync,
  };
}