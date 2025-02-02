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

type QueueEntryWithWaitTime = {
  id: number;
  queueNumber: number;
  status: string;
  patient: {
    id: number;
    fullName: string;
  };
  estimatedWaitTime: number;
  clinicId: number;
};

export default function QueueDisplay() {
  const [selectedClinicId, setSelectedClinicId] = useState<number | null>(null);
  const { queue, isLoading, clinics, isError } = useQueue();
  const typedQueue = (queue || []) as QueueEntryWithWaitTime[];
  const currentDate = new Date();
  const formattedDate = format(currentDate, "EEEE, dd MMMM yyyy");

  useEffect(() => {
    // Get clinicId from URL parameters
    const params = new URLSearchParams(window.location.search);
    const clinicIdParam = params.get('clinicId');

    if (clinicIdParam) {
      setSelectedClinicId(parseInt(clinicIdParam));
    } else if (clinics && Array.isArray(clinics) && clinics.length > 0 && !selectedClinicId) {
      const yazhHealthcare = clinics.find(clinic => clinic.name === "Yazh Health Care");
      setSelectedClinicId(yazhHealthcare?.id || clinics[0].id);
    }
  }, [clinics, selectedClinicId]);

  if (isError) {
    return (
      <div className="min-h-screen bg-background p-8">
        <Alert variant="destructive" className="max-w-md mx-auto">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Failed to load clinic data. Please refresh the page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading || !clinics || !Array.isArray(clinics) || clinics.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // Filter queue based on selected clinic
  const filteredQueue = typedQueue.filter((q) => q.clinicId === selectedClinicId);

  const currentPatient = filteredQueue.find((q) => q.status === "in-progress");
  const waitingPatients = filteredQueue
    .filter((q) => q.status === "waiting")
    .sort((a, b) => a.queueNumber - b.queueNumber);

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
          {/* Currently Serving */}
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
                        {currentPatient.patient.fullName}
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

          {/* Waiting Patients */}
          <Card className="p-8">
            <h2 className="text-2xl font-semibold mb-4">Waiting Patients</h2>
            <div className="space-y-4">
              {waitingPatients.map((patient) => (
                <div
                  key={patient.id}
                  className="flex items-center justify-between p-4 bg-muted rounded-lg"
                >
                  <div className="flex items-center space-x-4">
                    <QueueNumber
                      number={patient.queueNumber}
                      className="text-4xl"
                    />
                    <div>
                      <p className="font-medium">{patient.patient.fullName}</p>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Clock className="h-4 w-4 mr-1" />
                        <span>
                          Est. wait: {patient.estimatedWaitTime} mins
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {waitingPatients.length === 0 && (
                <p className="text-center text-muted-foreground">
                  No patients waiting
                </p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}