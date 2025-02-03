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
import { insertPatientSchema } from "@db/schema";
import PaymentQR from "./payment-qr";
import { useState } from "react";
import { Card } from "./ui/card";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/language-context";
import { getTranslation } from "@/lib/translations";

export default function RegistrationForm() {
  const { registerPatient } = useQueue();
  const { toast } = useToast();
  const { language } = useLanguage();
  const [registrationData, setRegistrationData] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm({
    resolver: zodResolver(insertPatientSchema),
    defaultValues: {
      fullName: "",
      email: "",
      mobile: "",
    },
  });

  const onSubmit = async (data: any) => {
    try {
      setIsSubmitting(true);
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
    } finally {
      setIsSubmitting(false);
    }
  };

  if (registrationData) {
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
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-baseline gap-2">
                <span>Full Name</span>
                {language !== 'en' && (
                  <span className="text-muted-foreground">
                    ({getTranslation('fullName', language)})
                  </span>
                )}
              </FormLabel>
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
              <FormLabel className="flex items-baseline gap-2">
                <span>Email</span>
                {language !== 'en' && (
                  <span className="text-muted-foreground">
                    ({getTranslation('email', language)})
                  </span>
                )}
              </FormLabel>
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
              <FormLabel className="flex items-baseline gap-2">
                <span>Mobile Number</span>
                {language !== 'en' && (
                  <span className="text-muted-foreground">
                    ({getTranslation('mobile', language)})
                  </span>
                )}
              </FormLabel>
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

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {getTranslation('registering', language)}
            </>
          ) : (
            <span className="flex items-center gap-2">
              <span>Register</span>
              {language !== 'en' && (
                <span className="text-sm">
                  ({getTranslation('register', language)})
                </span>
              )}
            </span>
          )}
        </Button>
      </form>
    </Form>
  );
}