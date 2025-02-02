import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { SelectPatient } from "@db/schema";

type PatientIdentifier = {
  mobile?: string;
  patientId?: number;
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
        let queryParam = '';
        if (identifier.mobile) {
          // Clean the mobile number before sending
          const cleanMobile = identifier.mobile.replace(/[^\d+]/g, '');
          queryParam = `mobile=${encodeURIComponent(cleanMobile)}`;
        } else if (identifier.patientId) {
          queryParam = `patientId=${identifier.patientId}`;
        } else {
          throw new Error("Either mobile number or patient ID must be provided");
        }

        const res = await fetch(`/api/patient/profile?${queryParam}`);
        console.log('API response status:', res.status);

        if (!res.ok) {
          const errorText = await res.text();
          console.error('API error response:', errorText);

          if (res.status === 404) {
            throw new Error("Patient not found. Please check the mobile number and try again.");
          }

          throw new Error(errorText || "Failed to verify patient");
        }

        const data = await res.json();
        console.log('Successful patient verification response:', data);
        return data;
      } catch (error) {
        console.error('Patient verification error:', error);
        throw error;
      }
    }
  });

  const getPatientProfile = async (patientId: number) => {
    try {
      const res = await fetch(`/api/patient/profile/${patientId}`);
      if (!res.ok) {
        throw new Error("Failed to fetch patient profile");
      }
      return res.json();
    } catch (error) {
      console.error('Error fetching patient profile:', error);
      throw error;
    }
  };

  const usePatientProfile = (patientId: number | undefined) => {
    return useQuery({
      queryKey: [`/api/patient/profile/${patientId}`],
      queryFn: () => getPatientProfile(patientId!),
      enabled: !!patientId,
    });
  };

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
    getPatientProfile,
    usePatientProfile,
    bookAppointment: bookAppointmentMutation.mutateAsync,
    isVerifying: verifyPatientMutation.isPending,
    isBooking: bookAppointmentMutation.isPending,
  };
}