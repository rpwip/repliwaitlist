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
  XCircle,
  ThermometerIcon,
  HeartPulseIcon,
  RulerIcon,
  ScaleIcon,
  HeartIcon,
  PercentIcon
} from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

interface PatientHistoryModalProps {
  patientId: number | null;
  onClose: () => void;
  open: boolean;
  showNewVisitForm?: boolean;
  doctorId?: number;
  clinicId?: number;
}

// Types for API responses
type SymptomSuggestion = {
  id: string;
  name: string;
  category: string;
  confidence: number;
};

type DiagnosisSuggestion = {
  id: string;
  name: string;
  confidence: number;
  description: string;
  recommendedTests: string[];
};

type MedicationSuggestion = {
  brandName: string;
  genericName: string;
  isCloudCarePartner: boolean;
  dosageRecommendation: string;
  frequencyRecommendation: string;
  commonSideEffects: string[];
  contraindications: string[];
};

type LabTestSuggestion = {
  id: string;
  name: string;
  reason: string;
  urgency: "routine" | "urgent" | "stat";
  description: string;
  preparationInstructions: string;
};

const visitRecordSchema = z.object({
  vitals: z.object({
    bloodPressure: z.string(),
    heartRate: z.string(),
    temperature: z.string(),
    weight: z.string(),
    height: z.string(),
    oxygenSaturation: z.string(),
  }),
  symptoms: z.string(),
  diagnosis: z.string(),
  prescriptions: z.array(z.object({
    brandName: z.string(),
    dosage: z.string(),
    frequency: z.string(),
    duration: z.string(),
  })),
  labOrders: z.array(z.object({
    name: z.string(),
    reason: z.string(),
    urgency: z.enum(["routine", "urgent", "stat"]),
  })),
  comments: z.string(),
});

