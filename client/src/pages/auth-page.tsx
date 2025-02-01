import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { insertDoctorSchema } from "@db/schema";
import { useLocation } from "wouter";
import { MultiSelect } from "@/components/ui/multi-select";

export default function AuthPage() {
  const { loginMutation, registerDoctorMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [isRegistering, setIsRegistering] = useState(false);

  // Fetch available clinics for registration
  const { data: clinics } = useQuery({
    queryKey: ["/api/clinics"],
    enabled: isRegistering,
  });

  const loginForm = useForm({
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const registrationForm = useForm({
    resolver: zodResolver(insertDoctorSchema),
    defaultValues: {
      username: "",
      password: "",
      fullName: "",
      email: "",
      specialization: "",
      licenseNumber: "",
      clinicIds: [],
      role: "doctor",
    },
  });

  const onLogin = async (data: any) => {
    try {
      await loginMutation.mutateAsync(data);
      setLocation("/doctor");
    } catch (error) {
      console.error(error);
    }
  };

  const onRegister = async (data: any) => {
    try {
      await registerDoctorMutation.mutateAsync(data);
      setLocation("/doctor");
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container relative min-h-screen flex-col items-center justify-center grid lg:max-w-none lg:grid-cols-2 lg:px-0">
        <div className="relative hidden h-full flex-col bg-muted p-10 text-white lg:flex dark:border-r">
          <div className="absolute inset-0 bg-zinc-900" />
          <div className="relative z-20 flex items-center text-lg font-medium">
            <h1 className="text-2xl">Cloud Cares Healthcare Platform</h1>
          </div>
          <div className="relative z-20 mt-auto">
            <blockquote className="space-y-2">
              <p className="text-lg">
                Join our network of healthcare professionals and provide seamless care to your patients
                through our integrated platform.
              </p>
            </blockquote>
          </div>
        </div>
        <div className="lg:p-8">
          <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
            <div className="flex flex-col space-y-2 text-center">
              <h1 className="text-2xl font-semibold tracking-tight">
                {isRegistering ? "Create your account" : "Welcome back"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {isRegistering
                  ? "Register as a healthcare provider"
                  : "Sign in to your account"}
              </p>
            </div>

            {!isRegistering ? (
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                  <FormField
                    control={loginForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full">
                    Sign In
                  </Button>
                </form>
              </Form>
            ) : (
              <Form {...registrationForm}>
                <form onSubmit={registrationForm.handleSubmit(onRegister)} className="space-y-4">
                  <FormField
                    control={registrationForm.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={registrationForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={registrationForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={registrationForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={registrationForm.control}
                    name="specialization"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Specialization</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select your specialization" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="general">General Medicine</SelectItem>
                            <SelectItem value="pediatrics">Pediatrics</SelectItem>
                            <SelectItem value="cardiology">Cardiology</SelectItem>
                            <SelectItem value="dermatology">Dermatology</SelectItem>
                            <SelectItem value="orthopedics">Orthopedics</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={registrationForm.control}
                    name="licenseNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Medical License Number</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={registrationForm.control}
                    name="clinicIds"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Associated Clinics</FormLabel>
                        <FormControl>
                          <MultiSelect
                            options={clinics?.map((clinic: any) => ({
                              label: clinic.name,
                              value: clinic.id.toString(),
                            })) || []}
                            selected={field.value}
                            onChange={(values) => field.onChange(values)}
                            placeholder="Select clinics"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full">
                    Register
                  </Button>
                </form>
              </Form>
            )}

            <Button
              variant="link"
              className="px-8 text-center text-sm text-muted-foreground"
              onClick={() => setIsRegistering(!isRegistering)}
            >
              {isRegistering ? "Already have an account? Sign in" : "Need an account? Register"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}