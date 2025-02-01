import { useState } from "react";
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
  Loader2,
} from "lucide-react";
import { useParams } from "wouter";
import { format, parseISO } from "date-fns";
import type { 
  SelectPatient, 
  SelectAppointment, 
  SelectPrescription, 
  SelectDiagnosis, 
  SelectVisitRecord,
  SelectQueueEntry 
} from "@db/schema";

type PatientResponse = SelectPatient & {
  queueEntry?: SelectQueueEntry;
};

type Medication = {
  name: string;
  dosage: string;
  frequency?: string;
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

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "N/A";
    return format(parseISO(dateString), "PPP");
  };

  const formatDateTime = (dateString: string | null | undefined) => {
    if (!dateString) return "N/A";
    return format(parseISO(dateString), "PPP p");
  };

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
                            Appointment ID: {appointment.id}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {formatDateTime(appointment.scheduledFor)}
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

          <TabsContent value="appointments">
            <Card>
              <CardHeader>
                <CardTitle>Appointments History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {appointments?.map(appointment => (
                    <div
                      key={appointment.id}
                      className="flex items-center justify-between border-b pb-4"
                    >
                      <div>
                        <p className="font-medium">
                          Type: {appointment.type}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatDateTime(appointment.scheduledFor)}
                        </p>
                        {appointment.notes && (
                          <p className="text-sm mt-1">{appointment.notes}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <span className={`inline-block px-2 py-1 rounded-full text-xs ${
                          appointment.status === 'completed' ? 'bg-green-100 text-green-800' :
                          appointment.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {appointment.status}
                        </span>
                      </div>
                    </div>
                  ))}
                  {(!appointments || appointments.length === 0) && (
                    <p className="text-center text-muted-foreground">No appointments found</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="prescriptions">
            <Card>
              <CardHeader>
                <CardTitle>Current Prescriptions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {prescriptions?.map(prescription => (
                    <div
                      key={prescription.id}
                      className="border rounded-lg p-4"
                    >
                      <div className="flex justify-between mb-2">
                        <div>
                          <p className="font-medium">Prescribed on: {formatDate(prescription.createdAt)}</p>
                          {prescription.endDate && (
                            <p className="text-sm text-muted-foreground">
                              Until: {formatDate(prescription.endDate)}
                            </p>
                          )}
                        </div>
                        <span className={`inline-block px-2 py-1 rounded-full text-xs ${
                          prescription.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100'
                        }`}>
                          {prescription.isActive ? 'Active' : 'Completed'}
                        </span>
                      </div>
                      <div className="mt-2">
                        <h4 className="text-sm font-medium">Medications:</h4>
                        <ul className="list-disc list-inside text-sm ml-2">
                          {(prescription.medications as Medication[]).map((med, index) => (
                            <li key={index}>{med.name} - {med.dosage}</li>
                          ))}
                        </ul>
                      </div>
                      {prescription.instructions && (
                        <p className="mt-2 text-sm text-muted-foreground">
                          {prescription.instructions}
                        </p>
                      )}
                    </div>
                  ))}
                  {(!prescriptions || prescriptions.length === 0) && (
                    <p className="text-center text-muted-foreground">No active prescriptions</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="diagnoses">
            <Card>
              <CardHeader>
                <CardTitle>Medical Diagnoses</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {diagnoses?.map(diagnosis => (
                    <div
                      key={diagnosis.id}
                      className="border rounded-lg p-4"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{diagnosis.condition}</p>
                          <p className="text-sm text-muted-foreground">
                            Diagnosed on: {formatDate(diagnosis.diagnosedAt)}
                          </p>
                        </div>
                        <span className={`inline-block px-2 py-1 rounded-full text-xs ${
                          diagnosis.status === 'active' ? 'bg-yellow-100 text-yellow-800' :
                          diagnosis.status === 'resolved' ? 'bg-green-100 text-green-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {diagnosis.status}
                        </span>
                      </div>
                      {diagnosis.notes && (
                        <p className="mt-2 text-sm">
                          {diagnosis.notes}
                        </p>
                      )}
                    </div>
                  ))}
                  {(!diagnoses || diagnoses.length === 0) && (
                    <p className="text-center text-muted-foreground">No diagnoses found</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="visits">
            <Card>
              <CardHeader>
                <CardTitle>Visit History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {visitHistory?.map(visit => (
                    <div
                      key={visit.id}
                      className="border rounded-lg p-4"
                    >
                      <div className="mb-2">
                        <p className="font-medium">Visit Date: {formatDate(visit.visitedAt)}</p>
                        <p className="text-sm text-muted-foreground mt-1">Symptoms: {visit.symptoms}</p>
                      </div>
                      {visit.diagnosis && (
                        <div className="mt-2">
                          <p className="text-sm font-medium">Diagnosis:</p>
                          <p className="text-sm">{visit.diagnosis}</p>
                        </div>
                      )}
                      {visit.treatment && (
                        <div className="mt-2">
                          <p className="text-sm font-medium">Treatment:</p>
                          <p className="text-sm">{visit.treatment}</p>
                        </div>
                      )}
                      {visit.followUpNeeded && (
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-sm text-primary">Follow-up needed</span>
                          {visit.followUpDate && (
                            <span className="text-sm">
                              on {formatDate(visit.followUpDate)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  {(!visitHistory || visitHistory.length === 0) && (
                    <p className="text-center text-muted-foreground">No visit records found</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="queue">
            <Card>
              <CardHeader>
                <CardTitle>Current Queue Status</CardTitle>
              </CardHeader>
              <CardContent>
                {patientData.queueEntry ? (
                  <div className="text-center">
                    <div className="mb-4">
                      <p className="text-3xl font-bold text-primary">
                        #{patientData.queueEntry.queueNumber}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">Your Queue Number</p>
                    </div>
                    <div className="space-y-2">
                      <p className="font-medium">
                        Status: {patientData.queueEntry.status}
                      </p>
                      {patientData.queueEntry.estimatedWaitTime && (
                        <p>
                          Estimated Wait Time: {patientData.queueEntry.estimatedWaitTime} minutes
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground">
                    You are not currently in the queue
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}