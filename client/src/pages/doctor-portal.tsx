import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, UserRound } from "lucide-react";
import { format } from "date-fns";
import { PatientHistoryModal } from "@/components/PatientHistoryModal";
import { Button } from "@/components/ui/button";
import {
  CalendarIcon,
  MapPin,
  Phone,
  Mail,
  TrendingUp,
  Users,
  Clock,
  ClipboardList,
} from "lucide-react";

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

export default function DoctorPortal() {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [showNewVisitModal, setShowNewVisitModal] = useState(false);
  const [view, setView] = useState("overview");

  const { data: patientsData } = useQuery<PaginatedPatientsResponse>({
    queryKey: ["/api/doctor/patients", currentPage, searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams();

      // Always send search term to backend if it exists
      if (searchTerm) {
        params.append("search", searchTerm);
      }

      // Only send page if not searching
      if (!searchTerm) {
        params.append("page", currentPage.toString());
      }

      const response = await fetch(`/api/doctor/patients?${params}`, {
        credentials: "include"
      });
      if (!response.ok) throw new Error("Failed to fetch patients");
      return response.json();
    },
  });


    const { data: dashboardData } = useQuery({
        queryKey: ["/api/doctor/dashboard"],
        queryFn: async () => {
            const response = await fetch("/api/doctor/dashboard", {
                credentials: "include",
            });
            if (!response.ok) throw new Error("Failed to fetch dashboard data");
            return response.json();
        },
    });

    const user = { username: 'test' }


  const renderOverview = () => (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {dashboardData?.clinics?.map((data: any) => (
          <Card key={data.clinic.id}>
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-hospital-square"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect><path d="M9 8h1m4 0h1M8 12h8M8 16h8"></path></svg>
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

  const renderPatients = () => (
    <div className="space-y-6">
      {/* Search Box */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1); // Reset to first page when searching
            }}
          />
        </div>
      </div>

      {/* Patients Grid */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {patientsData?.patients
          // Remove duplicates based on name and date of birth
          .filter((data, index, self) => 
            index === self.findIndex((t) => (
              t.patient.fullName === data.patient.fullName &&
              t.patient.dateOfBirth === data.patient.dateOfBirth
            ))
          )
          .map((data) => (
            <Card 
              key={`${data.patient.fullName}-${data.patient.dateOfBirth}`}
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

      {/* Pagination - Only show when not searching */}
      {!searchTerm && patientsData?.pagination && (
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


  const renderPrescriptions = () => <div>Prescriptions</div>;
  const renderQueue = () => <div>Queue</div>;

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