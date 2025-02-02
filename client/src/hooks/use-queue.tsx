import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

type QueueEntry = {
  id: number;
  queueNumber: number;
  status: string;
  patientId: number;
  patient: {
    id: number;
    fullName: string;
  };
  estimatedWaitTime: number;
  createdAt: string;
};

type RegistrationData = {
  fullName: string;
  email: string | null;
  mobile: string;
  clinicId: number;
};

type UpdateStatusData = {
  queueId: number;
  status: "waiting" | "in-progress" | "completed";
};

export function useQueue() {
  const { toast } = useToast();
  const { user } = useAuth();
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

          if (user) {
            ws.send(JSON.stringify({ type: 'AUTH', token: user.id }));
          }
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === "QUEUE_UPDATE") {
              console.log('Received queue update, invalidating query');
              queryClient.invalidateQueries({ queryKey: ["/api/queue"] });
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
          if (user) {
            setTimeout(connect, 5000);
          }
        };

        wsRef.current = ws;
      } catch (error) {
        console.error('WebSocket connection error:', error);
        setIsConnected(false);
      }
    }

    if (user) {
      connect();
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [user]);

  const queueQuery = useQuery<QueueEntry[]>({
    queryKey: ["/api/queue"],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", "/api/queue", undefined, {
          credentials: 'include'
        });
        if (!res.ok) {
          const errorText = await res.text();
          console.error('Queue fetch error:', errorText);
          throw new Error('Failed to fetch queue data');
        }
        const data = await res.json();
        console.log('Queue data received:', data);
        return data;
      } catch (error) {
        console.error('Error fetching queue:', error);
        throw error;
      }
    },
    retry: 1,
    enabled: !!user
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (data: UpdateStatusData) => {
      console.log('Updating status:', data);
      const res = await apiRequest(
        "POST",
        `/api/queue/${data.queueId}/status`,
        { status: data.status },
        { credentials: 'include' }
      );
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || 'Failed to update status');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/queue"] });
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
      try {
        const res = await apiRequest("GET", "/api/clinics", undefined, {
          credentials: 'include'
        });
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
    enabled: !!user
  });

  const registerPatientMutation = useMutation({
    mutationFn: async (data: RegistrationData) => {
      console.log('Starting patient registration with data:', data);
      try {
        const res = await apiRequest("POST", "/api/register-patient", data, {
          credentials: 'include'
        });
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