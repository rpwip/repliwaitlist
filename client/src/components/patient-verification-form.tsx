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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "./ui/card";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { insertPatientSchema } from "@db/schema";
import PaymentQR from "./payment-qr";
import { useLanguage } from "@/lib/language-context";
import { getTranslation } from "@/lib/translations";

type PatientData = {
  id: number;
  fullName: string;
  email: string | null;
  mobile: string;
};

export default function PatientVerificationForm() {
  const { registerPatient } = useQueue();
  const { verifyPatient, isVerifying } = usePatient();
  const { toast } = useToast();
  const { language } = useLanguage();
  const [registrationData, setRegistrationData] = useState<any>(null);
  const [isNewPatient, setIsNewPatient] = useState(false);
  const [foundPatients, setFoundPatients] = useState<PatientData[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientData | null>(null);

  const form = useForm({
    resolver: zodResolver(insertPatientSchema),
    defaultValues: {
      fullName: "",
      email: "",
      mobile: "",
    },
  });

  const verificationForm = useForm({
    defaultValues: {
      mobile: "",
    },
  });

  const handleVerification = async (data: { mobile: string }) => {
    try {
      const response = await verifyPatient({ mobile: data.mobile });
      if (Array.isArray(response)) {
        setFoundPatients(response);
        if (response.length === 1) {
          setSelectedPatient(response[0]);
        }
      } else {
        setSelectedPatient(response);
      }

      toast({
        title: "Patient(s) found",
        description: response.length > 1 
          ? "Please select a patient to proceed" 
          : "Proceeding to payment...",
      });
    } catch (error) {
      setIsNewPatient(true);
      form.setValue("mobile", data.mobile);
    }
  };

  const handleRegistration = async (data: any) => {
    try {
      const result = await registerPatient(data);
      setRegistrationData(result);
      toast({
        title: "Registration successful",
        description: "Please proceed with the payment to secure your spot.",
      });
    } catch (error: any) {
      console.error(error);
      toast({
        title: "Registration failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    }
  };

  if (registrationData?.queueEntry || (selectedPatient && !foundPatients.length)) {
    return (
      <Card className="p-6">
        <PaymentQR
          queueId={
            registrationData?.queueEntry?.id || selectedPatient?.queueEntry?.id
          }
        />
      </Card>
    );
  }

  if (foundPatients.length > 0) {
    return (
      <Card className="p-6">
        <CardContent className="space-y-4">
          <h3 className="text-lg font-semibold">Select Patient</h3>
          <p className="text-sm text-muted-foreground">
            Multiple patients found with this mobile number. Please select the patient:
          </p>
          <Select 
            value={selectedPatient?.id.toString()} 
            onValueChange={(value) => {
              const patient = foundPatients.find(p => p.id.toString() === value);
              if (patient) {
                setSelectedPatient(patient);
                setFoundPatients([]);
              }
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a patient" />
            </SelectTrigger>
            <SelectContent>
              {foundPatients.map((patient) => (
                <SelectItem key={patient.id} value={patient.id.toString()}>
                  {patient.fullName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
    );
  }

  if (!isNewPatient) {
    return (
      <Form {...verificationForm}>
        <form
          onSubmit={verificationForm.handleSubmit(handleVerification)}
          className="space-y-6"
        >
          <FormField
            control={verificationForm.control}
            name="mobile"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mobile Number</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter your registered mobile number"
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
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleRegistration)} className="space-y-6">
        <FormField
          control={form.control}
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
          control={form.control}
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
              <p className="text-xs text-muted-foreground">
                Email is required to access the patient portal later
              </p>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
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
          {form.formState.isSubmitting ? (
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