import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { PrototypeBadge, Wordmark } from "@/components/kisan/primitives";
import { useAuth } from "@/hooks/use-auth";
import { useKisan } from "@/lib/kisan/store";
import { cn } from "@/lib/utils";

const allNavItems = [
  { to: "/", label: "Overview", labelHi: "परिचय", roles: ["farmer", "centre_operator", "district_admin", "super_admin", "guest"] },
  { to: "/farmer", label: "Farmer Portal", labelHi: "किसान पोर्टल", roles: ["farmer", "super_admin"] },
  { to: "/centre", label: "Mandi Centre", labelHi: "खरीद केंद्र", roles: ["centre_operator", "super_admin"] },
  { to: "/control-tower", label: "Control Tower", labelHi: "कंट्रोल टावर", roles: ["district_admin", "super_admin"] },
  { to: "/admin", label: "Admin Portal", labelHi: "एडमिन पोर्टल", roles: ["super_admin"] },
  { to: "/login", label: "Portals / Login", labelHi: "लॉगिन / पोर्टल", roles: ["guest"] },
] as const;

const roleBadgeMap = {
  farmer: { label: "Farmer", labelHi: "किसान", icon: "🌾", tone: "leaf" },
  centre_operator: { label: "Centre", labelHi: "केंद्र", icon: "🏢", tone: "navy" },
  district_admin: { label: "Admin", labelHi: "प्रशासन", icon: "🛰️", tone: "saffron" },
  super_admin: { label: "Super Admin", labelHi: "सुपर एडमिन", icon: "🏛️", tone: "danger" },
} as const;

export function TopBar({ tone = "light" }: { tone?: "light" | "dark" }) {
  const { language, toggleLanguage } = useKisan();
  const { user, role, logout } = useAuth();
  const hi = language === "hi";

  const badge = role ? roleBadgeMap[role] : null;
  const currentRole = role || "guest";
  const visibleNav = allNavItems.filter((item) => (item.roles as readonly string[]).includes(currentRole));

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b backdrop-blur-xl",
        tone === "dark"
          ? "border-command-line bg-command/85"
          : "border-border bg-background/85",
      )}
    >
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-3 px-4 sm:px-6">
        <Wordmark tone={tone} />
        <nav className="ml-auto hidden items-center gap-1 md:flex">
          {visibleNav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === "/" }}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-semibold transition-colors focus-ring",
                tone === "dark"
                  ? "text-command-muted hover:bg-command-panel hover:text-command-fg"
                  : "text-muted-foreground hover:bg-muted hover:text-navy",
              )}
              activeProps={{
                className: cn(
                  tone === "dark" ? "bg-command-panel text-command-fg" : "bg-navy-soft text-navy",
                ),
              }}
            >
              {hi ? item.labelHi : item.label}
            </Link>
          ))}
        </nav>

        {/* User Role Badge / Login Button */}
        {user ? (
          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className={cn(
                "hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold transition-transform hover:scale-105 sm:inline-flex",
                tone === "dark"
                  ? "border-command-line bg-command-panel text-cyan-signal"
                  : "border-leaf/30 bg-leaf-soft text-navy",
              )}
            >
              <span>{badge?.icon}</span>
              <span>{hi ? badge?.labelHi : badge?.label}</span>
            </Link>
            <button
              type="button"
              onClick={logout}
              title="Sign Out"
              className={cn(
                "rounded-lg p-1.5 text-xs font-bold transition-colors",
                tone === "dark" ? "text-command-muted hover:text-danger" : "text-muted-foreground hover:text-danger",
              )}
            >
              🚪
            </button>
          </div>
        ) : (
          <Link
            to="/login"
            className="rounded-lg bg-navy px-3 py-1.5 text-xs font-bold text-primary-foreground focus-ring"
          >
            {hi ? "लॉगिन" : "Sign In"}
          </Link>
        )}

        <button
          type="button"
          onClick={toggleLanguage}
          className={cn(
            "ml-auto flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-bold focus-ring md:ml-0",
            tone === "dark"
              ? "border-command-line text-command-fg"
              : "border-border text-navy",
          )}
          aria-label="Toggle language"
        >
          <span className={cn(hi ? "text-leaf" : "opacity-50")}>हिं</span>
          <span className="opacity-30">/</span>
          <span className={cn(!hi ? "text-leaf" : "opacity-50")}>EN</span>
        </button>

        <PrototypeBadge tone={tone} className="hidden lg:inline-flex" />
      </div>

      {/* Mobile nav */}
      <nav className="flex gap-1 overflow-x-auto border-t px-3 py-2 md:hidden">
        {visibleNav.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            activeOptions={{ exact: item.to === "/" }}
            className={cn(
              "whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold",
              tone === "dark" ? "text-command-muted" : "text-muted-foreground",
            )}
            activeProps={{
              className: cn(tone === "dark" ? "bg-command-panel text-command-fg" : "bg-navy-soft text-navy"),
            }}
          >
            {hi ? item.labelHi : item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

export function PageShell({
  children,
  tone = "light",
  className,
}: {
  children: ReactNode;
  tone?: "light" | "dark";
  className?: string;
}) {
  return (
    <div className={cn("min-h-screen", tone === "dark" ? "bg-command text-command-fg" : "bg-background")}>
      <TopBar tone={tone} />
      <main className={cn("mx-auto w-full max-w-7xl px-4 pb-20 pt-6 sm:px-6", className)}>{children}</main>
      <SiteFooter tone={tone} />
    </div>
  );
}

export function SiteFooter({ tone = "light" }: { tone?: "light" | "dark" }) {
  return (
    <footer
      className={cn(
        "border-t px-4 py-8 sm:px-6",
        tone === "dark" ? "border-command-line bg-command" : "border-border bg-card",
      )}
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className={cn("font-display text-sm font-extrabold", tone === "dark" ? "text-command-fg" : "text-navy")}>
            KISAN SETU
          </p>
          <p className={cn("text-xs", tone === "dark" ? "text-command-muted" : "text-muted-foreground")}>
            From registration to procurement to payment — without the uncertainty.
          </p>
        </div>
        <p className={cn("text-xs", tone === "dark" ? "text-command-muted" : "text-muted-foreground")}>
          Smart India Hackathon 2026 · PS 26032 · Connected to Supabase Live Procurement Cloud
        </p>
      </div>
    </footer>
  );
}
