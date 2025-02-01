import { useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";

export function useQueue() {
  useEffect(() => {
    // Use window.location to determine WebSocket protocol
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

    ws.onmessage = () => {
      // Invalidate and refetch queue data when we receive a WebSocket message
      queryClient.invalidateQueries({ queryKey: ["/api/queue"] });
    };

    return () => ws.close();
  }, []);

  const queueQuery = useQuery<any[]>({
    queryKey: ["/api/queue"],
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
    updateStatus: updateStatusMutation.mutate,
    registerPatient: registerPatientMutation.mutateAsync,
    confirmPayment: confirmPaymentMutation.mutate,
    verifyPayment: verifyPaymentMutation.mutateAsync,
  };
}