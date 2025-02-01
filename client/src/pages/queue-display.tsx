import { useQueue } from "@/hooks/use-queue";
import { Card } from "@/components/ui/card";
import QueueNumber from "@/components/queue-number";
import { Clock } from "lucide-react";

type QueueEntryWithWaitTime = {
  id: number;
  queueNumber: number;
  status: string;
  patient: {
    fullName: string;
  };
  estimatedWaitTime: number;
};

export default function QueueDisplay() {
  const { queue, isLoading } = useQueue();
  const typedQueue = queue as QueueEntryWithWaitTime[];

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