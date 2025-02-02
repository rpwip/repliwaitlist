import { useQueue } from "@/hooks/use-queue";
import { Card } from "@/components/ui/card";
import QueueNumber from "@/components/queue-number";
import { Clock } from "lucide-react";
import { PatientHistoryModal } from "@/components/PatientHistoryModal";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

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
  const { user } = useAuth();
  const { queue, isLoading } = useQueue();
  const typedQueue = queue as QueueEntryWithWaitTime[];
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [showNewVisitForm, setShowNewVisitForm] = useState(false);
  const [currentClinicId, setCurrentClinicId] = useState<number | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const currentPatient = typedQueue.find((q) => q.status === "in-progress");
  const waitingPatients = typedQueue
    .filter((q) => q.status === "waiting")
    .slice(0, 5);

  const handleStartConsult = (patient: { id: number, clinicId: number }) => {
    console.log("Starting consult for patient:", patient);
    setSelectedPatientId(patient.id);
    setCurrentClinicId(patient.clinicId);
    setShowNewVisitForm(true);
  };

  const handleViewPatientHistory = (patient: { id: number, clinicId: number }) => {
    console.log("Viewing patient history for:", patient);
    setSelectedPatientId(patient.id);
    setCurrentClinicId(patient.clinicId);
    setShowNewVisitForm(false);
  };

  const handleCloseModal = () => {
    setSelectedPatientId(null);
    setShowNewVisitForm(false);
    setCurrentClinicId(null);
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="container mx-auto">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold text-primary">Cloud Cares</h1>
          <p className="text-xl text-muted-foreground mt-2">Queue Status</p>
        </header>

        <div className="grid md:grid-cols-2 gap-8">
          <Card className="p-8">
            <h2 className="text-2xl font-semibold mb-4">Now Serving</h2>
            {currentPatient ? (
              <div className="space-y-4">
                <QueueNumber
                  number={currentPatient.queueNumber}
                  className="text-8xl"
                />
                <p className="text-lg text-center">
                  {currentPatient.patient.fullName}
                </p>
                <Button 
                  onClick={() => handleStartConsult({
                    id: currentPatient.patient.id,
                    clinicId: currentPatient.clinicId
                  })}
                  className="w-full"
                >
                  Start Consultation
                </Button>
              </div>
            ) : (
              <p className="text-center text-muted-foreground">
                No patient currently being served
              </p>
            )}
          </Card>

          <Card className="p-8">
            <h2 className="text-2xl font-semibold mb-4">Next in Line</h2>
            <div className="space-y-4">
              {waitingPatients.map((patient) => (
                <div
                  key={patient.id}
                  className="flex items-center justify-between p-4 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
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
                  <div className="flex gap-2">
                    <Button 
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewPatientHistory({
                          id: patient.patient.id,
                          clinicId: patient.clinicId
                        });
                      }}
                    >
                      View History
                    </Button>
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

        {selectedPatientId && (
          <PatientHistoryModal
            patientId={selectedPatientId}
            onClose={handleCloseModal}
            open={!!selectedPatientId}
            showNewVisitForm={showNewVisitForm}
            doctorId={user?.id}
            clinicId={currentClinicId || undefined}
          />
        )}
      </div>
    </div>
  );
}