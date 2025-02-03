import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { AuthProvider } from "@/hooks/use-auth";
import MainLayout from "@/components/layout/MainLayout";
import HomePage from "@/pages/home-page";
import QueuePage from "@/pages/queue";
import AuthPage from "@/pages/auth-page";
import NotFound from "@/pages/not-found";
import { Toaster } from "@/components/ui/toaster";

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MainLayout>
          <Switch>
            <Route path="/" component={HomePage} />
            <Route path="/queue" component={QueuePage} />
            <Route path="/auth" component={AuthPage} />
            <Route component={NotFound} />
          </Switch>
        </MainLayout>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}
