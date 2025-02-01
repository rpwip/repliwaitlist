import { Card, CardContent, CardHeader } from "@/components/ui/card";
import RegistrationForm from "@/components/registration-form";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language-context";
import { getTranslation } from "@/lib/translations";

export default function HomePage() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground py-8">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold">{getTranslation('title', language)}</h1>
              <p className="mt-2 text-lg opacity-90">{getTranslation('subtitle', language)}</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant={language === 'en' ? 'secondary' : 'ghost'}
                onClick={() => setLanguage('en')}
              >
                English
              </Button>
              <Button
                variant={language === 'ta' ? 'secondary' : 'ghost'}
                onClick={() => setLanguage('ta')}
              >
                தமிழ்
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <h2 className="text-2xl font-semibold">{getTranslation('title', language)}</h2>
            </CardHeader>
            <CardContent>
              <RegistrationForm />
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <h2 className="text-xl font-semibold">{getTranslation('aboutTitle', language)}</h2>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  {getTranslation('aboutDescription', language)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h2 className="text-xl font-semibold">{getTranslation('servicesTitle', language)}</h2>
              </CardHeader>
              <CardContent>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  {getTranslation('services', language).map((service, index) => (
                    <li key={index}>{service}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}