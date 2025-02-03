import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { CloudCareLogo } from "@/components/ui/cloud-care-logo";

export default function Header() {
  const { user, logoutMutation } = useAuth();

  return (
    <header className="border-b bg-primary/5">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/">
          <a className="flex items-center space-x-2">
            <CloudCareLogo size="lg" />
          </a>
        </Link>

        <nav className="flex items-center gap-6">
          {user ? (
            <>
              <Link href="/queue">
                <a className="text-sm font-medium hover:text-primary transition-colors">
                  Queue Status
                </a>
              </Link>
              {user.isAdmin && (
                <Link href="/admin">
                  <a className="text-sm font-medium hover:text-primary transition-colors">
                    Admin
                  </a>
                </Link>
              )}
              <Button 
                variant="secondary"
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
              >
                Logout
              </Button>
            </>
          ) : (
            <Link href="/auth">
              <a className="text-sm font-medium hover:text-primary transition-colors">
                Login
              </a>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}