import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

type QueueEntry = {
  id: number;
  queueNumber: number;
  status: string;
  patientId: number;
  patientName: string;
  estimatedWaitTime: number;
  createdAt: string;
  clinicId: number;
  clinicName: string;
  priority: number;
};

type RegistrationData = {
  fullName: string;
  email: string | null;
  mobile: string;
  clinicId: number;
};

type UpdateStatusData = {
  queueId: number;
  status: "waiting" | "in-progress" | "completed" | "cancelled";
};

export function useQueue() {
  const { toast } = useToast();
  const { user } = useAuth();
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  // WebSocket connection setup
  useEffect(() => {
    function connect() {
      if (wsRef.current?.readyState === WebSocket.OPEN) return;

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const ws = new WebSocket(`${protocol}//${host}/ws`);

      ws.onopen = () => {
        setIsConnected(true);
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }

        if (user?.id) {
          ws.send(JSON.stringify({ type: 'AUTH', token: user.id.toString() }));
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "QUEUE_UPDATE") {
            queryClient.invalidateQueries({ queryKey: ["/api/queues"] });
          }
        } catch (error) {
          console.error('WebSocket message parsing error:', error);
        }
      };

      ws.onerror = () => setIsConnected(false);

      ws.onclose = () => {
        setIsConnected(false);
        if (user?.id) {
          reconnectTimeoutRef.current = setTimeout(connect, 5000);
        }
      };

      wsRef.current = ws;
    }

    if (user?.id) {
      connect();
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [user, toast]);

  // Queue data query
  const queueQuery = useQuery<QueueEntry[]>({
    queryKey: ["/api/queues"],
    queryFn: async () => {
      const response = await fetch('/api/queues', { credentials: 'include' });
      if (!response.ok) {
        throw new Error('Failed to fetch queue data');
      }
      return response.json();
    },
    retry: 1,
    enabled: !!user
  });

  // Status update mutation
  const updateStatusMutation = useMutation({
    mutationFn: async (data: UpdateStatusData) => {
      const response = await fetch(`/api/queues/entries/${data.queueId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: data.status }),
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to update status');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/queues"] });
      toast({
        title: "Status updated",
        description: "Queue has been updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update status",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Clinics query
  const clinicsQuery = useQuery({
    queryKey: ["/api/clinics"],
    queryFn: async () => {
      const response = await fetch('/api/clinics', { credentials: 'include' });
      if (!response.ok) {
        throw new Error('Failed to fetch clinics data');
      }
      return response.json();
    },
    retry: 1,
    enabled: !!user
  });

  // Patient registration mutation
  const registerPatientMutation = useMutation({
    mutationFn: async (data: RegistrationData) => {
      const response = await fetch('/api/register-patient', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to register patient');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/queues"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  return {
    queue: queueQuery.data ?? [],
    clinics: clinicsQuery.data ?? [],
    isLoading: queueQuery.isLoading || clinicsQuery.isLoading,
    isError: queueQuery.isError || clinicsQuery.isError,
    isConnected,
    registerPatient: registerPatientMutation.mutateAsync,
    updateStatus: updateStatusMutation.mutateAsync,
  };
}
