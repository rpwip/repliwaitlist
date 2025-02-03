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
  clinicId: number;
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

          // Clear any existing reconnect timeout
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }

          if (user?.id) {
            console.log('Authenticating WebSocket with user ID:', user.id);
            ws.send(JSON.stringify({ type: 'AUTH', token: user.id.toString() }));
          } else {
            console.error('No user ID available for WebSocket authentication');
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
              console.log('Queue update received, invalidating query');
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

          // Only attempt reconnect if we have a user
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

    // Only attempt connection if we have a user
    if (user?.id) {
      connect();
    } else {
      console.log('No user logged in, skipping WebSocket connection');
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
    queryKey: ["/api/queue"],
    queryFn: async () => {
      console.log('Fetching queue data...');
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
        // Validate the data structure
        const validatedData = data.map((entry: any) => {
          console.log('Processing queue entry:', entry);
          if (!entry.patient || !entry.patient.id || !entry.patient.fullName) {
            console.error('Invalid patient data in queue entry:', entry);
          }
          return entry;
        });
        return validatedData;
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