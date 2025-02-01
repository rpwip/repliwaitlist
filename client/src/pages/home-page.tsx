import { Card, CardContent, CardHeader } from "@/components/ui/card";
import RegistrationForm from "@/components/registration-form";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground py-8">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold">Cloud Cares</h1>
          <p className="mt-2 text-lg opacity-90">Modern Healthcare Queue Management</p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <h2 className="text-2xl font-semibold">Join Our Queue</h2>
            </CardHeader>
            <CardContent>
              <RegistrationForm />
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <h2 className="text-xl font-semibold">About Cloud Cares</h2>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Cloud Cares is a modern medical facility dedicated to providing efficient
                  and comfortable healthcare services. Our queue management system ensures
                  minimal waiting times and a streamlined patient experience.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h2 className="text-xl font-semibold">Our Services</h2>
              </CardHeader>
              <CardContent>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>General consultation</li>
                  <li>Digital queue management</li>
                  <li>SMS notifications</li>
                  <li>Online registration</li>
                  <li>Secure payment processing</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="mt-12 grid md:grid-cols-3 gap-6">
          <div className="relative h-48 rounded-lg overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1519494140681-8b17d830a3e9"
              alt="Modern waiting area"
              className="object-cover w-full h-full"
            />
          </div>
          <div className="relative h-48 rounded-lg overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7"
              alt="Medical consultation"
              className="object-cover w-full h-full"
            />
          </div>
          <div className="relative h-48 rounded-lg overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1576091160550-2173dba999ef"
              alt="Healthcare professionals"
              className="object-cover w-full h-full"
            />
          </div>
        </div>
      </main>
    </div>
  );
}
