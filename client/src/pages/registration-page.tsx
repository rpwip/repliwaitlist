import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueue } from "@/hooks/use-queue";
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
import { Card } from "@/components/ui/card";
import { insertPatientSchema } from "@db/schema";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/language-context";
import { getTranslation } from "@/lib/translations";
import { useLocation } from "wouter";
import PaymentQR from "@/components/payment-qr";
import { useState } from "react";
import { Loader2 } from "lucide-react";

export default function RegistrationPage() {
  const { registerPatient } = useQueue();
  const { toast } = useToast();
  const { language } = useLanguage();
  const [, setLocation] = useLocation();
  const [registrationData, setRegistrationData] = useState<any>(null);
  const searchParams = new URLSearchParams(window.location.search);
  const mobile = searchParams.get('mobile') || '';

  const form = useForm({
    resolver: zodResolver(insertPatientSchema),
    defaultValues: {
      fullName: "",
      email: "",
      mobile: mobile,
    },
  });

  const onSubmit = async (data: any) => {
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

  if (registrationData?.queueEntry) {
    return (
      <Card className="p-6">
        <h3 className="text-xl font-semibold mb-4">{getTranslation('paymentTitle', language)}</h3>
        <div className="mb-4">
          <p className="text-lg font-medium">
            Queue Number: <span className="text-primary">
              {String(registrationData.queueEntry.queueNumber).padStart(3, '0')}
            </span>
          </p>
          <p className="text-sm text-muted-foreground">
            {getTranslation('paymentDescription', language)}
          </p>
        </div>
        <PaymentQR queueId={registrationData.queueEntry.id} />
      </Card>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Patient Registration</h2>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="fullName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name</FormLabel>
                <FormControl>
                  <Input 
                    placeholder={getTranslation('fullNamePlaceholder', language)}
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
                <FormLabel>Email (Optional)</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder={getTranslation('emailPlaceholder', language)}
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
                <FormLabel>Mobile Number</FormLabel>
                <FormControl>
                  <Input {...field} readOnly />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setLocation('/')}
              className="flex-1"
            >
              Back
            </Button>
            <Button type="submit" className="flex-1">
              {form.formState.isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {getTranslation('registering', language)}
                </>
              ) : (
                getTranslation('register', language)
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
