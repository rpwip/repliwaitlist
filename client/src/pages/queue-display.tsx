import { useQueue } from "@/hooks/use-queue";
import { Card } from "@/components/ui/card";
import QueueNumber from "@/components/queue-number";

export default function QueueDisplay() {
  const { queue, isLoading } = useQueue();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const currentPatient = queue.find((q) => q.status === "in-progress");
  const waitingPatients = queue
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
              <QueueNumber
                number={currentPatient.queueNumber}
                className="text-8xl"
              />
            ) : (
              <p className="text-center text-muted-foreground">No patient currently being served</p>
            )}
          </Card>

          <Card className="p-8">
            <h2 className="text-2xl font-semibold mb-4">Next in Line</h2>
            <div className="grid grid-cols-2 gap-4">
              {waitingPatients.map((patient) => (
                <QueueNumber
                  key={patient.id}
                  number={patient.queueNumber}
                  className="text-4xl"
                />
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
