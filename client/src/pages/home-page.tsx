import { Card, CardContent, CardHeader } from "@/components/ui/card";
import RegistrationForm from "@/components/registration-form";
import { LanguageSelector } from "@/components/language-selector";
import { useLanguage } from "@/lib/language-context";
import { getTranslation } from "@/lib/translations";

export default function HomePage() {
  const { language } = useLanguage();

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center text-center">
            <h1 className="text-4xl font-bold">{getTranslation('title', language)}</h1>
            <p className="mt-2 text-lg opacity-90">{getTranslation('subtitle', language)}</p>
            <div className="mt-4">
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