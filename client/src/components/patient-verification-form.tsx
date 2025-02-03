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
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/language-context";
import { getTranslation } from "@/lib/translations";
import { useLocation } from "wouter";
import PatientSelection from "./patient-selection";
import { Loader2 } from "lucide-react";

export default function PatientVerificationForm() {
  const { verifyPatient, isVerifying } = usePatient();
  const { toast } = useToast();
  const { language } = useLanguage();
  const [foundPatients, setFoundPatients] = useState<any[]>([]);
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
      } else {
        setFoundPatients([response]);
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

  if (foundPatients.length > 0) {
    return (
      <PatientSelection
        patients={foundPatients}
        onBack={() => setFoundPatients([])}
      />
    );
  }

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