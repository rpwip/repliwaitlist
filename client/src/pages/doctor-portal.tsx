import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";
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
import type {
  SelectPatient,
  SelectDoctorMetrics,
  SelectDoctorClinicAssignment,
  SelectClinic,
} from "@db/schema";
import { useAuth } from "@/hooks/use-auth";
import { PatientHistoryModal } from "@/components/PatientHistoryModal";
import { NewVisitRecordModal } from "@/components/NewVisitRecordModal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

type DoctorDashboardData = {
  metrics: SelectDoctorMetrics[];
  clinicAssignments: {
    assignment: SelectDoctorClinicAssignment;
    clinic: SelectClinic;
    patientCount: number;
  }[];
  recentPatients: SelectPatient[];
  performanceRank: number;
  totalEarnings: number;
  projectedEarnings: number;
  rewardPoints: number;
  prescriptionStats?: {
    totalCount: number;
    cloudCarePartnerCount: number;
    nonPartnerCount: number;
    potentialExtraRewards: number;
    brandDistribution: {
      brandName: string;
      count: number;
      isCloudCarePartner: boolean;
    }[];
  };
};

type DoctorClinicData = {
  clinic: SelectClinic & {
    email: string;
  };
  assignment: SelectDoctorClinicAssignment;
  patientCount: number;
  recentPatients: {
    id: number;
    fullName: string;
    lastVisit: string;
  }[];
};

type DoctorPatientData = {
  patient: SelectPatient;
  assignedAt: string;
  clinic: SelectClinic;
  lastVisit: string;
  totalVisits: number;
  activeDiagnoses: number;
  activePresc: number;
};

type PaginatedPatientsResponse = {
  patients: {
    patient: {
      id: number;
      fullName: string;
      dateOfBirth: string;
      email?: string | null;
      mobile?: string | null;
    };
    lastVisit: string;
    totalVisits: number;
    clinic: {
      id: number;
      name: string;
    };
  }[];
  pagination: {
    total: number;
    pages: number;
    currentPage: number;
    perPage: number;
  };
};

type TopBrandData = {
  brandName: string;
  genericName: string;
  manufacturer: string;
  totalPrescribed: number;
  totalRevenue: number;
  isCloudCarePartner: boolean;
};

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

type QueueEntry = {
  key: string;
  id: number;
  queueNumber: number;
  status: string;
  fullName: string;
  estimatedWaitTime: number;
  createdAt: string;
  patientId?: number;
  patient?: {
    fullName: string;
    id: number;
  };
  vitals?: {
    bp?: string;
    temperature?: string;
    pulse?: string;
    spo2?: string;
  };
  visitReason?: string;
};

