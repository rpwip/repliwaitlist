import { useQueue } from "@/hooks/use-queue";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function AdminDashboard() {
  const { queue, updateStatus } = useQueue();
  const { user, logoutMutation } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground p-4">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <div className="flex items-center gap-4">
            <span>Welcome, {user?.username}</span>
            <Button
              variant="secondary"
              onClick={() => logoutMutation.mutate()}
            >
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto py-8">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Queue #</TableHead>
              <TableHead>Patient Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {queue.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell>{entry.queueNumber}</TableCell>
                <TableCell>{entry.patient.fullName}</TableCell>
                <TableCell>{entry.status}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    {entry.status === "waiting" && (
                      <Button
                        size="sm"
                        onClick={() =>
                          updateStatus({
                            queueId: entry.id,
                            status: "in-progress",
                          })
                        }
                      >
                        Start
                      </Button>
                    )}
                    {entry.status === "in-progress" && (
                      <Button
                        size="sm"
                        onClick={() =>
                          updateStatus({
                            queueId: entry.id,
                            status: "completed",
                          })
                        }
                      >
                        Complete
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </main>
    </div>
  );
}