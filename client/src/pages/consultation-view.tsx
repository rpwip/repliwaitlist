import { useQuery, useMutation } from "@tanstack/react-query";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  AlertCircle,
  Activity,
  Search,
  User2,
  Pill,
  Plus,
  Clock,
  CalendarDays,
} from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

type ConsultationViewProps = {
  patientId: number;
  doctorId: number;
  clinicId: number;
  currentVisit?: {
    vitals?: {
      bp?: string;
      temperature?: string;
      pulse?: string;
      spo2?: string;
    };
    visitReason?: string;
  };
};

export default function ConsultationView({
  patientId,
  doctorId,
  clinicId,
  currentVisit,
}: ConsultationViewProps) {
  const { toast } = useToast();
  const [selectedDisease, setSelectedDisease] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [comments, setComments] = useState<string>("");
  const [selectedPrescriptions, setSelectedPrescriptions] = useState<Array<{
    brandName: string;
    dosage: string;
    frequency: string;
  }>>([]);

  // Fetch patient history
  const { data: history, isLoading } = useQuery({
    queryKey: ["/api/doctor/patient-history", patientId],
    queryFn: async () => {
      const response = await fetch(`/api/doctor/patient-history/${patientId}`);
      if (!response.ok) throw new Error("Failed to fetch patient history");
      return response.json();
    },
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

  // Mutation to save visit record
  const saveVisit = useMutation({
    mutationFn: async (visitData: any) => {
      const response = await fetch("/api/visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(visitData),
      });
      if (!response.ok) throw new Error("Failed to save visit record");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Visit record saved successfully",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-6 p-6 h-[calc(100vh-4rem)]">
      {/* Left Side - Patient History */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Patient Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <User2 className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-medium">{history?.fullName}</h3>
                  <p className="text-sm text-muted-foreground">
                    Last visit: {history?.visits?.[0]?.visitedAt && 
                      format(new Date(history.visits[0].visitedAt), 'PP')}
                  </p>
                </div>
              </div>

              <Tabs defaultValue="active">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="active">Active Conditions</TabsTrigger>
                  <TabsTrigger value="medications">Current Medications</TabsTrigger>
                  <TabsTrigger value="history">Visit History</TabsTrigger>
                </TabsList>

                <ScrollArea className="h-[calc(100vh-24rem)]">
                  <TabsContent value="active" className="space-y-4">
                    {history?.diagnoses
                      ?.filter((d: any) => d.status === "active")
                      ?.map((diagnosis: any) => (
                        <div key={diagnosis.id} className="p-3 border rounded-lg">
                          <div className="font-medium">{diagnosis.condition}</div>
                          <div className="text-sm text-muted-foreground">
                            Since: {format(new Date(diagnosis.diagnosedAt), 'PP')}
                          </div>
                          {diagnosis.notes && (
                            <div className="mt-2 text-sm">{diagnosis.notes}</div>
                          )}
                        </div>
                      ))}
                  </TabsContent>

                  <TabsContent value="medications" className="space-y-4">
                    {history?.prescriptions
                      ?.filter((p: any) => p.isActive)
                      ?.map((prescription: any) => (
                        <div key={prescription.id} className="p-3 border rounded-lg">
                          {prescription.medications.map((med: any, idx: number) => (
                            <div key={idx} className="mb-2">
                              <div className="font-medium">{med.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {med.dosage} - {med.frequency}
                              </div>
                            </div>
                          ))}
                          {prescription.instructions && (
                            <div className="mt-2 text-sm border-t pt-2">
                              {prescription.instructions}
                            </div>
                          )}
                        </div>
                      ))}
                  </TabsContent>

                  <TabsContent value="history">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Details</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {history?.visits?.map((visit: any) => (
                          <TableRow key={visit.id}>
                            <TableCell>
                              {format(new Date(visit.visitedAt), 'PP')}
                            </TableCell>
                            <TableCell>Visit</TableCell>
                            <TableCell>{visit.symptoms}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TabsContent>
                </ScrollArea>
              </Tabs>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Side - New Visit Form */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>New Visit Record</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Vitals Section */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Blood Pressure</label>
                  <div className="mt-1">
                    <Badge variant="outline">{currentVisit?.vitals?.bp || 'N/A'}</Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Temperature</label>
                  <div className="mt-1">
                    <Badge variant="outline">
                      {currentVisit?.vitals?.temperature || 'N/A'}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Pulse</label>
                  <div className="mt-1">
                    <Badge variant="outline">
                      {currentVisit?.vitals?.pulse || 'N/A'} bpm
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">SpO2</label>
                  <div className="mt-1">
                    <Badge variant="outline">
                      {currentVisit?.vitals?.spo2 || 'N/A'}%
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Visit Reason */}
              <div>
                <label className="text-sm font-medium">Reason for Visit</label>
                <p className="mt-1 text-sm">
                  {currentVisit?.visitReason || 'Not specified'}
                </p>
              </div>

              {/* Disease Selection */}
              <div className="space-y-4">
                <h4 className="font-medium">Common Health Issues</h4>
                <div className="flex flex-wrap gap-2">
                  {commonDiseases?.slice(0, 6).map((disease: any) => (
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

                {searchTerm && commonDiseases?.length > 0 && (
                  <Card>
                    <CardContent className="p-2">
                      {commonDiseases.map((disease: any) => (
                        <div
                          key={disease.id}
                          className="p-2 hover:bg-accent cursor-pointer rounded-sm"
                          onClick={() => {
                            setSelectedDisease(disease.id);
                            setSearchTerm("");
                          }}
                        >
                          {disease.name}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Medication Suggestions */}
              {selectedDisease && (
                <div className="space-y-4">
                  <h4 className="font-medium">Recommended Medications</h4>
                  <div className="space-y-2">
                    {medicationSuggestions?.map((med: any) => (
                      <div
                        key={med.brandName}
                        className="border rounded-lg p-3 hover:bg-accent/50 cursor-pointer"
                        onClick={() => {
                          setSelectedPrescriptions([...selectedPrescriptions, {
                            brandName: med.brandName,
                            dosage: med.dosageRecommendation,
                            frequency: med.frequencyRecommendation
                          }]);
                        }}
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

              {/* Selected Prescriptions */}
              {selectedPrescriptions.length > 0 && (
                <div className="space-y-4">
                  <h4 className="font-medium">Selected Medications</h4>
                  <div className="space-y-2">
                    {selectedPrescriptions.map((prescription, index) => (
                      <div key={index} className="flex items-center justify-between p-2 border rounded-lg">
                        <div>
                          <p className="font-medium">{prescription.brandName}</p>
                          <p className="text-sm text-muted-foreground">
                            {prescription.dosage} - {prescription.frequency}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const newPrescriptions = [...selectedPrescriptions];
                            newPrescriptions.splice(index, 1);
                            setSelectedPrescriptions(newPrescriptions);
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Comments Section */}
              <div className="space-y-2">
                <label className="font-medium">Visit Notes</label>
                <Textarea
                  placeholder="Add any additional notes or observations..."
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>

              {/* Save Button */}
              <Button
                className="w-full"
                onClick={() => {
                  saveVisit.mutate({
                    patientId,
                    doctorId,
                    clinicId,
                    diagnosis: selectedDisease,
                    prescriptions: selectedPrescriptions,
                    comments,
                    vitals: currentVisit?.vitals,
                  });
                }}
              >
                Save Visit Record
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
