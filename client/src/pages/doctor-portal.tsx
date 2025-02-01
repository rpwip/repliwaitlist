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
  TrendingUp,
  Building2,
  Award,
  Activity,
} from "lucide-react";
import { format, parseISO, subMonths } from "date-fns";
import { Input } from "@/components/ui/input";
import {
  Area,
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type {
  SelectPatient,
  SelectDoctorMetrics,
  SelectDoctorClinicAssignment,
  SelectClinic,
} from "@db/schema";
import { useAuth } from "@/hooks/use-auth";

type DoctorDashboardData = {
  metrics: SelectDoctorMetrics[];
  clinicAssignments: (SelectDoctorClinicAssignment & { clinic: SelectClinic })[];
  recentPatients: SelectPatient[];
  performanceRank: number;
  totalEarnings: number;
  projectedEarnings: number;
  rewardPoints: number;
};

export default function DoctorPortal() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [view, setView] = useState<"overview" | "patients" | "prescriptions">("overview");

  const { data: dashboardData, isLoading } = useQuery<DoctorDashboardData>({
    queryKey: ["/api/doctor/dashboard", user?.id],
    queryFn: async () => {
      const response = await fetch(`/api/doctor/dashboard`);
      if (!response.ok) throw new Error("Failed to fetch dashboard data");
      return response.json();
    },
    enabled: !!user?.id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

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
              {dashboardData?.metrics[0]?.patientsCount || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              +{dashboardData?.metrics[0]?.newPatientsCount || 0} this month
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

      {/* Earnings Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Earnings Overview</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={dashboardData?.metrics || []}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
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

      {/* Associated Clinics */}
      <Card>
        <CardHeader>
          <CardTitle>Associated Clinics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {dashboardData?.clinicAssignments.map((assignment) => (
              <div
                key={assignment.id}
                className="flex items-center justify-between border-b pb-4 last:border-0"
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">{assignment.clinic.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {assignment.clinic.address}
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  View Schedule
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
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
                  {dashboardData?.recentPatients.map((patient) => (
                    <div
                      key={patient.id}
                      className="flex items-center gap-4 cursor-pointer hover:bg-muted p-2 rounded-lg"
                    >
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <UserRound className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="text-sm font-medium">{patient.fullName}</h4>
                        <p className="text-xs text-muted-foreground">
                          Last visit: {format(new Date(patient.registeredAt!), "PP")}
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
            {/* Add other views (patients, prescriptions) as needed */}
          </div>
        </div>
      </div>
    </div>
  );
}