export function PatientHistoryModal({
  patientId,
  onClose,
  open,
  showNewVisitForm = false,
  doctorId,
  clinicId
}: PatientHistoryModalProps) {
  const { toast } = useToast();
  const [selectedDisease, setSelectedDisease] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [symptoms, setSymptoms] = useState<string>("");

  const form = useForm<z.infer<typeof visitRecordSchema>>({
    resolver: zodResolver(visitRecordSchema),
    defaultValues: {
      vitals: {
        bloodPressure: "",
        heartRate: "",
        temperature: "",
        weight: "",
        height: "",
        oxygenSaturation: "",
      },
      symptoms: "",
      diagnosis: "",
      prescriptions: [],
      labOrders: [],
      comments: "",
    },
  });

  const { data: history, isLoading } = useQuery({
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

  const { data: symptomSuggestions } = useQuery({
    queryKey: ["/api/symptoms-suggestions", symptoms],
    queryFn: async () => {
      if (!symptoms) return [];
      const response = await fetch(`/api/symptoms-suggestions?symptoms=${encodeURIComponent(symptoms)}`);
      if (!response.ok) throw new Error("Failed to fetch symptom suggestions");
      return response.json() as Promise<SymptomSuggestion[]>;
    },
    enabled: !!symptoms,
  });

  const { data: diagnosisSuggestions } = useQuery({
    queryKey: ["/api/diagnosis-suggestions", symptoms],
    queryFn: async () => {
      if (!symptoms) return [];
      const response = await fetch(`/api/diagnosis-suggestions?symptoms=${encodeURIComponent(symptoms)}`);
      if (!response.ok) throw new Error("Failed to fetch diagnosis suggestions");
      return response.json() as Promise<DiagnosisSuggestion[]>;
    },
    enabled: !!symptoms,
  });

  const { data: medicationSuggestions } = useQuery({
    queryKey: ["/api/medication-suggestions", selectedDisease],
    queryFn: async () => {
      if (!selectedDisease) return [];
      const response = await fetch(`/api/medication-suggestions/${selectedDisease}`);
      if (!response.ok) throw new Error("Failed to fetch medication suggestions");
      return response.json() as Promise<MedicationSuggestion[]>;
    },
    enabled: !!selectedDisease,
  });

  const { data: labSuggestions } = useQuery({
    queryKey: ["/api/lab-suggestions", selectedDisease],
    queryFn: async () => {
      if (!selectedDisease) return [];
      const response = await fetch(`/api/lab-suggestions/${selectedDisease}`);
      if (!response.ok) throw new Error("Failed to fetch lab suggestions");
      return response.json() as Promise<LabTestSuggestion[]>;
    },
    enabled: !!selectedDisease,
  });

  const saveVisitRecord = useMutation({
    mutationFn: async (data: z.infer<typeof visitRecordSchema>) => {
      const response = await fetch("/api/visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId,
          doctorId,
          clinicId,
          ...data,
          visitedAt: new Date().toISOString(),
        }),
      });
      if (!response.ok) throw new Error("Failed to save visit record");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Visit record saved successfully",
      });
      onClose();
    },
  });

  if (!patientId) return null;

  const handleSymptomsChange = (value: string) => {
    setSymptoms(value);
    form.setValue("symptoms", value);
  };

  const VitalsSection = () => (
    <div className="space-y-4">
      <h4 className="font-medium flex items-center gap-2">
        <HeartPulseIcon className="h-5 w-5" />
        Vitals
      </h4>
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="vitals.bloodPressure"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <HeartIcon className="h-4 w-4" />
                Blood Pressure
              </FormLabel>
              <FormControl>
                <Input {...field} placeholder="120/80" />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="vitals.heartRate"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <HeartPulseIcon className="h-4 w-4" />
                Heart Rate
              </FormLabel>
              <FormControl>
                <Input {...field} placeholder="72 bpm" />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="vitals.temperature"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <ThermometerIcon className="h-4 w-4" />
                Temperature
              </FormLabel>
              <FormControl>
                <Input {...field} placeholder="98.6 F" />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="vitals.weight"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <ScaleIcon className="h-4 w-4" />
                Weight
              </FormLabel>
              <FormControl>
                <Input {...field} placeholder="150 lbs" />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="vitals.height"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <RulerIcon className="h-4 w-4" />
                Height
              </FormLabel>
              <FormControl>
                <Input {...field} placeholder="5'10" />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="vitals.oxygenSaturation"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <PercentIcon className="h-4 w-4" />
                Oxygen Saturation
              </FormLabel>
              <FormControl>
                <Input {...field} placeholder="98%" />
              </FormControl>
            </FormItem>
          )}
        />
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className={`${showNewVisitForm ? 'max-w-6xl' : 'max-w-4xl'} h-[90vh]`}>
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold">
            Patient History: {history?.fullName}
          </DialogTitle>
        </DialogHeader>

        <div className={showNewVisitForm ? "grid grid-cols-2 gap-4 h-full" : "h-full"}>
          <div className={showNewVisitForm ? "border-r pr-4" : ""}>
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
                            uniqueId: `visit-${v.id}`
                          })) || []),
                          ...(history?.diagnoses?.map(d => ({
                            date: d.diagnosedAt,
                            type: "Diagnosis",
                            details: d.condition,
                            uniqueId: `diagnosis-${d.id}`
                          })) || []),
                          ...(history?.prescriptions?.map(p => ({
                            date: p.createdAt,
                            type: "Prescription",
                            details: p.medications.map(m => m.name).join(", "),
                            uniqueId: `prescription-${p.id}`
                          })) || [])
                        ]
                          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                          .slice(0, 10)
                          .map((activity) => (
                            <TableRow key={activity.uniqueId}>
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

          {showNewVisitForm && (
            <div className="pl-4 overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4">New Visit Record</h3>
              <Form {...form}>
                <form onSubmit={form.handleSubmit((data) => saveVisitRecord.mutate(data))} className="space-y-6">
                  {/* Vitals Section */}
                  <VitalsSection />

                  <Separator />

                  {/* Symptoms Section */}
                  <div className="space-y-4">
                    <h4 className="font-medium">Symptoms</h4>
                    <Textarea
                      placeholder="Enter patient symptoms..."
                      value={symptoms}
                      onChange={(e) => handleSymptomsChange(e.target.value)}
                      className="min-h-[100px]"
                    />
                    {symptomSuggestions?.length > 0 && (
                      <div className="space-y-2">
                        <h5 className="text-sm font-medium">Common Symptoms:</h5>
                        <div className="flex flex-wrap gap-2">
                          {symptomSuggestions.map((suggestion) => (
                            <Button
                              key={suggestion.id}
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const currentSymptoms = symptoms ? symptoms + ", " : "";
                                handleSymptomsChange(currentSymptoms + suggestion.name);
                              }}
                            >
                              {suggestion.name}
                              <Badge variant="secondary" className="ml-2">
                                {suggestion.confidence}%
                              </Badge>
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}

                    {diagnosisSuggestions?.length > 0 && (
                      <div className="space-y-2">
                        <h5 className="text-sm font-medium">Suggested Diagnoses:</h5>
                        <div className="flex flex-wrap gap-2">
                          {diagnosisSuggestions.map((suggestion) => (
                            <Button
                              key={suggestion.id}
                              variant={selectedDisease === suggestion.id ? "default" : "outline"}
                              onClick={() => {
                                setSelectedDisease(suggestion.id);
                                form.setValue("diagnosis", suggestion.name);
                              }}
                              size="sm"
                            >
                              {suggestion.name}
                              <Badge variant="secondary" className="ml-2">
                                {suggestion.confidence}%
                              </Badge>
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Medications Section */}
                  {selectedDisease && (
                    <div className="space-y-4">
                      <h4 className="font-medium">Recommended Medications</h4>
                      <div className="space-y-2">
                        {medicationSuggestions?.map((med) => (
                          <div
                            key={med.brandName}
                            className="border rounded-lg p-3 hover:bg-accent/50 cursor-pointer"
                            onClick={() => {
                              const currentPrescriptions = form.getValues("prescriptions");
                              form.setValue("prescriptions", [
                                ...currentPrescriptions,
                                {
                                  brandName: med.brandName,
                                  dosage: med.dosageRecommendation,
                                  frequency: med.frequencyRecommendation,
                                  duration: "7 days", // Default duration
                                },
                              ]);
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
                              <div className="mt-1">
                                <p className="text-xs text-muted-foreground">
                                  Side effects: {med.commonSideEffects.join(", ")}
                                </p>
                                <p className="text-xs text-destructive">
                                  Contraindications: {med.contraindications.join(", ")}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Selected Prescriptions */}
                  <div className="space-y-2">
                    {form.watch("prescriptions").map((prescription, index) => (
                      <div key={index} className="flex items-center space-x-2 p-2 border rounded">
                        <div className="flex-1">
                          <p className="font-medium">{prescription.brandName}</p>
                          <p className="text-sm text-muted-foreground">
                            {prescription.dosage} • {prescription.frequency} • {prescription.duration}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            const current = form.getValues("prescriptions");
                            form.setValue(
                              "prescriptions",
                              current.filter((_, i) => i !== index)
                            );
                          }}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  <Separator />

                  {/* Lab Orders Section */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Lab Orders</h4>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const current = form.getValues("labOrders");
                          form.setValue("labOrders", [
                            ...current,
                            { name: "", reason: "", urgency: "routine" },
                          ]);
                        }}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Lab Order
                      </Button>
                    </div>

                    {/* Lab Suggestions */}
                    {selectedDisease && labSuggestions?.length > 0 && (
                      <div className="space-y-2">
                        <h5 className="text-sm font-medium">Recommended Tests:</h5>
                        <div className="grid grid-cols-2 gap-2">
                          {labSuggestions.map((test) => (
                            <Button
                              key={test.id}
                              variant="outline"
                              className="h-auto py-2 justify-start"
                              onClick={() => {
                                const current = form.getValues("labOrders");
                                form.setValue("labOrders", [
                                  ...current,
                                  {
                                    name: test.name,
                                    reason: test.reason,
                                    urgency: test.urgency,
                                  },
                                ]);
                              }}
                            >
                              <div className="text-left">
                                <p className="font-medium">{test.name}</p>
                                <p className="text-xs text-muted-foreground">{test.reason}</p>
                                <Badge variant={
                                  test.urgency === "stat" ? "destructive" :
                                  test.urgency === "urgent" ? "default" : "secondary"
                                }>
                                  {test.urgency}
                                </Badge>
                              </div>
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}

                    {form.watch("labOrders").map((_, index) => (
                      <div key={index} className="space-y-2 p-4 border rounded">
                        <FormField
                          control={form.control}
                          name={`labOrders.${index}.name`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Test Name</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`labOrders.${index}.reason`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Reason</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`labOrders.${index}.urgency`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Urgency</FormLabel>
                              <FormControl>
                                <select
                                  {...field}
                                  className="w-full rounded-md border border-input bg-background px-3 py-2"
                                >
                                  <option value="routine">Routine</option>
                                  <option value="urgent">Urgent</option>
                                  <option value="stat">STAT</option>
                                </select>
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    ))}
                  </div>

                  <Separator />

                  {/* Additional Comments */}
                  <div className="space-y-4">
                    <h4 className="font-medium">Additional Comments</h4>
                    <FormField
                      control={form.control}
                      name="comments"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Textarea
                              {...field}
                              placeholder="Add any additional notes or observations..."
                              className="min-h-[100px]"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Form Actions */}
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={onClose}>
                      Cancel
                    </Button>
                    <Button type="submit">
                      Save Visit Record
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}