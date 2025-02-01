import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { SelectPatient } from "@db/schema";

type PatientIdentifier = {
  mobile: string;
  email?: string;
};

type AppointmentData = {
  patientId: number;
  doctorId: number;
  scheduledFor: string;
  type: string;
  notes?: string;
};

export function usePatient() {
  const { toast } = useToast();

  const verifyPatientMutation = useMutation({
    mutationFn: async (identifier: PatientIdentifier) => {
      const res = await apiRequest(
        "GET",
        `/api/patient/profile?mobile=${encodeURIComponent(identifier.mobile)}`,
      );
      return res.json() as Promise<SelectPatient>;
    },
    onError: (error: Error) => {
      toast({
        title: "Verification failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const bookAppointmentMutation = useMutation({
    mutationFn: async (data: AppointmentData) => {
      const res = await apiRequest("POST", "/api/appointments", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patient/appointments"] });
      toast({
        title: "Appointment booked",
        description: "Your appointment has been successfully scheduled.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Booking failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    verifyPatient: verifyPatientMutation.mutateAsync,
    bookAppointment: bookAppointmentMutation.mutateAsync,
    isVerifying: verifyPatientMutation.isPending,
    isBooking: bookAppointmentMutation.isPending,
  };
}