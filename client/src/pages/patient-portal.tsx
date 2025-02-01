import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CalendarDays,
  ClipboardList,
  Pill,
  Stethoscope,
  UserRound,
  Clock,
  Loader2,
  Activity,
} from "lucide-react";
import { useParams } from "wouter";
import { format, parseISO, differenceInMonths } from "date-fns";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import type { 
  SelectPatient, 
  SelectAppointment, 
  SelectPrescription, 
  SelectDiagnosis, 
  SelectVisitRecord,
  SelectQueueEntry 
} from "@db/schema";

type PatientResponse = SelectPatient & {
  queueEntry?: SelectQueueEntry & {
    estimatedWaitTime?: number;
  };
};

type Medication = {
  name: string;
  dosage: string;
  frequency?: string;
};

type PrescriptionWithMedications = Omit<SelectPrescription, 'medications'> & {
  medications: Medication[];
  doctor: {
    fullName: string;
  };
};

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export default function PatientPortal() {
  const [activeTab, setActiveTab] = useState("overview");
  const { id } = useParams();

  const { data: patientData, isLoading: isLoadingPatient } = useQuery<PatientResponse>({
    queryKey: ["/api/patient/profile", id],
    queryFn: async () => {
      const response = await fetch(`/api/patient/profile?id=${id}`);
      if (!response.ok) throw new Error("Failed to fetch patient data");
      return response.json();
    }
  });

  const { data: appointments, isLoading: isLoadingAppointments } = useQuery<SelectAppointment[]>({
    queryKey: ["/api/patient/appointments", id],
    queryFn: async () => {
      const response = await fetch(`/api/patient/appointments?patientId=${id}`);
      if (!response.ok) throw new Error("Failed to fetch appointments");
      return response.json();
    }
  });

  const { data: prescriptions, isLoading: isLoadingPrescriptions } = useQuery<PrescriptionWithMedications[]>({
    queryKey: ["/api/patient/prescriptions", id],
    queryFn: async () => {
      const response = await fetch(`/api/patient/prescriptions?patientId=${id}`);
      if (!response.ok) throw new Error("Failed to fetch prescriptions");
      const data = await response.json();
      // Ensure medications is parsed as an array
      return data.map((p: any) => ({
        ...p.prescriptions,
        doctor: p.doctors,
        medications: Array.isArray(p.prescriptions.medications) 
          ? p.prescriptions.medications 
          : JSON.parse(p.prescriptions.medications)
      }));
    }
  });

  const { data: diagnoses, isLoading: isLoadingDiagnoses } = useQuery<SelectDiagnosis[]>({
    queryKey: ["/api/patient/diagnoses", id],
    queryFn: async () => {
      const response = await fetch(`/api/patient/diagnoses?patientId=${id}`);
      if (!response.ok) throw new Error("Failed to fetch diagnoses");
      const data = await response.json();
      return data.map((d: any) => ({
        ...d.diagnoses,
        doctor: d.doctors
      }));
    }
  });

  const { data: visitHistory, isLoading: isLoadingVisits } = useQuery<SelectVisitRecord[]>({
    queryKey: ["/api/patient/visits", id],
    queryFn: async () => {
      const response = await fetch(`/api/patient/visits?patientId=${id}`);
      if (!response.ok) throw new Error("Failed to fetch visits");
      const data = await response.json();
      return data.map((v: any) => ({
        ...v.visit_records,
        doctor: v.doctors
      }));
    }
  });

  const formatDate = (dateString: string | Date | null) => {
    if (!dateString) return "N/A";
    try {
      const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
      return format(date, "PPP");
    } catch (error) {
      console.error('Date parsing error:', error);
      return "Invalid date";
    }
  };

  const formatDateTime = (dateString: string | null | undefined) => {
    if (!dateString) return "N/A";
    try {
      return format(parseISO(dateString), "PPP p");
    } catch (error) {
      console.error('Date parsing error:', error);
      return "Invalid date";
    }
  };

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
    <div className="min-h-screen bg-background flex">
      {/* Fixed Left Navigation */}
      <div className="w-64 border-r bg-card p-4 flex flex-col gap-2">
        <div className="mb-6">
          <h2 className="font-semibold text-lg">Patient Portal</h2>
          <p className="text-sm text-muted-foreground">{patientData.fullName}</p>
        </div>
        <Button
          variant={activeTab === "overview" ? "secondary" : "ghost"}
          className="justify-start"
          onClick={() => setActiveTab("overview")}
        >
          <UserRound className="mr-2 h-4 w-4" />
          Overview
        </Button>
        <Button
          variant={activeTab === "appointments" ? "secondary" : "ghost"}
          className="justify-start"
          onClick={() => setActiveTab("appointments")}
        >
          <CalendarDays className="mr-2 h-4 w-4" />
          Appointments
        </Button>
        <Button
          variant={activeTab === "prescriptions" ? "secondary" : "ghost"}
          className="justify-start"
          onClick={() => setActiveTab("prescriptions")}
        >
          <Pill className="mr-2 h-4 w-4" />
          Prescriptions
        </Button>
        <Button
          variant={activeTab === "diagnoses" ? "secondary" : "ghost"}
          className="justify-start"
          onClick={() => setActiveTab("diagnoses")}
        >
          <Stethoscope className="mr-2 h-4 w-4" />
          Diagnoses
        </Button>
        <Button
          variant={activeTab === "visits" ? "secondary" : "ghost"}
          className="justify-start"
          onClick={() => setActiveTab("visits")}
        >
          <ClipboardList className="mr-2 h-4 w-4" />
          Visit History
        </Button>
        <Button
          variant={activeTab === "queue" ? "secondary" : "ghost"}
          className="justify-start"
          onClick={() => setActiveTab("queue")}
        >
          <Clock className="mr-2 h-4 w-4" />
          Queue Status
        </Button>
        <Button
          variant={activeTab === "analytics" ? "secondary" : "ghost"}
          className="justify-start"
          onClick={() => setActiveTab("analytics")}
        >
          <Activity className="mr-2 h-4 w-4" />
          Health Analytics
        </Button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-6xl mx-auto">
          {activeTab === "overview" && (
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Personal Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="grid md:grid-cols-2 gap-4">
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

              {/* Quick Stats */}
              <div className="grid md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Upcoming Appointments</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-primary">
                      {appointments?.filter(apt => new Date(apt.scheduledFor) > new Date()).length || 0}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Active Prescriptions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-primary">
                      {prescriptions?.filter(p => p.isActive).length || 0}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Recent Visits</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-primary">
                      {visitHistory?.filter(v => differenceInMonths(new Date(), new Date(v.visitedAt)) < 1).length || 0}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {activeTab === "analytics" && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Visit Frequency</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={healthAnalytics.visitsByMonth}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="visits" stroke="#8884d8" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Diagnosis Distribution</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={healthAnalytics.diagnosisDistribution}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label
                      >
                        {healthAnalytics.diagnosisDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "appointments" && (
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
          )}

          {activeTab === "prescriptions" && (
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
                            <p className="font-medium">
                              Prescribed by: {prescription.doctor?.fullName}
                            </p>
                          <p className="text-sm text-muted-foreground">
                            Prescribed on: {formatDate(prescription.createdAt)}
                          </p>
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
                          {prescription.medications?.map((med, index) => (
                            <li key={index}>
                              {med.name} - {med.dosage}
                              {med.frequency && ` (${med.frequency})`}
                            </li>
                          ))}
                        </ul>
                      </div>
                      {prescription.instructions && (
                        <p className="mt-2 text-sm text-muted-foreground">
                          Instructions: {prescription.instructions}
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
          )}

          {activeTab === "diagnoses" && (
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
          )}

          {activeTab === "visits" && (
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
          )}

          {activeTab === "queue" && (
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
          )}
        </div>
      </div>
    </div>
  );
}