import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

interface Clinic {
  id: number;
  name: string;
  address: string;
  type: string;
  contactNumber: string;
}

interface PatientSelectionProps {
  patientData: any;
  onClinicSelected: (clinicId: number) => void;
}

export function PatientSelection({ patientData, onClinicSelected }: PatientSelectionProps) {
  const { toast } = useToast();

  const { data: clinics, isLoading, error } = useQuery<Clinic[]>({
    queryKey: ['/api/clinics'],
  });

  useEffect(() => {
    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load clinics. Please try again.",
      });
    }
  }, [error, toast]);

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-2xl mx-auto p-6">
        <Skeleton className="h-12 w-3/4" />
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto p-6">
      <div className="text-center">
        <h2 className="text-2xl font-semibold">Select Clinic</h2>
        <p className="text-muted-foreground">
          Welcome {patientData.fullName}, please select a clinic
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {clinics?.map((clinic) => (
          <Card key={clinic.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle>{clinic.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">{clinic.address}</p>
                <p className="text-sm text-muted-foreground">{clinic.type}</p>
                <p className="text-sm text-muted-foreground">{clinic.contactNumber}</p>
                <Button
                  className="w-full mt-4"
                  onClick={() => onClinicSelected(clinic.id)}
                >
                  Select Clinic
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
