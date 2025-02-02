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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { insertPatientSchema } from "@db/schema";
import PaymentQR from "@/components/payment-qr";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/language-context";
import { getTranslation } from "@/lib/translations";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

export default function RegistrationPage() {
  const { registerPatient, clinics } = useQueue();
  const { toast } = useToast();
  const { language } = useLanguage();
  const [, setLocation] = useLocation();
  const [registrationData, setRegistrationData] = useState<any>(null);
  const [selectedClinic, setSelectedClinic] = useState<string>("");
  const searchParams = new URLSearchParams(window.location.search);
  const mobile = searchParams.get('mobile') || '';

  // Set default clinic when clinics data is loaded
  useEffect(() => {
    if (clinics && clinics.length > 0) {
      const yazhClinic = clinics.find(clinic => clinic.name === "Yazh Health Care");
      if (yazhClinic) {
        setSelectedClinic(yazhClinic.id.toString());
      }
    }
  }, [clinics]);

  const form = useForm({
    resolver: zodResolver(insertPatientSchema),
    defaultValues: {
      fullName: "",
      email: "",
      mobile: mobile,
    },
  });

  const onSubmit = async (data: any) => {
    if (!selectedClinic) {
      toast({
        title: "Clinic Required",
        description: "Please select a clinic for consultation",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await registerPatient({
        ...data,
        clinicId: parseInt(selectedClinic)
      });
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
      <PaymentQR 
        queueId={registrationData.queueEntry.id} 
        patientName={registrationData.patient.fullName}
        clinicDetails={clinics.find(c => c.id === parseInt(selectedClinic))}
        queueNumber={registrationData.queueEntry.queueNumber}
      />
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

          <FormItem>
            <FormLabel>Select Clinic</FormLabel>
            <Select 
              value={selectedClinic} 
              onValueChange={setSelectedClinic}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a clinic" />
              </SelectTrigger>
              <SelectContent>
                {clinics.map((clinic) => (
                  <SelectItem key={clinic.id} value={clinic.id.toString()}>
                    {clinic.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!selectedClinic && form.formState.isSubmitted && (
              <p className="text-sm text-destructive mt-2">
                Please select a clinic
              </p>
            )}
          </FormItem>

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