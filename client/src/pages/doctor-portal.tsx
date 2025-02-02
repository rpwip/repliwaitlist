import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
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
  patients: DoctorPatientData[];
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

export default function DoctorPortal() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [brandsSearchTerm, setBrandsSearchTerm] = useState("");
  const [view, setView] = useState<"overview" | "patients" | "prescriptions" | "clinics">("overview");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);

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
    enabled: view === "clinics" && !!user?.id,
  });

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
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setView("clinics")}
          >
            View All Clinics
          </Button>
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
            </CardHeader>
            <CardContent className="space-y-4">
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

  const renderPatients = () => {
    return (
      <div className="space-y-6">
        {/* Search Box */}
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

        {/* Patients Grid */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {patientsData?.patients
            .filter(data => 
              data.patient.fullName.toLowerCase().includes(searchTerm.toLowerCase())
            )
            .map((data) => (
              <Card 
                key={`patient-${data.patient.id}`}
                className="hover:bg-accent/50 transition-colors cursor-pointer"
                onClick={() => setSelectedPatientId(data.patient.id)}
              >
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <UserRound className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{data.patient.fullName}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {data.totalVisits} visits • {data.activeDiagnoses} active conditions
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Last Visit:</span>
                      <span className="font-medium">
                        {data.lastVisit ? format(new Date(data.lastVisit), 'PPP') : 'No visits yet'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Clinic:</span>
                      <span className="font-medium">{data.clinic?.name || 'Not assigned'}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Active Prescriptions:</span>
                      <span className="font-medium">{data.activePresc}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Assigned:</span>
                      <span className="font-medium">
                        {format(new Date(data.assignedAt), 'PP')}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
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
        <PatientHistoryModal 
          patientId={selectedPatientId} 
          onClose={() => setSelectedPatientId(null)}
        />
      </div>
    );
  };

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
                    variant={view === "clinics" ? "default" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => setView("clinics")}
                  >
                    <Building2 className="h-4 w-4 mr-2" />
                    Clinics
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
                      key={`recent-patient-${patient.id}-${index}`}
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
            {view === "clinics" && renderClinics()}
            {view === "patients" && renderPatients()}
          </div>
        </div>
      </div>
    </div>
  );
}