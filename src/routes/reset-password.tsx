import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { PageShell } from "@/components/kisan/app-shell";
import { SectionLabel } from "@/components/kisan/primitives";
import { useAuth } from "@/hooks/use-auth";
import { useKisan } from "@/lib/kisan/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [{ title: "Reset Password | KISAN SETU" }],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const { language } = useKisan();
  const hi = language === "hi";
  const { resetPassword, error, clearError } = useAuth();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setValidationError(null);

    if (password.length < 6) {
      setValidationError(hi ? "पासवर्ड कम से कम 6 अक्षरों का होना चाहिए" : "Password must be at least 6 characters");
      return;
    }
    if (password !== confirmPassword) {
      setValidationError(hi ? "पासवर्ड मेल नहीं खाते" : "Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      await resetPassword(password);
      setSuccess(true);
      setTimeout(() => {
        navigate({ to: "/login" });
      }, 3000);
    } catch (err) {
      // Error is handled in use-auth
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell>
      <div className="mx-auto max-w-md py-12">
        <div className="surface p-8">
          <div className="text-center">
            <span className="text-4xl">🔑</span>
            <SectionLabel className="mt-4 justify-center">
              {hi ? "पासवर्ड रीसेट" : "Password Reset"}
            </SectionLabel>
            <h1 className="mt-2 font-display text-2xl font-extrabold text-navy">
              {hi ? "नया पासवर्ड बनाएँ" : "Create New Password"}
            </h1>
          </div>

          {success ? (
            <div className="mt-8 rounded-xl bg-leaf-soft p-6 text-center">
              <span className="text-3xl text-leaf">✓</span>
              <p className="mt-3 font-semibold text-leaf">
                {hi ? "पासवर्ड सफलतापूर्वक रीसेट किया गया" : "Password reset successfully!"}
              </p>
              <p className="mt-1 text-sm text-leaf/80">
                {hi ? "लॉगिन पृष्ठ पर रीडायरेक्ट किया जा रहा है..." : "Redirecting to login..."}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              {(error || validationError) && (
                <div className="rounded-lg bg-danger-soft p-3 text-sm font-semibold text-danger">
                  {validationError || error}
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">
                  {hi ? "नया पासवर्ड" : "New Password"}
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-input bg-card px-4 py-3 text-sm font-semibold text-navy transition-colors focus-ring"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">
                  {hi ? "पासवर्ड की पुष्टि करें" : "Confirm Password"}
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-xl border border-input bg-card px-4 py-3 text-sm font-semibold text-navy transition-colors focus-ring"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className={cn(
                  "mt-6 w-full rounded-xl bg-gradient-leaf py-3.5 text-sm font-bold text-primary-foreground focus-ring transition-transform hover:-translate-y-0.5",
                  loading && "opacity-70 pointer-events-none"
                )}
              >
                {loading
                  ? hi ? "रीसेट किया जा रहा है..." : "Resetting..."
                  : hi ? "पासवर्ड सेव करें" : "Save New Password"}
              </button>
            </form>
          )}
        </div>
      </div>
    </PageShell>
  );
}
