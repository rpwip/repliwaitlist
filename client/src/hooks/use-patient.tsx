import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { SelectPatient } from "@db/schema";

type PatientIdentifier = {
  mobile: string;
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
      console.log('Starting patient verification for:', identifier);
      try {
        // Clean the mobile number before sending
        const cleanMobile = identifier.mobile.replace(/[^\d+]/g, '');
        console.log('Cleaned mobile number:', cleanMobile);

        const res = await apiRequest(
          "GET",
          `/api/patient/profile?mobile=${encodeURIComponent(cleanMobile)}`,
        );

        console.log('API response status:', res.status);

        if (res.status === 404) {
          console.log('Patient not found - returning null');
          return null;
        }

        if (!res.ok && res.status !== 404) {
          const errorText = await res.text();
          console.error('API error response:', errorText);
          throw new Error(errorText || "Failed to verify patient");
        }

        const data = await res.json();
        console.log('Successful patient verification response:', data);
        return data;
      } catch (error) {
        console.error('Patient verification error:', error);
        // Don't transform 404 to null here, let it be handled above
        throw error;
      }
    }
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