import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";
import {
  Users,
  Calendar,
  ClipboardList,
  Search,
  UserRound,
  Clock,
  TrendingUp,
  Building2,
  Award,
  Activity,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Box,
  BadgeCheck,
  MapPin,
  Phone,
  Mail,
  Calendar as CalendarIcon,
  Pill,
  User,
} from "lucide-react";
import { format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import ConsultationView from "./consultation-view";
import type { SelectDoctorMetrics, SelectClinic } from "@db/schema";
import { useAuth } from "@/hooks/use-auth";

type QueueEntry = {
  id: number;
  queueNumber: number;
  status: string;
  fullName: string;
  estimatedWaitTime: number;
  createdAt: string;
  patientId?: number;
  patient?: {
    id: number;
    fullName: string;
  };
  vitals?: {
    bp?: string;
    temperature?: string;
    pulse?: string;
    spo2?: string;
  };
  visitReason?: string;
};

export default function DoctorPortal() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [view, setView] = useState<"overview" | "queue" | "patients" | "prescriptions" | "consultation">("overview");
  const [selectedClinicId, setSelectedClinicId] = useState<number | null>(null);
  const [currentQueueEntry, setCurrentQueueEntry] = useState<QueueEntry | null>(null);

  // Fetch queue data
  const { data: queueData, refetch: refetchQueue } = useQuery({
    queryKey: ["/api/queue", selectedClinicId],
    queryFn: async () => {
      if (!selectedClinicId) return null;
      const response = await fetch(`/api/queue/${selectedClinicId}`);
      if (!response.ok) throw new Error("Failed to fetch queue");
      return response.json();
    },
    enabled: !!selectedClinicId,
  });

  const handleStartConsultation = (entry: QueueEntry) => {
    try {
      // Format the entry with all required fields
      const formattedEntry: QueueEntry = {
        ...entry,
        patient: {
          fullName: entry.fullName,
          id: entry.patientId || 0
        },
        patientId: entry.patientId || entry.patient?.id || 0,
        vitals: entry.vitals || {
          bp: 'N/A',
          temperature: 'N/A',
          pulse: 'N/A',
          spo2: 'N/A'
        },
        visitReason: entry.visitReason || 'Not specified'
      };

      if (!formattedEntry.patientId) {
        toast({
          title: "Error",
          description: "Patient ID is missing",
          variant: "destructive",
        });
        return;
      }

      setCurrentQueueEntry(formattedEntry);
      setView("consultation");
    } catch (error) {
      console.error('Error starting consultation:', error);
      toast({
        title: "Error",
        description: "Failed to start consultation. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Queue view component
  const renderQueue = () => (
    <div className="space-y-6">
      {/* Queue and Patient Details Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Left Side - Queue List */}
        <Card>
          <CardHeader>
            <CardTitle>Current Queue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!queueData ? (
              <div className="flex items-center justify-center p-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : queueData.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No patients in queue</p>
            ) : (
              queueData.map((entry: QueueEntry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center space-x-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <UserRound className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">
                        #{entry.queueNumber} - {entry.fullName || entry.patient?.fullName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Waiting time: {entry.estimatedWaitTime}min
                      </p>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleStartConsultation(entry)}
                  >
                    Start Consultation
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 border-r min-h-screen p-4">
          <nav className="space-y-2">
            <Button
              variant={view === "overview" ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => setView("overview")}
            >
              <PieChart className="mr-2 h-4 w-4" />
              Overview
            </Button>
            <Button
              variant={view === "queue" ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => setView("queue")}
            >
              <Users className="mr-2 h-4 w-4" />
              Queue
            </Button>
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6">
          {view === "consultation" && currentQueueEntry ? (
            <ConsultationView
              patientId={currentQueueEntry.patientId || currentQueueEntry.patient?.id || 0}
              doctorId={user?.id || 0}
              clinicId={selectedClinicId || 0}
              currentVisit={{
                vitals: currentQueueEntry.vitals || {
                  bp: 'N/A',
                  temperature: 'N/A',
                  pulse: 'N/A',
                  spo2: 'N/A'
                },
                visitReason: currentQueueEntry.visitReason || 'Not specified'
              }}
            />
          ) : view === "queue" ? (
            renderQueue()
          ) : (
            <div>Select a view from the sidebar</div>
          )}
        </div>
      </div>
    </div>
  );
}