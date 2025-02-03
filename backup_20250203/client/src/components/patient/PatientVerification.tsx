import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const verificationSchema = z.object({
  mobile: z.string()
    .min(10, "Mobile number must be at least 10 digits")
    .regex(/^[0-9+]+$/, "Must contain only numbers and + symbol"),
});

type VerificationForm = z.infer<typeof verificationSchema>;

interface PatientVerificationProps {
  onVerified: (patientData: any) => void;
}

export function PatientVerification({ onVerified }: PatientVerificationProps) {
  const { toast } = useToast();
  const [isVerifying, setIsVerifying] = useState(false);

  const form = useForm<VerificationForm>({
    resolver: zodResolver(verificationSchema),
    defaultValues: {
      mobile: "",
    },
  });

  const verifyPatient = async (mobile: string) => {
    const response = await fetch(`/api/patient/profile?mobile=${encodeURIComponent(mobile)}`);
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error("Patient not found");
      }
      throw new Error("Failed to verify patient");
    }
    return response.json();
  };

  const onSubmit = async (data: VerificationForm) => {
    setIsVerifying(true);
    try {
      const patientData = await verifyPatient(data.mobile);
      onVerified(patientData);
      toast({
        title: "Verification successful",
        description: "Patient found in our records",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Verification failed",
        description: error instanceof Error ? error.message : "Something went wrong",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="space-y-6 max-w-md mx-auto p-6">
      <div className="text-center">
        <h2 className="text-2xl font-semibold">Patient Verification</h2>
        <p className="text-muted-foreground">Enter your mobile number to verify</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="mobile"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mobile Number</FormLabel>
                <FormControl>
                  <Input placeholder="+91 XXXXX XXXXX" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={isVerifying}>
            {isVerifying ? "Verifying..." : "Verify"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
