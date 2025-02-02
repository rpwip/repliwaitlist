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

type QueueEntryData = {
  id: number;
  queueNumber: number;
  status: string;
};

type PatientData = {
  id: number;
  fullName: string;
  email: string | null;
  mobile: string;
  queueEntry?: QueueEntryData;
};

type RegistrationResponse = {
  patient: PatientData;
  queueEntry: QueueEntryData;
};

export default function PatientVerificationForm() {
  const { registerPatient } = useQueue();
  const { verifyPatient, isVerifying } = usePatient();
  const { toast } = useToast();
  const { language } = useLanguage();
  const [registrationData, setRegistrationData] = useState<RegistrationResponse | null>(null);
  const [isNewPatient, setIsNewPatient] = useState(false);
  const [foundPatients, setFoundPatients] = useState<PatientData[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientData | null>(null);

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
      mobile: "",
    },
  });

  const handleVerification = async (data: { mobile: string }) => {
    try {
      const response = await verifyPatient({ mobile: data.mobile });
      if (Array.isArray(response)) {
        setFoundPatients(response);
        setIsNewPatient(false);
      } else {
        setSelectedPatient(response);
        setIsNewPatient(false);
      }

      toast({
        title: "Patient(s) found",
        description: Array.isArray(response) && response.length > 1
          ? "Please select a patient to proceed"
          : "Proceeding to payment...",
      });
    } catch (error) {
      setIsNewPatient(true);
      const mobileNumber = data.mobile;
      registrationForm.reset({
        fullName: "",
        email: "",
        mobile: mobileNumber,
      });
      toast({
        title: "New Patient",
        description: "Please complete the registration form.",
      });
    }
  };

  const handleRegistration = async (data: PatientFormData) => {
    try {
      const payload = {
        fullName: data.fullName,
        email: data.email || null,
        mobile: data.mobile,
      };

      const result = await registerPatient(payload);

      if (result.patient && result.queueEntry) {
        setRegistrationData(result);
        toast({
          title: "Registration successful",
          description: "Please proceed with the payment to secure your spot.",
        });
      } else {
        throw new Error("Invalid registration response");
      }
    } catch (error: any) {
      console.error("Registration error:", error);
      toast({
        title: "Registration failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    }
  };

  if (registrationData?.queueEntry || selectedPatient?.queueEntry) {
    const queueId = registrationData?.queueEntry?.id || selectedPatient?.queueEntry?.id;
    if (!queueId) {
      return <div>Error: Queue entry not found</div>;
    }

    return (
      <Card className="p-6">
        <CardHeader>
          <CardTitle>{getTranslation('paymentTitle', language)}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <p className="text-lg font-medium">
              Queue Number: <span className="text-primary">
                {String(registrationData?.queueEntry?.queueNumber || selectedPatient?.queueEntry?.queueNumber).padStart(3, '0')}
              </span>
            </p>
            <p className="text-sm text-muted-foreground">
              {getTranslation('paymentDescription', language)}
            </p>
          </div>
          <PaymentQR queueId={queueId} />
        </CardContent>
      </Card>
    );
  }

  if (foundPatients.length > 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold">
            Select Patient
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Multiple patients found with this mobile number. Please select the patient:
          </p>
          <div className="grid gap-3">
            {foundPatients.map((patient) => (
              <Button
                key={patient.id}
                variant="outline"
                className="w-full justify-start h-auto py-4 px-4"
                onClick={() => {
                  setSelectedPatient(patient);
                  setFoundPatients([]);
                }}
              >
                <User className="mr-2 h-4 w-4" />
                <div className="text-left">
                  <div className="font-medium">{patient.fullName}</div>
                  <div className="text-sm text-muted-foreground">
                    {patient.email || 'No email provided'}
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isNewPatient) {
    return (
      <Form {...verificationForm}>
        <form onSubmit={verificationForm.handleSubmit(handleVerification)} className="space-y-6">
          <FormField
            control={verificationForm.control}
            name="mobile"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-baseline gap-2">
                  <span>Mobile Number</span>
                  {language !== "en" && (
                    <span className="text-muted-foreground">
                      ({getTranslation("mobile", language)})
                    </span>
                  )}
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder={getTranslation("mobilePlaceholder", language)}
                    {...field}
                  />
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

  return (
    <Form {...registrationForm}>
      <form onSubmit={registrationForm.handleSubmit(handleRegistration)} className="space-y-6">
        <FormField
          control={registrationForm.control}
          name="fullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-baseline gap-2">
                <span>Full Name</span>
                {language !== "en" && (
                  <span className="text-muted-foreground">
                    ({getTranslation("fullName", language)})
                  </span>
                )}
              </FormLabel>
              <FormControl>
                <Input
                  placeholder={getTranslation("fullNamePlaceholder", language)}
                  {...field}
                />
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
              <FormLabel className="flex items-baseline gap-2">
                <span>Email (Optional)</span>
                {language !== "en" && (
                  <span className="text-muted-foreground">
                    ({getTranslation("email", language)})
                  </span>
                )}
              </FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder={getTranslation("emailPlaceholder", language)}
                  {...field}
                />
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
              <FormLabel className="flex items-baseline gap-2">
                <span>Mobile Number</span>
                {language !== "en" && (
                  <span className="text-muted-foreground">
                    ({getTranslation("mobile", language)})
                  </span>
                )}
              </FormLabel>
              <FormControl>
                <Input
                  placeholder={getTranslation("mobilePlaceholder", language)}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full">
          {registrationForm.formState.isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {getTranslation("registering", language)}
            </>
          ) : (
            <span className="flex items-center gap-2">
              <span>Register</span>
              {language !== "en" && (
                <span className="text-sm">
                  ({getTranslation("register", language)})
                </span>
              )}
            </span>
          )}
        </Button>
      </form>
    </Form>
  );
}