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
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <h2 className="text-2xl font-semibold text-center">Patient Registration</h2>
          </CardHeader>
          <CardContent>
            <RegistrationForm />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}