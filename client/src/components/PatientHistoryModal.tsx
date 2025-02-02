import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Activity,
  AlertCircle,
  CalendarDays,
  ClipboardList,
  Pill,
  User2
} from "lucide-react";

type PatientHistory = {
  id: number;
  fullName: string;
  visits: Array<{
    id: number;
    visitedAt: string;
    symptoms: string;
    diagnosis: string;
    treatment: string;
    doctorId: number;
  }>;
  diagnoses: Array<{
    id: number;
    diagnosedAt: string;
    condition: string;
    status: string;
    notes: string;
    doctorId: number;
  }>;
  prescriptions: Array<{
    id: number;
    createdAt: string;
    medications: Array<{
      name: string;
      dosage: string;
      frequency: string;
    }>;
    instructions: string;
    isActive: boolean;
    doctorId: number;
  }>;
  appointments: Array<{
    id: number;
    scheduledFor: string;
    status: string;
    reason: string;
    doctorId: number;
  }>;
};

interface PatientHistoryModalProps {
  patientId: number | null;
  onClose: () => void;
}

export function PatientHistoryModal({ patientId, onClose }: PatientHistoryModalProps) {
  const { data: history, isLoading, error } = useQuery<PatientHistory>({
    queryKey: ["/api/doctor/patient-history", patientId],
    queryFn: async () => {
      if (!patientId) throw new Error("No patient ID provided");
      console.log("Fetching patient history for ID:", patientId);
      try {
        const response = await fetch(`/api/doctor/patient-history/${patientId}`, {
          credentials: "include",
          headers: {
            "Accept": "application/json",
            "Cache-Control": "no-cache"
          }
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Failed to fetch patient history:", errorText);
          throw new Error(`Failed to fetch patient history: ${errorText}`);
        }

        const data = await response.json();
        console.log("Received patient history data:", data);
        return data as PatientHistory;
      } catch (err) {
        console.error("Error in patient history fetch:", err);
        throw err;
      }
    },
    enabled: !!patientId,
    retry: 1,
    gcTime: 0
  });

  if (!patientId) return null;

  return (
    <Dialog open={!!patientId} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl h-[80vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold">
            Patient History: {history?.fullName}
          </DialogTitle>
        </DialogHeader>

        {error ? (
          <div className="flex items-center justify-center h-full text-destructive">
            {error instanceof Error ? error.message : 'An error occurred'}
          </div>
        ) : (
          <Tabs defaultValue="overview" className="w-full h-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <User2 className="h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="diagnoses" className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Diagnoses
              </TabsTrigger>
              <TabsTrigger value="prescriptions" className="flex items-center gap-2">
                <Pill className="h-4 w-4" />
                Prescriptions
              </TabsTrigger>
              <TabsTrigger value="visits" className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Visits & Notes
              </TabsTrigger>
            </TabsList>

            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : !history ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">Failed to load patient history</p>
              </div>
            ) : (
              <ScrollArea className="h-[calc(80vh-10rem)] mt-4">
                <TabsContent value="overview" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <AlertCircle className="h-5 w-5" />
                        Active Conditions
                      </h3>
                      <div className="space-y-2">
                        {history.diagnoses
                          .filter(d => d.status === "Active")
                          .map(diagnosis => (
                            <div key={diagnosis.id} className="p-3 border rounded-lg">
                              <div className="font-medium">{diagnosis.condition}</div>
                              <div className="text-sm text-muted-foreground">
                                Diagnosed on {format(new Date(diagnosis.diagnosedAt), 'PP')}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Pill className="h-5 w-5" />
                        Current Medications
                      </h3>
                      <div className="space-y-2">
                        {history.prescriptions
                          .filter(p => p.isActive)
                          .map(prescription => (
                            <div key={prescription.id} className="p-3 border rounded-lg">
                              {prescription.medications.map((med, idx) => (
                                <div key={idx} className="mb-2">
                                  <div className="font-medium">{med.name}</div>
                                  <div className="text-sm text-muted-foreground">
                                    {med.dosage} • {med.frequency}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6">
                    <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                      <CalendarDays className="h-5 w-5" />
                      Recent Activity
                    </h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Details</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {[
                          ...history.visits.map(v => ({
                            date: v.visitedAt,
                            type: "Visit",
                            details: v.diagnosis,
                          })),
                          ...history.diagnoses.map(d => ({
                            date: d.diagnosedAt,
                            type: "Diagnosis",
                            details: d.condition,
                          })),
                          ...history.prescriptions.map(p => ({
                            date: p.createdAt,
                            type: "Prescription",
                            details: p.medications.map(m => m.name).join(", "),
                          }))
                        ]
                          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                          .slice(0, 10)
                          .map((activity, idx) => (
                            <TableRow key={idx}>
                              <TableCell>{format(new Date(activity.date), 'PP')}</TableCell>
                              <TableCell>
                                <Badge variant={
                                  activity.type === "Visit" ? "default" :
                                  activity.type === "Diagnosis" ? "destructive" : "secondary"
                                }>
                                  {activity.type}
                                </Badge>
                              </TableCell>
                              <TableCell>{activity.details}</TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>

                <TabsContent value="diagnoses">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Condition</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {history.diagnoses.map(diagnosis => (
                        <TableRow key={diagnosis.id}>
                          <TableCell>{format(new Date(diagnosis.diagnosedAt), 'PP')}</TableCell>
                          <TableCell className="font-medium">{diagnosis.condition}</TableCell>
                          <TableCell>
                            <Badge variant={diagnosis.status === "Active" ? "destructive" : "secondary"}>
                              {diagnosis.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{diagnosis.notes}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TabsContent>

                <TabsContent value="prescriptions">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Medications</TableHead>
                        <TableHead>Instructions</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {history.prescriptions.map(prescription => (
                        <TableRow key={prescription.id}>
                          <TableCell>{format(new Date(prescription.createdAt), 'PP')}</TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {prescription.medications.map((med, idx) => (
                                <div key={idx}>
                                  <span className="font-medium">{med.name}</span>
                                  <br />
                                  <span className="text-sm text-muted-foreground">
                                    {med.dosage} • {med.frequency}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>{prescription.instructions}</TableCell>
                          <TableCell>
                            <Badge variant={prescription.isActive ? "default" : "secondary"}>
                              {prescription.isActive ? "Active" : "Completed"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TabsContent>

                <TabsContent value="visits">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Symptoms</TableHead>
                        <TableHead>Diagnosis</TableHead>
                        <TableHead>Treatment</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {history.visits.map(visit => (
                        <TableRow key={visit.id}>
                          <TableCell>{format(new Date(visit.visitedAt), 'PP')}</TableCell>
                          <TableCell>{visit.symptoms}</TableCell>
                          <TableCell>{visit.diagnosis}</TableCell>
                          <TableCell>{visit.treatment}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TabsContent>
              </ScrollArea>
            )}
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}