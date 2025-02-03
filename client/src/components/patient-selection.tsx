import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { User } from "lucide-react";
import { useState, useEffect } from "react";
import { useQueue } from "@/hooks/use-queue";
import { useLanguage } from "@/lib/language-context";
import { getTranslation } from "@/lib/translations";
import PaymentQR from "./payment-qr";
import { useToast } from "@/hooks/use-toast";

type Patient = {
  id: number;
  fullName: string;
  mobile: string;
  email?: string | null;
};

type Clinic = {
  id: number;
  name: string;
  address: string;
};

interface PatientSelectionProps {
  patients: Patient[];
  onBack: () => void;
}

export default function PatientSelection({ patients, onBack }: PatientSelectionProps) {
  const { clinics, registerPatient } = useQueue();
  const { language } = useLanguage();
  const { toast } = useToast();
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedClinic, setSelectedClinic] = useState<string>("");
  const [queueEntry, setQueueEntry] = useState<any>(null);

  // Set default clinic when clinics data is loaded
  useEffect(() => {
    if (clinics && clinics.length > 0) {
      const yazhClinic = clinics.find(clinic => clinic.name === "Yazh Health Care");
      if (yazhClinic) {
        setSelectedClinic(yazhClinic.id.toString());
      }
    }
  }, [clinics]);

  const handlePatientSelect = (patient: Patient) => {
    setSelectedPatient(patient);
  };

  const handleProceed = async () => {
    if (!selectedClinic) {
      toast({
        title: "Clinic Required",
        description: "Please select a clinic for consultation",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('Registering patient with clinic ID:', parseInt(selectedClinic));
      const result = await registerPatient({
        fullName: selectedPatient!.fullName,
        email: selectedPatient!.email,
        mobile: selectedPatient!.mobile,
        clinicId: parseInt(selectedClinic),
      });
      setQueueEntry(result);
      toast({
        title: "Registration successful",
        description: "Please proceed with the payment to secure your spot.",
      });
    } catch (error) {
      console.error("Registration error:", error);
      toast({
        title: "Registration failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    }
  };

  if (queueEntry?.queueEntry) {
    return (
      <PaymentQR 
        queueId={queueEntry.queueEntry.id}
        patientName={selectedPatient!.fullName}
        clinicDetails={clinics.find((c: Clinic) => c.id === parseInt(selectedClinic)) as Clinic}
        queueNumber={queueEntry.queueEntry.queueNumber}
      />
    );
  }

  if (selectedPatient) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Select Clinic</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">Selected Patient:</p>
            <div className="p-3 border rounded-lg">
              <p className="font-medium">{selectedPatient.fullName}</p>
              <p className="text-sm text-muted-foreground">{selectedPatient.mobile}</p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Choose Clinic:</p>
            <Select
              value={selectedClinic}
              onValueChange={setSelectedClinic}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a clinic" />
              </SelectTrigger>
              <SelectContent>
                {Array.isArray(clinics) && clinics.map((clinic: Clinic) => (
                  <SelectItem key={clinic.id} value={clinic.id.toString()}>
                    {clinic.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-4 pt-4">
            <Button variant="outline" onClick={() => setSelectedPatient(null)}>
              Back
            </Button>
            <Button className="flex-1" onClick={handleProceed}>
              Proceed to Payment
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Select Patient</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {patients.map((patient) => (
          <Button
            key={patient.id}
            variant="outline"
            className="w-full justify-start"
            onClick={() => handlePatientSelect(patient)}
          >
            <User className="mr-2 h-4 w-4" />
            <div className="text-left">
              <div>{patient.fullName}</div>
              <div className="text-sm text-muted-foreground">
                {patient.mobile}
              </div>
            </div>
          </Button>
        ))}

        <Button
          variant="outline"
          className="w-full"
          onClick={onBack}
        >
          Back
        </Button>
      </CardContent>
    </Card>
  );
}