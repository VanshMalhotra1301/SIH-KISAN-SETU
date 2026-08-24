import { useRouter } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";
import { ROLE_LABELS, ROLE_PORTALS, type UserRole } from "@/lib/supabase/auth";

interface AuthGuardProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
}

export function AuthGuard({ children, allowedRoles }: AuthGuardProps) {
  const { user, role, loading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.navigate({ to: "/login" as any });
    }
  }, [loading, isAuthenticated, router]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="size-10 animate-spin rounded-full border-4 border-leaf border-t-transparent" />
          <p className="text-sm font-semibold text-muted-foreground">Authenticating session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return (
      <div className="mx-auto max-w-lg p-8 text-center">
        <div className="rounded-2xl border border-danger/30 bg-danger-soft p-6">
          <p className="text-3xl">🔒</p>
          <h2 className="mt-3 font-display text-xl font-extrabold text-navy">Access Restricted</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            This portal requires a <strong>{allowedRoles.join(" or ")}</strong> account. You are currently logged in as a <strong>{role}</strong>.
          </p>
          <div className="mt-5 flex items-center justify-center gap-3">
            <button
              onClick={() => router.navigate({ to: (ROLE_PORTALS[role] || "/login") as any })}
              className="rounded-xl bg-gradient-leaf px-4 py-2.5 text-sm font-bold text-primary-foreground focus-ring"
            >
              Go to My Portal ({ROLE_LABELS[role]?.en || role})
            </button>
            <button
              onClick={() => router.navigate({ to: "/login" as any })}
              className="rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-bold text-navy focus-ring"
            >
              Switch Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
