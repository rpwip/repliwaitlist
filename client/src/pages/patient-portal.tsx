import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CalendarDays,
  ClipboardList,
  Pill,
  Stethoscope,
  UserRound,
  Clock,
} from "lucide-react";
import { Loader2 } from "lucide-react";
import { useParams } from "wouter";
import { format } from "date-fns";
import type { SelectPatient, SelectAppointment, SelectPrescription, SelectDiagnosis, SelectVisitRecord } from "@db/schema";

type PatientResponse = SelectPatient & {
  queueEntry?: {
    id: number;
    queueNumber: number;
    status: string;
  };
};

export default function PatientPortal() {
  const [activeTab, setActiveTab] = useState("overview");
  const { id } = useParams();

  const { data: patientData, isLoading: isLoadingPatient } = useQuery<PatientResponse>({
    queryKey: ["/api/patient/profile", id],
  });

  const { data: appointments, isLoading: isLoadingAppointments } = useQuery<SelectAppointment[]>({
    queryKey: ["/api/patient/appointments", id],
  });

  const { data: prescriptions, isLoading: isLoadingPrescriptions } = useQuery<SelectPrescription[]>({
    queryKey: ["/api/patient/prescriptions", id],
  });

  const { data: diagnoses, isLoading: isLoadingDiagnoses } = useQuery<SelectDiagnosis[]>({
    queryKey: ["/api/patient/diagnoses", id],
  });

  const { data: visitHistory, isLoading: isLoadingVisits } = useQuery<SelectVisitRecord[]>({
    queryKey: ["/api/patient/visits", id],
  });

  if (isLoadingPatient || isLoadingAppointments || isLoadingPrescriptions || 
      isLoadingDiagnoses || isLoadingVisits) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!patientData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg text-muted-foreground">Patient not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground py-6">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">Patient Portal</h1>
              <p className="mt-1 text-sm opacity-90">
                Welcome back, {patientData.fullName}
              </p>
            </div>
            <Button variant="secondary" asChild>
              <a href="/book-appointment">Book Appointment</a>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-6 gap-4 mb-8">
            <TabsTrigger value="overview" className="flex gap-2 items-center">
              <UserRound className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="appointments" className="flex gap-2 items-center">
              <CalendarDays className="h-4 w-4" />
              Appointments
            </TabsTrigger>
            <TabsTrigger value="prescriptions" className="flex gap-2 items-center">
              <Pill className="h-4 w-4" />
              Prescriptions
            </TabsTrigger>
            <TabsTrigger value="diagnoses" className="flex gap-2 items-center">
              <Stethoscope className="h-4 w-4" />
              Diagnoses
            </TabsTrigger>
            <TabsTrigger value="visits" className="flex gap-2 items-center">
              <ClipboardList className="h-4 w-4" />
              Visit History
            </TabsTrigger>
            <TabsTrigger value="queue" className="flex gap-2 items-center">
              <Clock className="h-4 w-4" />
              Queue Status
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Personal Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="space-y-2">
                    <div>
                      <dt className="text-sm text-muted-foreground">Full Name</dt>
                      <dd className="text-lg">{patientData.fullName}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted-foreground">Email</dt>
                      <dd>{patientData.email}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted-foreground">Mobile</dt>
                      <dd>{patientData.mobile}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted-foreground">Blood Group</dt>
                      <dd>{patientData.bloodGroup || "Not specified"}</dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Upcoming Appointments</CardTitle>
                </CardHeader>
                <CardContent>
                  {appointments?.filter(apt => new Date(apt.scheduledFor) > new Date())
                    .slice(0, 3)
                    .map(appointment => (
                      <div
                        key={appointment.id}
                        className="flex items-center justify-between py-2"
                      >
                        <div>
                          <p className="font-medium">
                            Dr. {appointment.doctor.fullName}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {format(
                              new Date(appointment.scheduledFor),
                              "MMM d, yyyy 'at' h:mm a"
                            )}
                          </p>
                        </div>
                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                      </div>
                    ))}
                  {(!appointments || appointments.length === 0) && (
                    <p className="text-muted-foreground">No upcoming appointments</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Additional tab contents will be implemented next */}
        </Tabs>
      </main>
    </div>
  );
}