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

  useEffect(() => {
    function connect() {
      if (wsRef.current?.readyState === WebSocket.OPEN) return;

      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        const ws = new WebSocket(`${protocol}//${host}/ws`);
        console.log('Attempting WebSocket connection to:', `${protocol}//${host}/ws`);

        ws.onopen = () => {
          console.log('WebSocket connected');
          setIsConnected(true);

          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }

          if (user?.id) {
            console.log('Authenticating WebSocket with user ID:', user.id);
            ws.send(JSON.stringify({ type: 'AUTH', token: user.id.toString() }));
          }
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('WebSocket message received:', data);

            if (data.type === "CONNECTED") {
              if (data.authenticated) {
                console.log('WebSocket authenticated successfully');
                toast({
                  title: "Connected",
                  description: "Real-time updates are now active",
                });
              } else if (data.error) {
                console.error('WebSocket authentication failed:', data.error);
                toast({
                  title: "Connection Error",
                  description: data.error,
                  variant: "destructive",
                });
              }
            } else if (data.type === "QUEUE_UPDATE") {
              console.log('Queue update received, invalidating queries');
              queryClient.invalidateQueries({ queryKey: ["/api/queues"] });
            }
          } catch (error) {
            console.error('WebSocket message parsing error:', error);
          }
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          setIsConnected(false);
        };

        ws.onclose = () => {
          console.log('WebSocket disconnected');
          setIsConnected(false);

          if (user?.id) {
            console.log('Scheduling reconnection attempt...');
            reconnectTimeoutRef.current = setTimeout(connect, 5000);
          }
        };

        wsRef.current = ws;
      } catch (error) {
        console.error('WebSocket connection error:', error);
        setIsConnected(false);
      }
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

  const queueQuery = useQuery<QueueEntry[]>({
    queryKey: ["/api/queues"],
    queryFn: async () => {
      console.log('Fetching queue data...');
      const response = await fetch('/api/queues', { credentials: 'include' });
      if (!response.ok) {
        throw new Error('Failed to fetch queue data');
      }
      return response.json();
    },
    retry: 1,
    enabled: !!user
  });

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