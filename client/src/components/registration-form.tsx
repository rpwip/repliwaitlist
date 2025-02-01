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

export default function RegistrationForm() {
  const { registerPatient } = useQueue();
  const [registrationData, setRegistrationData] = useState<any>(null);

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
      const result = await registerPatient(data);
      setRegistrationData(result);
    } catch (error) {
      console.error(error);
    }
  };

  if (registrationData) {
    return (
      <div className="text-center">
        <h3 className="text-xl font-semibold mb-4">Complete Registration</h3>
        <PaymentQR queueId={registrationData.queueEntry.id} />
        <p className="mt-4 text-muted-foreground">
          Your queue number: {registrationData.queueEntry.queueNumber}
        </p>
      </div>
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

        <Button type="submit" className="w-full">
          Register
        </Button>
      </form>
    </Form>
  );
}
