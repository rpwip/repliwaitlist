import { useQueue } from "@/hooks/use-queue";
import { Card } from "@/components/ui/card";
import QueueNumber from "@/components/queue-number";
import { Clock, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useQuery } from "@tanstack/react-query";

export default function Queue() {
  const [selectedClinicId, setSelectedClinicId] = useState<number | null>(null);
  const { clinics, isLoading: isLoadingClinics } = useQueue();
  const currentDate = new Date();
  const formattedDate = format(currentDate, "EEEE, dd MMMM yyyy");

  // Get clinicId from URL parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const clinicIdParam = params.get('clinicId');
    if (clinicIdParam) {
      setSelectedClinicId(parseInt(clinicIdParam));
    }
  }, []);

  // Fetch clinic-specific queue
  const { data: clinicQueue, isLoading: isLoadingQueue, isError } = useQuery({
    queryKey: ['/api/queues', selectedClinicId],
    queryFn: async () => {
      if (!selectedClinicId) return [];
      const response = await fetch(`/api/queues/${selectedClinicId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch queue data');
      }
      return response.json();
    },
    enabled: !!selectedClinicId,
  });

  if (isError) {
    return (
      <div className="min-h-screen bg-background p-8">
        <Alert variant="destructive" className="max-w-md mx-auto">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Failed to load queue data. Please try again.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoadingClinics || isLoadingQueue) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const currentPatient = clinicQueue?.find(q => q.status === "in-progress");
  const waitingPatients = clinicQueue
    ?.filter(q => q.status === "waiting")
    .sort((a, b) => a.queueNumber - b.queueNumber) || [];

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="container mx-auto">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold text-primary">Cloud Cares</h1>
          <p className="text-xl text-muted-foreground mt-2">Queue Status</p>
        </header>

        <div className="flex items-center justify-between mb-8">
          <Select
            value={selectedClinicId?.toString()}
            onValueChange={(value) => setSelectedClinicId(parseInt(value))}
          >
            <SelectTrigger className="w-[280px]">
              <SelectValue placeholder="Select clinic" />
            </SelectTrigger>
            <SelectContent>
              {Array.isArray(clinics) && clinics.map((clinic) => (
                <SelectItem key={clinic.id} value={clinic.id.toString()}>
                  {clinic.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-lg font-medium">{formattedDate}</span>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Waiting Patients - Left Side */}
          <Card className="p-8">
            <h2 className="text-2xl font-semibold mb-4">Waiting Patients</h2>
            <div className="space-y-4">
              {waitingPatients.length > 0 ? (
                waitingPatients.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between p-4 bg-muted rounded-lg"
                  >
                    <div className="flex items-center space-x-4">
                      <QueueNumber
                        number={entry.queueNumber}
                        className="text-4xl"
                      />
                      <div>
                        <p className="font-medium">{entry.patientName}</p>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Clock className="h-4 w-4 mr-1" />
                          <span>
                            Est. wait: {entry.estimatedWaitTime} mins
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground">
                  No patients waiting
                </p>
              )}
            </div>
          </Card>

          {/* Now Serving - Right Side */}
          <Card className="p-8">
            <h2 className="text-2xl font-semibold mb-4">Now Serving</h2>
            {currentPatient ? (
              <div className="space-y-4">
                <div className="flex items-center justify-center">
                  <div className="text-center">
                    <QueueNumber
                      number={currentPatient.queueNumber}
                      className="text-8xl"
                    />
                    <div className="mt-4 flex items-center justify-center space-x-2">
                      <UserRound className="h-6 w-6 text-muted-foreground" />
                      <p className="text-lg">
                        {currentPatient.patientName}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-center text-muted-foreground">
                No patient currently being served
              </p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}