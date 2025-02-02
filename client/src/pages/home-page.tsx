import { Card, CardContent, CardHeader } from "@/components/ui/card";
import PatientVerificationForm from "@/components/patient-verification-form";
import { LanguageSelector } from "@/components/language-selector";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white">
      <header className="bg-primary text-primary-foreground py-12">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-bold">Cloud Cares</h1>
              <p className="mt-2 text-lg opacity-90">
                Health Revolutionizing Platform
              </p>
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
              <h2 className="text-2xl font-semibold text-center">
                Patient Verification
              </h2>
            </CardHeader>
            <CardContent>
              <PatientVerificationForm />
            </CardContent>
          </Card>

          <div className="hidden md:block space-y-6">
            {/* Doctor SVG Illustration */}
            <div className="relative bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg shadow-md">
              <svg className="w-full h-32" viewBox="0 0 200 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="50" cy="50" r="20" fill="#4F46E5" opacity="0.1"/>
                <path d="M40 50h20M50 40v20" stroke="#4F46E5" strokeWidth="4" strokeLinecap="round"/>
                <path d="M80 30c0 11-9 20-20 20s-20-9-20-20 9-20 20-20 20 9 20 20z" stroke="#4F46E5" strokeWidth="2"/>
                <path d="M90 70c10-5 20-5 30 0" stroke="#4F46E5" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <h3 className="text-lg font-semibold text-primary mt-2">Expert Healthcare Providers</h3>
              <p className="text-sm text-muted-foreground">Connected network of qualified doctors</p>
            </div>

            {/* Patient SVG Illustration */}
            <div className="relative bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg shadow-md">
              <svg className="w-full h-32" viewBox="0 0 200 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="100" cy="50" r="30" fill="#22C55E" opacity="0.1"/>
                <path d="M85 50a15 15 0 0130 0 15 15 0 01-30 0z" stroke="#22C55E" strokeWidth="2"/>
                <path d="M90 40h20M100 30v20" stroke="#22C55E" strokeWidth="2" strokeLinecap="round"/>
                <path d="M70 70c20-10 40-10 60 0" stroke="#22C55E" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <h3 className="text-lg font-semibold text-primary mt-2">Patient-Centric Care</h3>
              <p className="text-sm text-muted-foreground">Seamless healthcare experience</p>
            </div>

            {/* Pharmacy SVG Illustration */}
            <div className="relative bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-lg shadow-md">
              <svg className="w-full h-32" viewBox="0 0 200 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="60" y="20" width="80" height="60" rx="8" fill="#7C3AED" opacity="0.1"/>
                <path d="M90 50h20M100 40v20" stroke="#7C3AED" strokeWidth="4" strokeLinecap="round"/>
                <path d="M70 30h60" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round"/>
                <path d="M75 70h50" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <h3 className="text-lg font-semibold text-primary mt-2">Integrated Pharmacy Network</h3>
              <p className="text-sm text-muted-foreground">Easy access to medications</p>
            </div>

            <div className="text-center text-sm text-muted-foreground mt-6">
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