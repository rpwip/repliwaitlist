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
  Bell,
  Calendar,
  ShoppingCart,
  Building2,
  Medal
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

type PatientPreferences = {
  preferredPharmacy: {
    name: string;
    address: string;
  };
  primaryDoctor: {
    fullName: string;
  };
  preferredClinic: {
    name: string;
    address: string;
  };
};

type MedicineOrder = {
  id: number;
  prescription: {
    medications: Medication[];
  };
  pharmacy: {
    name: string;
    address: string;
  };
  status: string;
  totalCost: number;
  deliveryMethod?: string;
  paymentStatus: string;
};


type PatientResponse = SelectPatient & {
  queueEntry?: SelectQueueEntry & {
    estimatedWaitTime?: number;
  };
  preferences?: PatientPreferences;
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
  
  const { data: medicineOrders, isLoading: isLoadingOrders } = useQuery<MedicineOrder[]>({
    queryKey: ["/api/patient/medicine-orders", id],
    queryFn: async () => {
      const response = await fetch(`/api/patient/medicine-orders?patientId=${id}`);
      if (!response.ok) throw new Error("Failed to fetch medicine orders");
      return response.json();
    }
  });

  const currentMonthCost = medicineOrders
    ?.filter(order => order.paymentStatus === "paid")
    .reduce((sum, order) => sum + order.totalCost, 0) || 0;

  const nextMonthForecast = currentMonthCost * 0.85;
  const potentialSavings = currentMonthCost - nextMonthForecast;

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
    isLoadingDiagnoses || isLoadingVisits || isLoadingOrders) {
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
          variant={activeTab === "purchase-medicines" ? "secondary" : "ghost"}
          className="justify-start"
          onClick={() => setActiveTab("purchase-medicines")}
        >
          <ShoppingCart className="mr-2 h-4 w-4" />
          Purchase Medicines
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

              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      Healthcare Providers
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium">Primary Care Provider</h4>
                        <p className="text-sm">
                          Dr. {patientData.preferences?.primaryDoctor?.fullName || "Not assigned"}
                        </p>
                         <p className="text-sm text-muted-foreground">
                          {patientData.preferences?.preferredClinic?.name || "No clinic assigned"}
                        </p>
                      </div>
                      <div>
                        <h4 className="font-medium">Preferred Pharmacy</h4>
                         <p className="text-sm">
                          {patientData.preferences?.preferredPharmacy?.name || "Cloud Cares Pharmacy"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {patientData.preferences?.preferredPharmacy?.address || "Default Address"}
                        </p>
                      </div>
                    </div>
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
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Pill className="h-5 w-5" />
                    Current Prescriptions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Achievement Banner */}
                  <div className="mb-6 bg-primary/10 rounded-lg p-4 flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-primary">Medication Champion! 🏆</h3>
                      <p className="text-sm text-muted-foreground">
                        You've been consistent with your medication schedule. Keep it up!
                      </p>
                    </div>
                    <div className="text-2xl">⭐️ x3</div>
                  </div>

                  {/* Prescriptions Table */}
                  <div className="rounded-md border">
                    <table className="w-full">
                      <thead className="bg-muted">
                        <tr>
                          <th className="p-3 text-left">Medication Details</th>
                          <th className="p-3 text-left">Schedule</th>
                          <th className="p-3 text-left">Progress</th>
                          <th className="p-3 text-left">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {prescriptions?.map((prescription) => (
                          prescription.medications?.map((med, medIndex) => (
                            <tr key={`${prescription.id}-${medIndex}`} className="hover:bg-muted/50">
                              <td className="p-3">
                                <div>
                                  <p className="font-medium">{med.name}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {med.dosage}
                                  </p>
                                </div>
                              </td>
                              <td className="p-3">
                                <div className="space-y-1">
                                  <p className="text-sm">{med.frequency || 'As needed'}</p>
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Clock className="h-3 w-3" />
                                    Next dose in 2 hours
                                  </div>
                                </div>
                              </td>
                              <td className="p-3">
                                <div className="space-y-1">
                                  <div className="h-2 w-24 rounded-full bg-muted">
                                    <div
                                      className="h-full rounded-full bg-primary"
                                      style={{ width: `${Math.random() * 100}%` }}
                                    />
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    14 days remaining
                                  </p>
                                </div>
                              </td>
                              <td className="p-3">
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                                  prescription.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100'
                                }}`}>
                                  {prescription.isActive ? '● Active' : 'Completed'}
                                </span>
                              </td>
                            </tr>
                          ))
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Instructions Cards */}
                  {prescriptions?.map((prescription) => (
                    prescription.instructions && (
                      <Card key={`instructions-${prescription.id}`} className="mt-4 border-primary/20">
                        <CardContent className="pt-6">
                          <div className="flex items-start gap-4">
                            <div className="p-2 rounded-full bg-primary/10">
                              <ClipboardList className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <h4 className="font-medium mb-1">Special Instructions</h4>
                              <p className="text-sm text-muted-foreground">
                                {prescription.instructions}
                              </p>
                              <div className="mt-2 flex items-center gap-2 text-sm">
                                <span className="text-primary">💊 Prescribed by:</span>
                                <span>{prescription.doctor?.fullName}</span>
                                <span className="text-muted-foreground">•</span>
                                <span className="text-muted-foreground">{formatDate(prescription.createdAt)}</span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  ))}

                  {(!prescriptions || prescriptions.length === 0) && (
                    <div className="text-center py-6">
                      <Pill className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-muted-foreground">No active prescriptions</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Medication Tips */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Tips for Better Medication Adherence 🌟</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 text-sm">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-full bg-primary/10">
                        <Clock className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">Set Regular Times</p>
                        <p className="text-muted-foreground">Take medications at the same time each day to build a routine</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-full bg-primary/10">
                        <Bell className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">Use Reminders</p>
                        <p className="text-muted-foreground">Set alarms or notifications on your phone</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-full bg-primary/10">
                        <Calendar className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">Track Your Progress</p>
                        <p className="text-muted-foreground">Mark each dose as taken to maintain consistency</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
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

          {/* Purchase Medicines Section */}
          {activeTab === "purchase-medicines" && (
            <div className="space-y-6">
              {/* Cost Savings Dashboard */}
              <div className="grid md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Current Month</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-primary">
                      ${currentMonthCost?.toFixed(2) || '0.00'}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">Total medication costs</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Next Month Forecast</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-green-600">
                      ${nextMonthForecast?.toFixed(2) || '0.00'}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">Estimated with discounts</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Potential Savings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-amber-600">
                      ${potentialSavings?.toFixed(2) || '0.00'}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">By using Cloud Cares Pharmacy</p>
                  </CardContent>
                </Card>
              </div>

              {/* Achievement Banner */}
              <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-primary/20">
                      <Medal className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">Smart Saver Achievement Unlocked! 🎉</h3>
                      <p className="text-sm text-muted-foreground">
                        You've saved 15% on your medication costs this month by using Cloud Cares Pharmacy
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Pending Orders */}
              <Card>
                <CardHeader>
                  <CardTitle>Pending Medicine Orders</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <table className="w-full">
                      <thead className="bg-muted">
                        <tr>
                          <th className="p-3 text-left">Medications</th>
                          <th className="p-3 text-left">Pharmacy</th>
                          <th className="p-3 text-left">Status</th>
                          <th className="p-3 text-left">Total Cost</th>
                          <th className="p-3 text-left">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {medicineOrders && medicineOrders.length > 0 ? (
                          medicineOrders.map((order) => (
                            <tr key={order.id} className="hover:bg-muted/50">
                              <td className="p-3">
                                <ul className="list-disc list-inside text-sm">
                                  {order.prescription?.medications?.map((med: Medication, idx: number) => (
                                    <li key={idx}>{med.name} - {med.dosage}</li>
                                  )) || (
                                    <li>No medications listed</li>
                                  )}
                                </ul>
                              </td>
                              <td className="p-3">
                                <p className="font-medium">{order.pharmacy?.name || 'Unknown Pharmacy'}</p>
                                <p className="text-sm text-muted-foreground">{order.pharmacy?.address || 'No address available'}</p>
                              </td>
                              <td className="p-3">
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                                  order.status === 'ready_for_pickup' ? 'bg-green-100 text-green-800' :
                                    order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-blue-100 text-blue-800'
                                }`}>
                                  {(order.status || '').replace('_', ' ')}
                                </span>
                              </td>
                              <td className="p-3">
                                <p className="font-medium">${order.totalCost?.toFixed(2) || '0.00'}</p>
                                <p className="text-xs text-green-600">Save 15% with Cloud Cares</p>
                              </td>
                              <td className="p-3">
                                <Button
                                  size="sm"
                                  variant={order.paymentStatus === 'pending' ? 'default' : 'outline'}
                                >
                                  {order.paymentStatus === 'pending' ? 'Pay Now' : 'View Details'}
                                </Button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="p-6 text-center text-muted-foreground">
                              <ShoppingCart className="h-8 w-8 mx-auto mb-2" />
                              No pending medicine orders
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Delivery Preferences */}
              <Card>
                <CardHeader>
                  <CardTitle>Delivery Preferences</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg border hover:bg-muted/50 cursor-pointer">
                      <h4 className="font-medium mb-2">Pickup from Pharmacy</h4>
                      <p className="text-sm text-muted-foreground">
                        Pick up your medications at your convenience from your chosen pharmacy location
                      </p>
                    </div>
                    <div className="p-4 rounded-lg border hover:bg-muted/50 cursor-pointer">
                      <h4 className="font-medium mb-2">Home Delivery</h4>
                      <p className="text-sm text-muted-foreground">
                        Get your medications delivered directly to your doorstep
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}