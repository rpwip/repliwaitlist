import { Card, CardContent, CardHeader } from "@/components/ui/card";
import RegistrationForm from "@/components/registration-form";
import { LanguageSelector } from "@/components/language-selector";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white">
      <header className="bg-primary text-primary-foreground py-12">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-bold">Cloud Cares</h1>
              <p className="mt-2 text-lg opacity-90">Health Revolutionizing Platform</p>
            </div>
            <div className="w-56">
              <LanguageSelector />
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-2 gap-8 items-start">
          <Card className="w-full">
            <CardHeader>
              <h2 className="text-2xl font-semibold text-center">Patient Registration</h2>
            </CardHeader>
            <CardContent>
              <RegistrationForm />
            </CardContent>
          </Card>

          <div className="hidden md:block">
            <img 
              src={new URL('../../attached_assets/image post.jpg', import.meta.url).href}
              alt="Cloud Cares - India's Digital Health Revolution"
              className="w-full rounded-lg shadow-lg"
            />
            <div className="mt-4 text-center text-sm text-muted-foreground">
              <p>Connecting Hospitals, Pharmacies, Doctors, and Patients</p>
              <p className="mt-2">Email: contact@cloudcaresindia.com</p>
              <p>Phone: +91 93856 31319</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}