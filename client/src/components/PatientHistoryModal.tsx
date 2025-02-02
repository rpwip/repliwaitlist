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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Activity,
  AlertCircle,
  CalendarDays,
  ClipboardList,
  Pill,
  User2,
  Search,
  Plus,
  XCircle
} from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

// Enhanced type definitions
interface PatientHistoryModalProps {
  patientId: number | null;
  onClose: () => void;
  open: boolean;
}

// Add types for new functionality
type CommonDisease = {
  id: string;
  name: string;
  isActive: boolean;
  category: string;
};

type MedicationSuggestion = {
  brandName: string;
  genericName: string;
  isCloudCarePartner: boolean;
  dosageRecommendation: string;
  frequencyRecommendation: string;
};

export function PatientHistoryModal({ patientId, onClose, open }: PatientHistoryModalProps) {
  const { toast } = useToast();
  const [selectedDisease, setSelectedDisease] = useState<string>("");
  const [customDisease, setCustomDisease] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [comments, setComments] = useState<string>("");

  // Fetch patient history
  const { data: history, isLoading, error } = useQuery({
    queryKey: ["/api/doctor/patient-history", patientId],
    queryFn: async () => {
      if (!patientId) throw new Error("No patient ID provided");
      const response = await fetch(`/api/doctor/patient-history/${patientId}`, {
        credentials: "include"
      });
      if (!response.ok) throw new Error("Failed to fetch patient history");
      return response.json();
    },
    enabled: !!patientId,
  });

  // Fetch common diseases
  const { data: commonDiseases } = useQuery({
    queryKey: ["/api/common-diseases", searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append("search", searchTerm);
      const response = await fetch(`/api/common-diseases?${params}`);
      if (!response.ok) throw new Error("Failed to fetch common diseases");
      return response.json();
    },
  });

  // Fetch medication suggestions based on selected disease
  const { data: medicationSuggestions } = useQuery({
    queryKey: ["/api/medication-suggestions", selectedDisease],
    queryFn: async () => {
      if (!selectedDisease) return [];
      const response = await fetch(`/api/medication-suggestions/${selectedDisease}`);
      if (!response.ok) throw new Error("Failed to fetch medication suggestions");
      return response.json();
    },
    enabled: !!selectedDisease,
  });

  // Mutations for updating diagnoses and prescriptions
  const updateDiagnosis = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const response = await fetch(`/api/diagnoses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error("Failed to update diagnosis");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Diagnosis updated successfully",
      });
    },
  });

  const addNewVisit = useMutation({
    mutationFn: async (visitData: any) => {
      const response = await fetch("/api/visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(visitData),
      });
      if (!response.ok) throw new Error("Failed to add new visit");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Visit record added successfully",
      });
      onClose();
    },
  });

  if (!patientId) return null;

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-6xl h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold">
            Patient History: {history?.fullName}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 h-full">
          {/* Left Side - Patient History */}
          <div className="border-r pr-4">
            <Tabs defaultValue="overview">
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

              <ScrollArea className="h-[calc(90vh-12rem)] mt-4">
              <TabsContent value="overview" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <AlertCircle className="h-5 w-5" />
                        Active Conditions
                      </h3>
                      <div className="space-y-2">
                        {history?.diagnoses
                          ?.filter(d => d.status === "Active")
                          ?.map(diagnosis => (
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
                        {history?.prescriptions
                          ?.filter(p => p.isActive)
                          ?.map(prescription => (
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
                          ...(history?.visits?.map(v => ({
                            date: v.visitedAt,
                            type: "Visit",
                            details: v.diagnosis,
                          })) || []),
                          ...(history?.diagnoses?.map(d => ({
                            date: d.diagnosedAt,
                            type: "Diagnosis",
                            details: d.condition,
                          })) || []),
                          ...(history?.prescriptions?.map(p => ({
                            date: p.createdAt,
                            type: "Prescription",
                            details: p.medications.map(m => m.name).join(", "),
                          })) || [])
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
                      {history?.diagnoses?.map(diagnosis => (
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
                      {history?.prescriptions?.map(prescription => (
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
                      {history?.visits?.map(visit => (
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
            </Tabs>
          </div>

          {/* Right Side - New Visit Form */}
          <div className="pl-4">
            <h3 className="text-lg font-semibold mb-4">New Visit Record</h3>

            {/* Disease Selection */}
            <div className="space-y-4 mb-6">
              <h4 className="font-medium">Common Health Issues</h4>
              <div className="flex flex-wrap gap-2">
                {commonDiseases?.slice(0, 6).map((disease: CommonDisease) => (
                  <Button
                    key={disease.id}
                    variant={selectedDisease === disease.id ? "default" : "outline"}
                    onClick={() => setSelectedDisease(disease.id)}
                    size="sm"
                  >
                    {disease.name}
                  </Button>
                ))}
              </div>

              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search other conditions..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {searchTerm && (
                <div className="border rounded-md p-2">
                  {commonDiseases?.map((disease: CommonDisease) => (
                    <div
                      key={disease.id}
                      className="p-2 hover:bg-accent cursor-pointer"
                      onClick={() => {
                        setSelectedDisease(disease.id);
                        setSearchTerm("");
                      }}
                    >
                      {disease.name}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Medication Suggestions */}
            {selectedDisease && (
              <div className="space-y-4 mb-6">
                <h4 className="font-medium">Recommended Medications</h4>
                <div className="space-y-2">
                  {medicationSuggestions?.map((med: MedicationSuggestion) => (
                    <div
                      key={med.brandName}
                      className="border rounded-lg p-3 hover:bg-accent/50"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{med.brandName}</p>
                          <p className="text-sm text-muted-foreground">
                            {med.genericName}
                          </p>
                        </div>
                        {med.isCloudCarePartner && (
                          <Badge variant="secondary">CloudCare Partner</Badge>
                        )}
                      </div>
                      <div className="mt-2 text-sm">
                        <p>Dosage: {med.dosageRecommendation}</p>
                        <p>Frequency: {med.frequencyRecommendation}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Comments Section */}
            <div className="space-y-2 mb-6">
              <h4 className="font-medium">Visit Notes</h4>
              <Textarea
                placeholder="Add any additional notes or observations..."
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                className="min-h-[100px]"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  addNewVisit.mutate({
                    patientId,
                    diagnosis: selectedDisease,
                    comments,
                    // Add other necessary data
                  });
                }}
              >
                Save Visit Record
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}