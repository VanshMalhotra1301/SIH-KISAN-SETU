import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { AuthProvider } from "../hooks/use-auth";
import { KisanProvider } from "../lib/kisan/store";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error("Root Error Boundary Caught:", error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-lg text-center">
        <span className="text-4xl">🌾</span>
        <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-foreground">
          KISAN SETU
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong while loading this view. You can reload or return to the overview page.
        </p>

        {error?.message && (
          <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-left text-xs font-mono text-destructive overflow-auto max-h-36">
            <p className="font-bold">Error: {error.message}</p>
          </div>
        )}

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground transition-colors hover:bg-primary/90 focus-ring"
          >
            🔄 Reload View
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-xl border border-input bg-card px-5 py-2.5 text-xs font-bold text-foreground transition-colors hover:bg-muted focus-ring"
          >
            🏠 Return Home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "KISAN SETU — Smart Government Crop Procurement Platform" },
      {
        name: "description",
        content:
          "Digital Public Infrastructure for Crop Procurement: Smart centre recommendation, guaranteed slots, virtual queues, PFMS DBT tracking, and predictive governance.",
      },
      { name: "author", content: "Ministry of Consumer Affairs, Food & Public Distribution | KISAN SETU" },
      { property: "og:title", content: "KISAN SETU — Smart Government Crop Procurement Platform" },
      {
        property: "og:description",
        content: "From registration to procurement to payment — without the uncertainty.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Manrope:wght@500;600;700;800&family=Inter:wght@400;500;600;700&display=swap",
      },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
      { rel: "alternate icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "apple-touch-icon", href: "/favicon.svg" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <KisanProvider>
          {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
          <Outlet />
        </KisanProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
