import React from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import type { SelectUser, InsertUser } from "@db/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type AuthContextType = {
  user: SelectUser | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<SelectUser, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<SelectUser, Error, InsertUser>;
  registerDoctorMutation: UseMutationResult<SelectUser, Error, any>;
};

type LoginData = Pick<InsertUser, "username" | "password">;

export const AuthContext = React.createContext<AuthContextType | null>(null);
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToast();
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<SelectUser | undefined, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await apiRequest("POST", "/api/login", credentials);
      return await res.json();
    },
    onSuccess: (user: SelectUser) => {
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Login successful",
        description: "Welcome back!",
      });
    },
    onError: (error: Error) => {
      console.error("Login error:", error);
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (newUser: InsertUser) => {
      const res = await apiRequest("POST", "/api/register", newUser);
      return await res.json();
    },
    onSuccess: (user: SelectUser) => {
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Registration successful",
        description: "Your account has been created.",
      });
    },
    onError: (error: Error) => {
      console.error("Registration error:", error);
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerDoctorMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log("Registering doctor with data:", data);
      try {
        // First register the user
        const userRes = await apiRequest("POST", "/api/register", {
          username: data.username,
          password: data.password,
          isAdmin: data.isAdmin || false,
        });

        if (!userRes.ok) {
          const error = await userRes.text();
          throw new Error(`User registration failed: ${error}`);
        }

        const user = await userRes.json();
        console.log("User registered successfully:", user);

        // Then create the doctor profile
        const doctorRes = await apiRequest("POST", "/api/doctors", {
          userId: user.id,
          fullName: data.fullName,
          specialization: data.specialization,
          qualifications: data.qualifications,
          contactNumber: data.contactNumber,
        });

        if (!doctorRes.ok) {
          const error = await doctorRes.text();
          throw new Error(`Doctor profile creation failed: ${error}`);
        }

        const doctor = await doctorRes.json();
        console.log("Doctor profile created successfully:", doctor);
        return doctor;
      } catch (error) {
        console.error("Doctor registration error:", error);
        throw error;
      }
    },
    onSuccess: (doctor: SelectUser) => {
      queryClient.setQueryData(["/api/user"], doctor);
      toast({
        title: "Registration successful",
        description: "Welcome to Cloud Cares! You can now access the doctor portal.",
      });
    },
    onError: (error: Error) => {
      console.error("Doctor registration error:", error);
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
    },
    onError: (error: Error) => {
      console.error("Logout error:", error);
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
        registerDoctorMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}