export default function DoctorPortal() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [brandsSearchTerm, setBrandsSearchTerm] = useState("");
  const [view, setView] = useState<"overview" | "queue" | "patients" | "prescriptions">("overview");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [selectedClinicId, setSelectedClinicId] = useState<number | null>(null);
  const [showNewVisitModal, setShowNewVisitModal] = useState(false);
  const [currentQueueEntry, setCurrentQueueEntry] = useState<any>(null);

  useEffect(() => {
    if (!user) {
      setLocation("/auth");
    }
  }, [user, setLocation]);

  const { data: dashboardData, isLoading } = useQuery<DoctorDashboardData>({
    queryKey: ["/api/doctor/dashboard", user?.id],
    queryFn: async () => {
      const response = await fetch("/api/doctor/dashboard", {
        credentials: "include"
      });
      if (!response.ok) {
        if (response.status === 401) {
          setLocation("/auth");
          throw new Error("Please log in to view the dashboard");
        }
        throw new Error("Failed to fetch dashboard data");
      }
      return response.json();
    },
    enabled: !!user?.id,
  });

  const { data: topBrands } = useQuery<TopBrandData[]>({
    queryKey: ["/api/doctor/top-brands", brandsSearchTerm],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (brandsSearchTerm) {
        searchParams.set("search", brandsSearchTerm);
      }
      const response = await fetch(`/api/doctor/top-brands?${searchParams}`, {
        credentials: "include"
      });
      if (!response.ok) throw new Error("Failed to fetch top brands");
      return response.json();
    },
    enabled: view === "prescriptions",
  });

  const { data: clinicsData } = useQuery<DoctorClinicData[]>({
    queryKey: ["/api/doctor/clinics", user?.id],
    queryFn: async () => {
      const response = await fetch("/api/doctor/clinics", {
        credentials: "include"
      });
      if (!response.ok) throw new Error("Failed to fetch clinics");
      return response.json();
    },
  });

   useEffect(() => {
    if (clinicsData && !selectedClinicId) {
      const yazhClinic = clinicsData.find(c => c.clinic.name === 'Yazh Health Care');
      if (yazhClinic) {
        setSelectedClinicId(yazhClinic.clinic.id);
      }
    }
  }, [clinicsData, selectedClinicId]);

  const currentDate = new Date();
  const formattedDate = format(currentDate, "EEEE, dd MMMM yyyy");

  const { data: patientsData } = useQuery<PaginatedPatientsResponse>({
    queryKey: ["/api/doctor/patients", user?.id, currentPage],
    queryFn: async () => {
      const response = await fetch(`/api/doctor/patients?page=${currentPage}`, {
        credentials: "include"
      });
      if (!response.ok) throw new Error("Failed to fetch patients");
      return response.json();
    },
    enabled: view === "patients" && !!user?.id,
  });

  const { data: queueData, refetch: refetchQueue } = useQuery({
    queryKey: ["/api/queue", selectedClinicId],
    queryFn: async () => {
      if (!selectedClinicId) return null;
      const response = await fetch(`/api/queue/${selectedClinicId}`);
      if (!response.ok) throw new Error("Failed to fetch queue");
      return response.json();
    },
    enabled: !!selectedClinicId,
  });

  const { data: completedPatients, refetch: refetchCompleted } = useQuery({
    queryKey: ["/api/queue/completed", selectedClinicId],
    queryFn: async () => {
      if (!selectedClinicId) return null;
      const response = await fetch(`/api/queue/${selectedClinicId}/completed`);
      if (!response.ok) throw new Error("Failed to fetch completed patients");
      return response.json();
    },
    enabled: !!selectedClinicId,
  });


  const startConsultation = useMutation({
    mutationFn: async (queueId: number) => {
      const response = await fetch(`/api/queue/${queueId}/start`, { method: "POST" });
      if (!response.ok) throw new Error("Failed to start consultation");
      return response.json();
    },
    onSuccess: () => {
      refetchQueue();
      refetchCompleted();
    },
  });

  const skipPatient = useMutation({
    mutationFn: async (queueId: number) => {
      const response = await fetch(`/api/queue/${queueId}/skip`, { method: "POST" });
      if (!response.ok) throw new Error("Failed to skip patient");
      return response.json();
    },
    onSuccess: () => {
      refetchQueue();
    },
  });

  const completeConsultation = useMutation({
    mutationFn: async (queueId: number) => {
      const response = await fetch(`/api/queue/${queueId}/complete`, { method: "POST" });
      if (!response.ok) throw new Error("Failed to complete consultation");
      return response.json();
    },
    onSuccess: () => {
      refetchQueue();
      refetchCompleted();
      setCurrentQueueEntry(null);
    },
  });

  const handleStartConsultation = (entry: QueueEntry) => {
    try {
      console.log("Starting consultation for:", entry);
      // Format the entry data
      const formattedEntry = {
        ...entry,
        patient: {
          fullName: entry.fullName || entry.patient?.fullName || '',
          id: entry.patientId || entry.patient?.id || 0
        },
        patientId: entry.patientId || entry.patient?.id || 0,
        vitals: entry.vitals || {
          bp: 'N/A',
          temperature: 'N/A',
          pulse: 'N/A',
          spo2: 'N/A'
        },
        visitReason: entry.visitReason || 'Not specified'
      };

      // Update state before making the API call
      setCurrentQueueEntry(formattedEntry);
      setSelectedPatientId(formattedEntry.patientId);
      setShowNewVisitModal(true);

      // Make the API call
      startConsultation.mutate(entry.id);
    } catch (error) {
      console.error('Error starting consultation:', error);
      toast({
        title: "Error",
        description: "Failed to start consultation. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSkipPatient = (queueId: number) => {
    skipPatient.mutate(queueId);
  };

  const handleCompleteConsultation = (queueId: number) => {
    completeConsultation.mutate(queueId);
  };

  const handleNewVisit = (entry: QueueEntry) => {
    setSelectedPatientId(entry.patientId || 0);
    setCurrentQueueEntry(entry);
    setShowNewVisitModal(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>No dashboard data available.</p>
      </div>
    );
  }

  const renderPrescriptions = () => (
    <div className="space-y-6">
      {/* Search Box for Brands */}
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

      {/* Top Prescribed Brands */}
      <Card>
        <CardHeader>
          <CardTitle>Top Prescribed Brands</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topBrands?.map((brand) => (
              <div
                key={brand.brandName}
                className="flex items-center justify-between border-b pb-4 last:border-0"
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    {brand.isCloudCarePartner ? (
                      <BadgeCheck className="h-6 w-6 text-primary" />
                    ) : (
                      <Box className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-medium">{brand.brandName}</h3>
                    <p className="text-sm text-muted-foreground">
                      {brand.genericName} • {brand.manufacturer}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold">{brand.totalPrescribed}</p>
                  <p className="text-sm text-muted-foreground">Units prescribed</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Prescription Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Prescriptions</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboardData.prescriptionStats?.totalCount || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Last 30 days
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CloudCare Partner Brands</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboardData.prescriptionStats?.cloudCarePartnerCount || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Partner brand prescriptions
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Potential Extra Rewards</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboardData.prescriptionStats?.potentialExtraRewards || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Points from partner alternatives
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Non-Partner Brands</CardTitle>
            <ArrowDownRight className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted">
              {dashboardData.prescriptionStats?.nonPartnerCount || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Opportunity for partner brands
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Brand Distribution Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Prescription Brand Distribution & Savings Opportunities</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            {/* Pie Chart */}
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={dashboardData.prescriptionStats?.brandDistribution || []}
                    dataKey="count"
                    nameKey="brandName"
                    cx="50%"
                    cy="50%"
                    outerRadius={150}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {dashboardData.prescriptionStats?.brandDistribution.map((entry, index) => (
                      <Cell 
                        key={`cell-${entry.brandName}-${index}`}
                        fill={COLORS[index % COLORS.length]}
                        opacity={entry.isCloudCarePartner ? 1 : 0.6}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>

            {/* Alternative Brands & Savings */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg mb-4">CloudCare Partner Alternatives</h3>
              {dashboardData.prescriptionStats?.brandDistribution
                .filter(brand => !brand.isCloudCarePartner)
                .map((brand, index) => (
                  <div 
                    key={`brand-${brand.brandName}-${index}`}
                    className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Box className="h-5 w-5 text-muted-foreground" />
                        <h4 className="font-medium">{brand.brandName}</h4>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {brand.count} prescriptions
                      </span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-green-600">
                        <ArrowUpRight className="h-4 w-4" />
                        <span>Potential savings for patients: ${(brand.count * 15).toFixed(2)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-blue-600">
                        <BadgeCheck className="h-4 w-4" />
                        <span>Extra reward points: +{Math.round(brand.count * 75)}</span>
                      </div>
                      <div className="mt-3">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full"
                          onClick={() => setBrandsSearchTerm("CloudCare")}
                        >
                          View Partner Alternatives
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Patients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboardData.metrics[0]?.patientsCount || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              +{dashboardData.metrics[0]?.newPatientsCount || 0} this month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Performance Rank</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">#{dashboardData.performanceRank || 0}</div>
            <p className="text-xs text-muted-foreground">Among CloudCare doctors</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${dashboardData.totalEarnings || 0}</div>
            <p className="text-xs text-muted-foreground">
              Projected: ${dashboardData.projectedEarnings || 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reward Points</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.rewardPoints || 0}</div>
            <p className="text-xs text-muted-foreground">From prescriptions</p>
          </CardContent>
        </Card>
      </div>

      {/* Earnings Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Earnings Overview</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={dashboardData.metrics || []}
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
                dataKey="revenue"
                stroke="#8884d8"
                fill="#8884d8"
                fillOpacity={0.3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Associated Clinics Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Associated Clinics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {dashboardData?.clinicAssignments?.slice(0, 3).map((data) => (
              <div
                key={data.clinic.id}
                className="rounded-lg border bg-card p-4 hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Building2 className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium">{data.clinic.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {data.patientCount} patients
                      </p>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate">{data.clinic.address}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{data.clinic.contactNumber}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
  
const renderQueue = () => (
  <div className="space-y-6">
    {/* Clinic Selector and Date */}
    <div className="flex items-center justify-between">
      <Select
        value={selectedClinicId?.toString()}
        onValueChange={(value) => setSelectedClinicId(parseInt(value))}
      >
        <SelectTrigger className="w-[280px]">
          <SelectValue placeholder="Select clinic" />
        </SelectTrigger>
        <SelectContent>
          {clinicsData?.map((clinic) => (
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

    {/* Queue and Patient Details Grid */}
    <div className="grid md:grid-cols-2 gap-6">
      {/* Left Side - Queue List */}
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
                key={entry.key}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center space-x-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <UserRound className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">
                      #{entry.queueNumber} - {entry.fullName || entry.patient?.fullName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Waiting time: {entry.estimatedWaitTime}min
                    </p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleStartConsultation(entry)}
                  >
                    See Next
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleSkipPatient(entry.id)}
                  >
                    Skip
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Right Side - Current Patient Details */}
      <Card>
        <CardHeader>
          <CardTitle>Patient Details</CardTitle>
        </CardHeader>
        <CardContent>
          {currentQueueEntry ? (
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <UserRound className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-medium">{currentQueueEntry.patient.fullName}</h3>
                  <p className="text-sm text-muted-foreground">
                    Queue #{currentQueueEntry.queueNumber}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">Reason for Visit</h4>
                <p>{currentQueueEntry.visitReason || 'Not specified'}</p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">Vital Signs</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Blood Pressure</p>
                    <p>{currentQueueEntry.vitals?.bp || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Temperature</p>
                    <p>{currentQueueEntry.vitals?.temperature || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Pulse</p>
                    <p>{currentQueueEntry.vitals?.pulse || 'N/A'} bpm</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">SpO2</p>
                    <p>{currentQueueEntry.vitals?.spo2 || 'N/A'}%</p>
                  </div>
                </div>
              </div>
              <div className="flex space-x-2 mt-4">
               <Button 
                  className="flex-1"
                  onClick={() => handleNewVisit(currentQueueEntry)}
                >
                  Start Consult
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => handleCompleteConsultation(currentQueueEntry.id)}
                >
                  Complete
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No patient currently in consultation</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
        {/* Patient History Modal */}
      {selectedPatientId && (
        <PatientHistoryModal
          open={!!selectedPatientId}
          onClose={() => {
            setSelectedPatientId(null);
            setShowNewVisitModal(false);
          }}
          patientId={selectedPatientId}
          showNewVisitForm={showNewVisitModal}
          doctorId={user?.id}
          clinicId={selectedClinicId}
        />
      )}
  </div>
);

  const renderClinics = () => (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {clinicsData?.map((data) => (
          <Card key={data.clinic.id} className="hover:bg-accent/50 transition-colors">
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">{data.clinic.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {data.patientCount} patients
                  </p>
                </div>
              </div>
            </CardHeader><CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{data.clinic.address}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{data.clinic.contactNumber}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{data.clinic.email}</span>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="text-sm font-medium mb-2">Recent Patients</h4>
                <div className="space-y-2">
                  {data.recentPatients?.slice(0, 3).map((patient) => (
                    <div key={patient.id} className="flex items-center justify-between text-sm">
                      <span>{patient.fullName}</span>
                      <span className="text-muted-foreground">
                        {format(new Date(patient.lastVisit), 'MMM d')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" className="w-full">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  Schedule
                </Button>
                <Button variant="outline" size="sm" className="w-full">
                  <UserRound className="h-4 w-4 mr-2" />
                  Patients
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderPatients = () => (
    <div className="space-y-6">
      {/* Search Box */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, phone number..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Patients Grid */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {patientsData?.patients
          .filter(data => {
            const searchLower = searchTerm.toLowerCase();
            return (
              data.patient.fullName.toLowerCase().includes(searchLower) ||
              (data.patient.mobile && data.patient.mobile.includes(searchTerm))
            );
          })
          // Remove duplicates based on combination of name, mobile, and DOB
          .filter((data, index, self) => 
            index === self.findIndex((t) => (
              t.patient.fullName === data.patient.fullName &&
              t.patient.mobile === data.patient.mobile &&
              t.patient.dateOfBirth === data.patient.dateOfBirth
            ))
          )
          .map((data) => (
            <Card 
              key={`${data.patient.id}-${data.patient.mobile}`}
              className="hover:bg-accent/50 transition-colors cursor-pointer"
              onClick={() => {
                console.log("Patient card clicked:", data.patient.id);
                setSelectedPatientId(data.patient.id);
                setShowNewVisitModal(false);
              }}
            >
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <UserRound className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{data.patient.fullName}</CardTitle>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">
                        DOB: {format(new Date(data.patient.dateOfBirth), 'MMM dd, yyyy')}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {data.patient.mobile || 'No phone number'}
                      </p>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Last Visit:</span>
                  <span className="font-medium">
                    {data.lastVisit ? format(new Date(data.lastVisit), 'MMM dd, yyyy') : 'No visits yet'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total Visits:</span>
                  <span className="font-medium">{data.totalVisits || 0}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Primary Clinic:</span>
                  <span className="font-medium">
                    {data.clinic?.name || 'Not assigned'}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
      </div>

      {/* Pagination */}
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

      {/* Patient History Modal */}
      {selectedPatientId && (
        <PatientHistoryModal
          patientId={selectedPatientId}
          onClose={() => setSelectedPatientId(null)}
          open={!!selectedPatientId}
          showNewVisitForm={showNewVisitModal}
        />
      )}
    </div>
  );

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
          {/* Left Sidebar - Navigation */}
          <div className="md:col-span-3 space-y-4">
            <Card>
              <CardContent className="p-4">
                <nav className="space-y-2">
                  <Button
                    variant={view === "overview" ? "default" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => setView("overview")}
                  >
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Overview
                  </Button>
                  <Button
                    variant={view === "patients" ? "default" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => setView("patients")}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Patients
                  </Button>
                  <Button
                    variant={view === "queue" ? "default" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => setView("queue")}
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    Queue
                  </Button>
                  <Button
                    variant={view === "prescriptions" ? "default" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => setView("prescriptions")}
                  >
                    <ClipboardList className="h-4 w-4 mr-2" />
                    Prescriptions
                  </Button>
                </nav>
              </CardContent>
            </Card>

            {/* Recent Patients */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent Patients</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-4">
                  {dashboardData?.recentPatients?.map((patient, index) => (
                    <div
                      key={`sidebar-recent-${patient.id}-${index}`}
                      className="flex items-center gap-4 cursor-pointer hover:bg-muted p-2 rounded-lg"
                      onClick={() => setSelectedPatientId(patient.id)}
                    >
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <UserRound className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="text-sm font-medium">{patient.fullName}</h4>
                        <p className="text-xs text-muted-foreground">
                          Last visit: {format(new Date(patient.registeredAt || new Date()), 'PP')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="md:col-span-9">
            {view === "overview" && renderOverview()}
            {view === "prescriptions" && renderPrescriptions()}
            {view === "queue" && renderQueue()}
            {view === "patients" && renderPatients()}
          </div>
        </div>

      </div>
    </div>
  );
}