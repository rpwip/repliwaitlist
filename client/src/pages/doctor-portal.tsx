import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users,
  Calendar,
  ClipboardList,
  Search,
  UserRound,
  Clock,
  Plus,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { Input } from "@/components/ui/input";
import type {
  SelectPatient,
  SelectVisitRecord,
  SelectDiagnosis,
  SelectPrescription,
  SelectAppointment,
} from "@db/schema";
import { useAuth } from "@/hooks/use-auth";

type PatientWithHistory = SelectPatient & {
  visits: SelectVisitRecord[];
  diagnoses: SelectDiagnosis[];
  prescriptions: SelectPrescription[];
  appointments: SelectAppointment[];
};

export default function DoctorPortal() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);

  const { data: patients, isLoading: isLoadingPatients } = useQuery<SelectPatient[]>({
    queryKey: ["/api/doctor/patients", user?.id],
    queryFn: async () => {
      const response = await fetch(`/api/doctor/patients?doctorId=${user?.id}`);
      if (!response.ok) throw new Error("Failed to fetch patients");
      return response.json();
    },
    enabled: !!user?.id,
  });

  const { data: selectedPatient, isLoading: isLoadingPatientHistory } = useQuery<PatientWithHistory>({
    queryKey: ["/api/doctor/patient-history", selectedPatientId],
    queryFn: async () => {
      const response = await fetch(`/api/doctor/patient-history/${selectedPatientId}`);
      if (!response.ok) throw new Error("Failed to fetch patient history");
      return response.json();
    },
    enabled: !!selectedPatientId,
  });

  const filteredPatients = patients?.filter(patient =>
    patient.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoadingPatients) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <h1 className="text-2xl font-semibold">Doctor Portal</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Dr. {user?.username}
            </span>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6">
        <div className="grid md:grid-cols-12 gap-6">
          {/* Left Sidebar - Patient List */}
          <div className="md:col-span-4 space-y-4">
            <div className="flex items-center gap-4">
              <Input
                placeholder="Search patients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
              />
              <Button size="icon">
                <Search className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-2">
              {filteredPatients?.map((patient) => (
                <Card
                  key={patient.id}
                  className={`cursor-pointer transition-colors ${
                    selectedPatientId === patient.id ? "border-primary" : ""
                  }`}
                  onClick={() => setSelectedPatientId(patient.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <UserRound className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-medium">{patient.fullName}</h3>
                        <p className="text-sm text-muted-foreground">
                          {patient.email}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Main Content - Patient History */}
          <div className="md:col-span-8">
            {selectedPatient ? (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Patient Overview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <h3 className="font-medium">Personal Information</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Date of Birth: {selectedPatient.dateOfBirth ? format(parseISO(selectedPatient.dateOfBirth), 'PP') : 'Not specified'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Gender: {selectedPatient.gender || 'Not specified'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Blood Group: {selectedPatient.bloodGroup || 'Not specified'}
                        </p>
                      </div>
                      <div>
                        <h3 className="font-medium">Contact Information</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Mobile: {selectedPatient.mobile}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Emergency Contact: {selectedPatient.emergencyContact || 'Not specified'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Address: {selectedPatient.address || 'Not specified'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid md:grid-cols-2 gap-6">
                  {/* Recent Visits */}
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-base font-medium">Recent Visits</CardTitle>
                      <Button variant="ghost" size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Visit
                      </Button>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {selectedPatient.visits?.map((visit) => (
                          <div key={visit.id} className="border-b pb-4 last:border-0">
                            <p className="font-medium">
                              {format(parseISO(visit.visitedAt), 'PP')}
                            </p>
                            <p className="text-sm">Symptoms: {visit.symptoms}</p>
                            {visit.diagnosis && (
                              <p className="text-sm text-muted-foreground">
                                Diagnosis: {visit.diagnosis}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Active Diagnoses */}
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-base font-medium">Active Diagnoses</CardTitle>
                      <Button variant="ghost" size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Diagnosis
                      </Button>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {selectedPatient.diagnoses?.map((diagnosis) => (
                          <div key={diagnosis.id} className="border-b pb-4 last:border-0">
                            <p className="font-medium">{diagnosis.condition}</p>
                            <p className="text-sm text-muted-foreground">
                              {diagnosis.notes}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`px-2 py-0.5 rounded-full text-xs ${
                                diagnosis.status === 'active' ? 'bg-yellow-100 text-yellow-800' :
                                diagnosis.status === 'resolved' ? 'bg-green-100 text-green-800' :
                                'bg-blue-100 text-blue-800'
                              }`}>
                                {diagnosis.status}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {format(parseISO(diagnosis.diagnosedAt), 'PP')}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Prescriptions */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle>Prescriptions</CardTitle>
                    <Button variant="ghost" size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      New Prescription
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {selectedPatient.prescriptions?.map((prescription) => (
                        <div key={prescription.id} className="border-b pb-4 last:border-0">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">
                                {format(parseISO(prescription.startDate), 'PP')}
                                {prescription.endDate && ` - ${format(parseISO(prescription.endDate), 'PP')}`}
                              </p>
                              <div className="mt-2 space-y-1">
                                {prescription.medications.map((med: any, idx: number) => (
                                  <p key={idx} className="text-sm">
                                    • {med.name} - {med.dosage}
                                    {med.frequency && ` (${med.frequency})`}
                                  </p>
                                ))}
                              </div>
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              prescription.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {prescription.isActive ? 'Active' : 'Completed'}
                            </span>
                          </div>
                          {prescription.instructions && (
                            <p className="text-sm text-muted-foreground mt-2">
                              Instructions: {prescription.instructions}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Upcoming Appointments */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle>Upcoming Appointments</CardTitle>
                    <Button variant="ghost" size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Schedule Appointment
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {selectedPatient.appointments?.map((appointment) => (
                        <div key={appointment.id} className="flex items-center justify-between border-b pb-4 last:border-0">
                          <div>
                            <p className="font-medium">
                              {format(parseISO(appointment.scheduledFor), 'PPp')}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Type: {appointment.type}
                            </p>
                            {appointment.notes && (
                              <p className="text-sm text-muted-foreground">
                                Notes: {appointment.notes}
                              </p>
                            )}
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            appointment.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                            appointment.status === 'completed' ? 'bg-green-100 text-green-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {appointment.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[60vh] text-center">
                <UserRound className="h-16 w-16 text-muted-foreground mb-4" />
                <h2 className="text-lg font-medium">Select a Patient</h2>
                <p className="text-sm text-muted-foreground">
                  Choose a patient from the list to view their medical history
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
