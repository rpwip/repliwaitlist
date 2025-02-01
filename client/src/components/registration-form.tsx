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

export default function RegistrationForm() {
  const { registerPatient } = useQueue();
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
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (registrationData) {
    return (
      <Card className="p-6">
        <h3 className="text-xl font-semibold mb-4">Complete Registration</h3>
        <div className="mb-4">
          <p className="text-lg font-medium">Queue Number: <span className="text-primary">{String(registrationData.queueEntry.queueNumber).padStart(3, '0')}</span></p>
          <p className="text-sm text-muted-foreground">Please complete the payment to secure your spot</p>
        </div>
        <PaymentQR queueId={registrationData.queueEntry.id} />
      </Card>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input placeholder="John Doe" {...field} />
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
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="john@example.com" {...field} />
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
                <Input placeholder="+91 9876543210" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Registering...
            </>
          ) : (
            "Register"
          )}
        </Button>
      </form>
    </Form>
  );
}