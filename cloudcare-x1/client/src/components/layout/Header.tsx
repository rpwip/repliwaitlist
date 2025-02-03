import { Button } from "../ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";

export default function Header() {
  const { user, logoutMutation } = useAuth();

  return (
    <header className="border-b">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/">
          <a className="text-2xl font-bold text-primary">CloudCare X1</a>
        </Link>
        
        <nav className="flex items-center gap-6">
          {user ? (
            <>
              <Link href="/queue">
                <a className="text-sm font-medium">Queue Status</a>
              </Link>
              {user.isAdmin && (
                <Link href="/admin">
                  <a className="text-sm font-medium">Admin</a>
                </Link>
              )}
              <Button 
                variant="ghost" 
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
              >
                Logout
              </Button>
            </>
          ) : (
            <Link href="/auth">
              <a className="text-sm font-medium">Login</a>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
