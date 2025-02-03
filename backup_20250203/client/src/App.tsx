import { QueryClientProvider } from "@tanstack/react-query";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import { LanguageProvider } from "./lib/language-context";
import { ProtectedRoute } from "./lib/protected-route";

import HomePage from "./pages/home-page";
import AuthPage from "./pages/auth-page";
import QueueDisplay from "./pages/queue-display";
import Queue from "./pages/queue";
import AdminDashboard from "./pages/admin-dashboard";
import PatientPortal from "./pages/patient-portal";
import DoctorPortal from "./pages/doctor-portal";
import RegistrationPage from "./pages/registration-page";
import NotFound from "./pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/register" component={RegistrationPage} />
      <Route path="/display" component={QueueDisplay} />
      <Route path="/queue" component={Queue} />
      <Route path="/patient/:id" component={PatientPortal} />
      <ProtectedRoute path="/doctor" component={DoctorPortal} />
      <ProtectedRoute path="/admin" component={AdminDashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <LanguageProvider>
          <Router />
          <Toaster />
        </LanguageProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;