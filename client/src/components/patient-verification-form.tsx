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
import { Card } from "./ui/card";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { insertPatientSchema } from "@db/schema";
import PaymentQR from "./payment-qr";
import { useLanguage } from "@/lib/language-context";
import { getTranslation } from "@/lib/translations";

export default function PatientVerificationForm() {
  const { registerPatient } = useQueue();
  const { verifyPatient, isVerifying } = usePatient();
  const { toast } = useToast();
  const { language } = useLanguage();
  const [registrationData, setRegistrationData] = useState<any>(null);
  const [isNewPatient, setIsNewPatient] = useState(false);
  const [verifiedPatient, setVerifiedPatient] = useState<any>(null);

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
      const patient = await verifyPatient({ mobile: data.mobile });
      setVerifiedPatient(patient);
      toast({
        title: "Patient found",
        description: "Proceeding to payment...",
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

  if (registrationData?.queueEntry || verifiedPatient) {
    return (
      <Card className="p-6">
        <PaymentQR
          queueId={
            registrationData?.queueEntry?.id || verifiedPatient?.queueEntry?.id
          }
        />
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
                <span>Email</span>
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