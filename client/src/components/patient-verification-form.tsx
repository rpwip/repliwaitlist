import { useState } from "react";
import { useForm } from "react-hook-form";
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
import PaymentQR from "./payment-qr";
import { useLanguage } from "@/lib/language-context";
import { getTranslation } from "@/lib/translations";
import { useLocation } from "wouter";

export default function PatientVerificationForm() {
  const { verifyPatient, isVerifying } = usePatient();
  const { toast } = useToast();
  const { language } = useLanguage();
  const [foundPatients, setFoundPatients] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [, setLocation] = useLocation();

  const form = useForm({
    defaultValues: {
      mobile: "",
    },
  });

  const handleVerification = async (data: { mobile: string }) => {
    try {
      const response = await verifyPatient({ mobile: data.mobile });

      if (!response) {
        // Redirect to registration page with mobile number
        setLocation(`/register?mobile=${encodeURIComponent(data.mobile)}`);
        return;
      }

      if (Array.isArray(response)) {
        setFoundPatients(response);
        toast({
          title: "Multiple Patients Found",
          description: "Please select a patient to proceed",
        });
      } else {
        setSelectedPatient(response);
        if (response.queueEntry) {
          toast({
            title: "Patient Found",
            description: "Proceeding to payment...",
          });
        } else {
          toast({
            title: "Patient Found",
            description: "Patient verified successfully.",
          });
        }
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

  // Show payment QR if selected patient has queue entry
  if (selectedPatient?.queueEntry) {
    const queueEntry = selectedPatient.queueEntry;
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
  if (foundPatients.length > 0) {
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

  // Show verification form (default view)
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleVerification)} className="space-y-6">
        <FormField
          control={form.control}
          name="mobile"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mobile Number</FormLabel>
              <FormControl>
                <Input 
                  placeholder={getTranslation('mobilePlaceholder', language)}
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