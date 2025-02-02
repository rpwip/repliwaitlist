import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueue } from "@/hooks/use-queue";
import { usePatient } from "@/hooks/use-patient";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Loader2, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import PaymentQR from "./payment-qr";
import { useLanguage } from "@/lib/language-context";
import { getTranslation } from "@/lib/translations";

const patientFormSchema = z.object({
  fullName: z.string().min(1, "Name is required"),
  email: z.string().email().optional().or(z.literal("")),
  mobile: z.string().min(10, "Mobile number must be at least 10 digits"),
});

type PatientFormData = z.infer<typeof patientFormSchema>;

export default function PatientVerificationForm() {
  const { registerPatient } = useQueue();
  const { verifyPatient, isVerifying } = usePatient();
  const { toast } = useToast();
  const { language } = useLanguage();
  const [registrationData, setRegistrationData] = useState<any>(null);
  const [isNewPatient, setIsNewPatient] = useState(false);
  const [foundPatients, setFoundPatients] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);

  const verificationForm = useForm({
    defaultValues: {
      mobile: "",
    },
  });

  const registrationForm = useForm<PatientFormData>({
    resolver: zodResolver(patientFormSchema),
    defaultValues: {
      fullName: "",
      email: "",
      mobile: verificationForm.getValues().mobile || "",
    },
  });

  const handleVerification = async (data: { mobile: string }) => {
    console.log("Starting verification with mobile:", data.mobile);
    try {
      const response = await verifyPatient({ mobile: data.mobile });
      console.log("Verification response:", response);

      // Clear all states first
      setRegistrationData(null);
      setFoundPatients([]);
      setSelectedPatient(null);

      if (!response) {
        console.log("No patient found, preparing registration form");
        setIsNewPatient(true);

        // Reset registration form with only mobile
        registrationForm.reset({
          fullName: "",
          email: "",
          mobile: data.mobile,
        });

        toast({
          title: "New Patient",
          description: "Please complete the registration form.",
        });
        return;
      }

      // Patient(s) found
      setIsNewPatient(false);

      if (Array.isArray(response)) {
        console.log("Multiple patients found:", response.length);
        setFoundPatients(response);
        toast({
          title: "Multiple Patients Found",
          description: "Please select a patient to proceed",
        });
      } else {
        console.log("Single patient found:", response);
        setSelectedPatient(response);

        if (response.queueEntry) {
          console.log("Patient has existing queue entry:", response.queueEntry);
          setRegistrationData({ patient: response, queueEntry: response.queueEntry });
        }

        toast({
          title: "Patient Found",
          description: response.queueEntry 
            ? "Proceeding to payment..." 
            : "Patient verified successfully.",
        });
      }
    } catch (error) {
      console.error("Verification error:", error);
      toast({
        title: "Verification failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleRegistration = async (data: PatientFormData) => {
    console.log("Starting registration with data:", data);
    try {
      const payload = {
        fullName: data.fullName.trim(),
        email: data.email ? data.email.trim() : null,
        mobile: data.mobile.trim(),
      };

      console.log("Sending registration payload:", payload);
      const result = await registerPatient(payload);
      console.log("Registration success:", result);

      setRegistrationData(result);
      toast({
        title: "Registration successful",
        description: "Please proceed with the payment to secure your spot.",
      });
    } catch (error: any) {
      console.error("Registration error:", error);
      toast({
        title: "Registration failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    }
  };

  // Show payment QR if we have registration data or selected patient with queue entry
  if (registrationData?.queueEntry || (selectedPatient?.queueEntry && !isNewPatient)) {
    const queueEntry = registrationData?.queueEntry || selectedPatient?.queueEntry;
    console.log("Showing payment QR for queue entry:", queueEntry);

    return (
      <Card className="p-6">
        <CardHeader>
          <CardTitle>{getTranslation('paymentTitle', language)}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <p className="text-lg font-medium">
              Queue Number: <span className="text-primary">
                {String(queueEntry.queueNumber).padStart(3, '0')}
              </span>
            </p>
            <p className="text-sm text-muted-foreground">
              {getTranslation('paymentDescription', language)}
            </p>
          </div>
          <PaymentQR queueId={queueEntry.id} />
        </CardContent>
      </Card>
    );
  }

  // Show patient selection if multiple patients found
  if (foundPatients.length > 0 && !isNewPatient) {
    console.log("Showing patient selection UI");
    return (
      <Card>
        <CardHeader>
          <CardTitle>Select Patient</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {foundPatients.map((patient) => (
            <Button
              key={patient.id}
              variant="outline"
              className="w-full justify-start"
              onClick={() => {
                console.log("Selected patient:", patient);
                setSelectedPatient(patient);
                setFoundPatients([]);
              }}
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
        </CardContent>
      </Card>
    );
  }

  // Show registration form for new patient
  if (isNewPatient) {
    console.log("Showing registration form");
    return (
      <Form {...registrationForm}>
        <form onSubmit={registrationForm.handleSubmit(handleRegistration)} className="space-y-6">
          <FormField
            control={registrationForm.control}
            name="fullName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={registrationForm.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email (Optional)</FormLabel>
                <FormControl>
                  <Input type="email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={registrationForm.control}
            name="mobile"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mobile Number</FormLabel>
                <FormControl>
                  <Input {...field} readOnly />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full">
            Register
          </Button>
        </form>
      </Form>
    );
  }

  // Show verification form (default view)
  console.log("Showing verification form");
  return (
    <Form {...verificationForm}>
      <form onSubmit={verificationForm.handleSubmit(handleVerification)} className="space-y-6">
        <FormField
          control={verificationForm.control}
          name="mobile"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mobile Number</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isVerifying}>
          {isVerifying ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Verifying...
            </>
          ) : (
            "Verify & Proceed"
          )}
        </Button>
      </form>
    </Form>
  );
}