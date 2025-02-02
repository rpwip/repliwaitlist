import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Users,
  Calendar,
  ClipboardList,
  Search,
  UserRound,
  Clock,
  TrendingUp,
  Building2,
  Award,
  Activity,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Box,
  BadgeCheck,
  MapPin,
  Phone,
  Mail,
  Calendar as CalendarIcon,
  Pill,
  User,
} from "lucide-react";
import { format } from "date-fns";
import {
  Area,
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import ConsultationView from "./consultation-view";
import { useAuth } from "@/hooks/use-auth";

type QueueEntry = {
  id: number;
  queueNumber: number;
  status: string;
  fullName: string;
  estimatedWaitTime: number;
  patientId: number;
  vitals?: {
    bp?: string;
    temperature?: string;
    pulse?: string;
    spo2?: string;
  };
  visitReason?: string;
};

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function DoctorPortal() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [view, setView] = useState<"overview" | "queue" | "patients" | "prescriptions" | "consultation">("overview");
  const [selectedClinicId, setSelectedClinicId] = useState<number | null>(null);
  const [currentQueueEntry, setCurrentQueueEntry] = useState<QueueEntry | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [brandsSearchTerm, setBrandsSearchTerm] = useState("");

  // Fetch dashboard data
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ["/api/doctor/dashboard", user?.id],
    queryFn: async () => {
      const response = await fetch("/api/doctor/dashboard");
      if (!response.ok) throw new Error("Failed to fetch dashboard data");
      return response.json();
    },
  });

  // Fetch clinics data
  const { data: clinicsData } = useQuery({
    queryKey: ["/api/doctor/clinics", user?.id],
    queryFn: async () => {
      const response = await fetch("/api/doctor/clinics");
      if (!response.ok) throw new Error("Failed to fetch clinics");
      return response.json();
    },
  });

  // Fetch queue data
  const { data: queueData } = useQuery({
    queryKey: ["/api/queue", selectedClinicId],
    queryFn: async () => {
      if (!selectedClinicId) return null;
      const response = await fetch(`/api/queue/${selectedClinicId}`);
      if (!response.ok) throw new Error("Failed to fetch queue");
      return response.json();
    },
    enabled: !!selectedClinicId,
  });

  // Fetch patients data
  const { data: patientsData } = useQuery({
    queryKey: ["/api/doctor/patients", currentPage, searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        search: searchTerm,
      });
      const response = await fetch(`/api/doctor/patients?${params}`);
      if (!response.ok) throw new Error("Failed to fetch patients");
      return response.json();
    },
    enabled: view === "patients",
  });

  // Fetch prescription data
  const { data: prescriptionData } = useQuery({
    queryKey: ["/api/doctor/prescriptions", brandsSearchTerm],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (brandsSearchTerm) {
        params.append("search", brandsSearchTerm);
      }
      const response = await fetch(`/api/doctor/prescriptions?${params}`);
      if (!response.ok) throw new Error("Failed to fetch prescriptions");
      return response.json();
    },
    enabled: view === "prescriptions",
  });

  const handleStartConsultation = (entry: QueueEntry) => {
    try {
      if (!entry.patientId) {
        toast({
          title: "Error",
          description: "Patient ID is missing",
          variant: "destructive",
        });
        return;
      }

      setCurrentQueueEntry(entry);
      setView("consultation");
    } catch (error) {
      console.error('Error starting consultation:', error);
      toast({
        title: "Error",
        description: "Failed to start consultation. Please try again.",
        variant: "destructive",
      });
    }
  };

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Patients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboardData?.metrics?.totalPatients || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              +{dashboardData?.metrics?.newPatients || 0} this month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Performance Rank</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">#{dashboardData?.performanceRank || 0}</div>
            <p className="text-xs text-muted-foreground">Among CloudCare doctors</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${dashboardData?.totalEarnings || 0}</div>
            <p className="text-xs text-muted-foreground">
              Projected: ${dashboardData?.projectedEarnings || 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reward Points</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData?.rewardPoints || 0}</div>
            <p className="text-xs text-muted-foreground">From prescriptions</p>
          </CardContent>
        </Card>
      </div>

      {dashboardData?.metrics?.revenueData && (
        <Card>
          <CardHeader>
            <CardTitle>Earnings Overview</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={dashboardData.metrics.revenueData}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(date) => format(new Date(date), 'MMM yyyy')}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(date) => format(new Date(date), 'MMMM yyyy')}
                  formatter={(value) => [`$${value}`, 'Revenue']}
                />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="#8884d8"
                  fill="#8884d8"
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderQueue = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Select
          value={selectedClinicId?.toString()}
          onValueChange={(value) => setSelectedClinicId(parseInt(value))}
        >
          <SelectTrigger className="w-[280px]">
            <SelectValue placeholder="Select clinic" />
          </SelectTrigger>
          <SelectContent>
            {clinicsData?.map((clinic: any) => (
              <SelectItem
                key={clinic.clinic.id}
                value={clinic.clinic.id.toString()}
              >
                {clinic.clinic.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-lg font-medium">{format(new Date(), "EEEE, dd MMMM yyyy")}</span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current Queue</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!queueData ? (
            <div className="flex items-center justify-center p-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : queueData.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">No patients in queue</p>
          ) : (
            queueData.map((entry: QueueEntry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center space-x-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <UserRound className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">
                      #{entry.queueNumber} - {entry.fullName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Waiting time: {entry.estimatedWaitTime}min
                    </p>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleStartConsultation(entry)}
                >
                  Start Consultation
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderPatients = () => (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search patients..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {patientsData?.patients.map((patient: any) => (
          <Card key={patient.id} className="hover:bg-accent/50 transition-colors">
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <UserRound className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">{patient.fullName}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Last visit: {patient.lastVisit ? format(new Date(patient.lastVisit), 'PP') : 'Never'}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Active Conditions:</span>
                  <span>{patient.activeConditions || 0}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Prescriptions:</span>
                  <span>{patient.activePrescriptions || 0}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4">
                <Button variant="outline" size="sm" className="w-full">
                  <ClipboardList className="h-4 w-4 mr-2" />
                  Records
                </Button>
                <Button variant="outline" size="sm" className="w-full">
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {patientsData?.pagination && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {patientsData.pagination.pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(page => Math.min(patientsData.pagination.pages, page + 1))}
            disabled={currentPage === patientsData.pagination.pages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );

  const renderPrescriptions = () => (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search medicines or brands..."
            className="pl-8"
            value={brandsSearchTerm}
            onChange={(e) => setBrandsSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {prescriptionData && (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Prescriptions</CardTitle>
                <ClipboardList className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {prescriptionData.totalCount || 0}
                </div>
                <p className="text-xs text-muted-foreground">Last 30 days</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Partner Brands</CardTitle>
                <Award className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {prescriptionData.partnerCount || 0}
                </div>
                <p className="text-xs text-muted-foreground">Partner prescriptions</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Prescriptions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {prescriptionData.prescriptions?.map((prescription: any) => (
                  <div
                    key={prescription.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Pill className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{prescription.medicineName}</p>
                        <p className="text-sm text-muted-foreground">
                          {prescription.patientName} • {format(new Date(prescription.prescribedAt), 'PP')}
                        </p>
                      </div>
                    </div>
                    {prescription.isPartnerBrand && (
                      <Badge variant="secondary">Partner Brand</Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        <div className="w-64 border-r min-h-screen p-4">
          <nav className="space-y-2">
            <Button
              variant={view === "overview" ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => setView("overview")}
            >
              <PieChart className="mr-2 h-4 w-4" />
              Overview
            </Button>
            <Button
              variant={view === "queue" ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => setView("queue")}
            >
              <Users className="mr-2 h-4 w-4" />
              Queue
            </Button>
            <Button
              variant={view === "patients" ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => setView("patients")}
            >
              <User className="mr-2 h-4 w-4" />
              Patients
            </Button>
            <Button
              variant={view === "prescriptions" ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => setView("prescriptions")}
            >
              <Pill className="mr-2 h-4 w-4" />
              Prescriptions
            </Button>
          </nav>
        </div>

        <div className="flex-1 p-6">
          {view === "consultation" && currentQueueEntry ? (
            <ConsultationView
              patientId={currentQueueEntry.patientId}
              doctorId={user?.id || 0}
              clinicId={selectedClinicId || 0}
              currentVisit={{
                vitals: currentQueueEntry.vitals || {
                  bp: 'N/A',
                  temperature: 'N/A',
                  pulse: 'N/A',
                  spo2: 'N/A'
                },
                visitReason: currentQueueEntry.visitReason || 'Not specified'
              }}
            />
          ) : view === "overview" ? (
            renderOverview()
          ) : view === "queue" ? (
            renderQueue()
          ) : view === "patients" ? (
            renderPatients()
          ) : (
            renderPrescriptions()
          )}
        </div>
      </div>
    </div>
  );
}