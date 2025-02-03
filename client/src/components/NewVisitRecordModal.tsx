import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { insertVisitRecordSchema, type InsertVisitRecord } from "@db/schema";
import { useToast } from "@/hooks/use-toast";

// Common diagnoses suggestions
const COMMON_DIAGNOSES = [
  "Upper Respiratory Infection",
  "Seasonal Flu",
  "Viral Fever",
  "Hypertension",
  "Common Cold",
  "Gastroenteritis",
  "Migraine",
  "Anxiety",
];

// Common medications based on diagnoses
const COMMON_MEDICATIONS: Record<string, Array<{ name: string; dosage: string; duration: string }>> = {
  "Upper Respiratory Infection": [
    { name: "Azithromycin", dosage: "500mg", duration: "3 days" },
    { name: "Cetirizine", dosage: "10mg", duration: "5 days" },
  ],
  "Seasonal Flu": [
    { name: "Oseltamivir", dosage: "75mg", duration: "5 days" },
    { name: "Paracetamol", dosage: "500mg", duration: "3 days" },
  ],
  // Add more mappings as needed
};

interface NewVisitRecordModalProps {
  open: boolean;
  onClose: () => void;
  patientId: number;
  doctorId: number;
  clinicId: number;
  vitals?: Record<string, string>;
  visitReason?: string;
}

export function NewVisitRecordModal({
  open,
  onClose,
  patientId,
  doctorId,
  clinicId,
  vitals,
  visitReason,
}: NewVisitRecordModalProps) {
  const { toast } = useToast();
  const [selectedDiagnosis, setSelectedDiagnosis] = useState("");
  const [suggestedMedications, setSuggestedMedications] = useState<Array<{ name: string; dosage: string; duration: string }>>([]);

  const form = useForm<InsertVisitRecord>({
    resolver: zodResolver(insertVisitRecordSchema),
    defaultValues: {
      patientId,
      doctorId,
      symptoms: visitReason || "",
      diagnosis: "",
      treatment: "",
      followUpNeeded: false,
    },
  });

  const handleDiagnosisChange = (diagnosis: string) => {
    setSelectedDiagnosis(diagnosis);
    form.setValue("diagnosis", diagnosis);
    const medications = COMMON_MEDICATIONS[diagnosis] || [];
    setSuggestedMedications(medications);
  };

  const onSubmit = async (data: InsertVisitRecord) => {
    try {
      const response = await fetch("/api/doctor/visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error("Failed to create visit record");

      toast({
        title: "Visit record created",
        description: "The patient visit has been recorded successfully.",
      });

      onClose();
    } catch (error) {
      console.error("Error creating visit record:", error);
      toast({
        title: "Error",
        description: "Failed to create visit record",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>New Visit Record</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Vitals Section */}
            {vitals && (
              <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg bg-muted/20">
                <h3 className="col-span-2 font-semibold">Vital Signs</h3>
                {Object.entries(vitals).map(([key, value]) => (
                  <div key={key}>
                    <span className="text-sm font-medium capitalize">{key}: </span>
                    <span className="text-sm">{value}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Symptoms */}
            <FormField
              control={form.control}
              name="symptoms"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Symptoms</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Diagnosis */}
            <FormField
              control={form.control}
              name="diagnosis"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Diagnosis</FormLabel>
                  <Select
                    value={selectedDiagnosis}
                    onValueChange={handleDiagnosisChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select diagnosis" />
                    </SelectTrigger>
                    <SelectContent>
                      {COMMON_DIAGNOSES.map((diagnosis) => (
                        <SelectItem key={diagnosis} value={diagnosis}>
                          {diagnosis}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            {/* Treatment with suggested medications */}
            <FormField
              control={form.control}
              name="treatment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Treatment Plan</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  {suggestedMedications.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm font-medium mb-2">Suggested Medications:</p>
                      <div className="space-y-2">
                        {suggestedMedications.map((med, idx) => (
                          <div
                            key={idx}
                            className="text-sm p-2 border rounded cursor-pointer hover:bg-muted/50"
                            onClick={() => {
                              const currentTreatment = field.value || "";
                              const newMed = `${med.name} ${med.dosage} for ${med.duration}`;
                              field.onChange(currentTreatment ? `${currentTreatment}\n${newMed}` : newMed);
                            }}
                          >
                            {med.name} - {med.dosage} for {med.duration}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </FormItem>
              )}
            />

            {/* Follow-up */}
            <FormField
              control={form.control}
              name="followUpNeeded"
              render={({ field }) => (
                <FormItem className="flex items-center space-x-2">
                  <FormControl>
                    <Input
                      type="checkbox"
                      checked={field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
                      className="w-4 h-4"
                    />
                  </FormControl>
                  <FormLabel className="!mt-0">Follow-up needed</FormLabel>
                </FormItem>
              )}
            />

            {form.watch("followUpNeeded") && (
              <FormField
                control={form.control}
                name="followUpDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Follow-up Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            )}

            <div className="flex justify-end space-x-2">
              <Button variant="outline" type="button" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">Save Visit Record</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
