import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/kisan/app-shell";
import { BrandMark, PrototypeBadge } from "@/components/kisan/primitives";
import { useAuth } from "@/hooks/use-auth";
import {
  ROLE_LABELS,
  ROLE_PORTALS,
  type SignUpAdminPayload,
  type SignUpFarmerPayload,
  type SignUpOperatorPayload,
  type SignUpSuperAdminPayload,
  type UserRole,
} from "@/lib/supabase/auth";
import { centreService } from "@/lib/kisan/services";
import type { ProcurementCentre } from "@/lib/kisan/types";
import { useKisan } from "@/lib/kisan/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "National Agricultural Procurement Portal — Sign In & Register | KISAN SETU" },
      {
        name: "description",
        content:
          "Official authentication and registration portal for Farmers, Procurement Centre Operators, District Administrators, and State Super Admins.",
      },
    ],
  }),
  component: LoginPage,
});

type AuthMode = "signin" | "signup" | "forgot";

export function LoginPage() {
  const { language } = useKisan();
  const { login, signUp, forgotPassword, user, logout, error, notice, clearError } = useAuth();
  const router = useRouter();
  const hi = language === "hi";

  const [mode, setMode] = useState<AuthMode>("signin");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [centres, setCentres] = useState<ProcurementCentre[]>([]);

  // Sign In state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Sign Up state
  const [signupRole, setSignupRole] = useState<UserRole>("farmer");
  const [fullName, setFullName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [district, setDistrict] = useState("Karnal");
  const [village, setVillage] = useState("");
  const [crop, setCrop] = useState("Wheat");
  const [quantity, setQuantity] = useState("120");
  const [selectedCentreId, setSelectedCentreId] = useState("");
  const [department, setDepartment] = useState("");

  // Forgot Password state
  const [forgotEmail, setForgotEmail] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  // Load centres list for Operator Sign Up
  useEffect(() => {
    centreService.list().then((list) => {
      setCentres(list);
      if (list.length > 0) setSelectedCentreId(list[0]!.id);
    }).catch(() => {});
  }, []);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (!loginEmail || !loginPassword) {
      setLocalError(hi ? "कृपया ईमेल और पासवर्ड दर्ज करें।" : "Please enter both email and password.");
      return;
    }

    setIsSubmitting(true);
    try {
      const u = await login(loginEmail, loginPassword);
      const targetPath = ROLE_PORTALS[u.role] || "/farmer";
      router.navigate({ to: targetPath as any });
    } catch (err: any) {
      // Handled by AuthContext
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (signupPassword !== confirmPassword) {
      setLocalError(hi ? "पासवर्ड मेल नहीं खाते।" : "Passwords do not match.");
      return;
    }

    if (signupPassword.length < 6) {
      setLocalError(hi ? "पासवर्ड कम से कम 6 अक्षरों का होना चाहिए।" : "Password must be at least 6 characters.");
      return;
    }

    setIsSubmitting(true);
    try {
      let payload;

      if (signupRole === "farmer") {
        payload = {
          role: "farmer" as const,
          email: signupEmail,
          password: signupPassword,
          fullName,
          fullNameHi: fullName,
          phone,
          district: district || "Karnal",
          village: village || "Bahadurgarh",
          villageHi: village || "बहादुरगढ़",
          crop,
          cropHi: crop === "Wheat" ? "गेहूँ" : crop === "Paddy" ? "धान" : crop === "Mustard" ? "सरसों" : "चना",
          quantityQuintals: Number(quantity) || 120,
        } as SignUpFarmerPayload;
      } else if (signupRole === "centre_operator") {
        payload = {
          role: "centre_operator" as const,
          email: signupEmail,
          password: signupPassword,
          fullName,
          fullNameHi: fullName,
          phone,
          district: district || "Karnal",
          centreId: selectedCentreId || centres[0]?.id || "",
        } as SignUpOperatorPayload;
      } else if (signupRole === "district_admin") {
        payload = {
          role: "district_admin" as const,
          email: signupEmail,
          password: signupPassword,
          fullName,
          fullNameHi: fullName,
          phone,
          district: district || "Karnal",
          department: department || "District Collectorate / Agriculture Office",
        } as SignUpAdminPayload;
      } else {
        payload = {
          role: "super_admin" as const,
          email: signupEmail,
          password: signupPassword,
          fullName,
          fullNameHi: fullName,
          phone,
          district: district || "State HQ",
          department: department || "State Directorate of Agriculture",
        } as SignUpSuperAdminPayload;
      }

      const res = await signUp(payload);
      if (res.user) {
        const dest = ROLE_PORTALS[res.user.role] || "/farmer";
        router.navigate({ to: dest as any });
      }
    } catch (err: any) {
      // Handled by AuthContext
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (!forgotEmail) {
      setLocalError(hi ? "कृपया अपना पंजीकृत ईमेल दर्ज करें।" : "Please enter your registered email.");
      return;
    }

    setIsSubmitting(true);
    try {
      await forgotPassword(forgotEmail);
    } catch (err: any) {
      // Handled by AuthContext
    } finally {
      setIsSubmitting(false);
    }
  };

  const roleOptions: Array<{ role: UserRole; icon: string; labelEn: string; labelHi: string; desc: string }> = [
    {
      role: "farmer",
      icon: "🌾",
      labelEn: "Farmer",
      labelHi: "किसान",
      desc: "Register harvest, book slots & track queue",
    },
    {
      role: "centre_operator",
      icon: "🏢",
      labelEn: "Centre Operator",
      labelHi: "केंद्र प्रभारी",
      desc: "Manage live queue, weighing & grading",
    },
    {
      role: "district_admin",
      icon: "🛰️",
      labelEn: "District Admin",
      labelHi: "जिला प्रशासक",
      desc: "Control tower, capacity & congestion AI",
    },
    {
      role: "super_admin",
      icon: "🏛️",
      labelEn: "Super Admin",
      labelHi: "सुपर एडमिन",
      desc: "Statewide oversight, policies & audits",
    },
  ];

  return (
    <PageShell>
      <div className="mx-auto max-w-xl py-6 sm:py-10">
        <div className="surface-lift overflow-hidden">
          {/* Header */}
          <div className="bg-hero p-6 text-primary-foreground sm:p-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BrandMark className="size-11" />
                <div>
                  <h1 className="font-display text-2xl font-extrabold tracking-tight">KISAN SETU</h1>
                  <p className="text-xs uppercase tracking-[0.16em] text-primary-foreground/70">
                    {hi ? "राष्ट्रीय कृषि खरीद पोर्टल" : "National Procurement Platform"}
                  </p>
                </div>
              </div>
              <PrototypeBadge tone="dark" />
            </div>
            <p className="mt-4 text-sm font-semibold leading-relaxed text-primary-foreground/80">
              {hi
                ? "सुरक्षित सरकारी प्रवेश द्वार — किसान, खरीद केंद्र, जिला नियंत्रण कक्ष एवं राज्य निदेशालय।"
                : "Official Secure Access Portal — Farmers, Procurement Centres, District Command, and State Directorate."}
            </p>
          </div>

          <div className="p-6 sm:p-8">
            {/* Active Session Card */}
            {user ? (
              <div className="mb-6 rounded-xl border border-leaf/40 bg-leaf-soft p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-leaf">
                      {hi ? "सक्रिय सत्र" : "Authenticated Session"}
                    </p>
                    <p className="font-display text-base font-extrabold text-navy">{user.fullName}</p>
                    <p className="text-xs text-muted-foreground">
                      {user.email} · <span className="font-bold uppercase text-navy">{ROLE_LABELS[user.role]?.en || user.role}</span>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => router.navigate({ to: ROLE_PORTALS[user.role] as any })}
                      className="rounded-lg bg-navy px-3 py-1.5 text-xs font-bold text-primary-foreground focus-ring"
                    >
                      {hi ? "डैशबोर्ड खोलें" : "Go to Dashboard"}
                    </button>
                    <button
                      type="button"
                      onClick={logout}
                      className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-bold text-danger focus-ring"
                    >
                      {hi ? "लॉगआउट" : "Sign Out"}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Notification & Error Alerts */}
            {(error || localError) && (
              <div className="mb-5 rounded-xl border border-danger/40 bg-danger-soft p-4 text-sm font-semibold text-danger">
                ✕ {error || localError}
              </div>
            )}

            {notice && (
              <div className="mb-5 rounded-xl border border-leaf/40 bg-leaf-soft p-4 text-sm font-semibold text-navy">
                ✓ {notice}
              </div>
            )}

            {/* Mode Tabs */}
            <div className="flex rounded-xl bg-muted p-1 text-xs font-bold">
              <button
                type="button"
                onClick={() => { setMode("signin"); clearError(); setLocalError(null); }}
                className={cn(
                  "flex-1 rounded-lg py-2.5 transition-colors",
                  mode === "signin" ? "bg-card text-navy shadow-sm" : "text-muted-foreground hover:text-navy",
                )}
              >
                🔐 {hi ? "साइन इन" : "Sign In"}
              </button>
              <button
                type="button"
                onClick={() => { setMode("signup"); clearError(); setLocalError(null); }}
                className={cn(
                  "flex-1 rounded-lg py-2.5 transition-colors",
                  mode === "signup" ? "bg-card text-navy shadow-sm" : "text-muted-foreground hover:text-navy",
                )}
              >
                📝 {hi ? "नया पंजीकरण (सभी भूमिकाएँ)" : "Create Account (All Roles)"}
              </button>
              <button
                type="button"
                onClick={() => { setMode("forgot"); clearError(); setLocalError(null); }}
                className={cn(
                  "flex-1 rounded-lg py-2.5 transition-colors",
                  mode === "forgot" ? "bg-card text-navy shadow-sm" : "text-muted-foreground hover:text-navy",
                )}
              >
                🔑 {hi ? "पासवर्ड रीसेट" : "Forgot Password"}
              </button>
            </div>

            {/* ─── TAB 1: SIGN IN ─── */}
            {mode === "signin" && (
              <form onSubmit={handleSignIn} className="mt-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {hi ? "ईमेल पता" : "Email Address"}
                  </label>
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="user@kisansetu.in"
                    className="mt-1.5 h-12 w-full rounded-xl border border-input bg-card px-4 text-sm font-semibold text-navy focus-ring"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      {hi ? "पासवर्ड" : "Password"}
                    </label>
                    <button
                      type="button"
                      onClick={() => setMode("forgot")}
                      className="text-xs font-semibold text-leaf hover:underline"
                    >
                      {hi ? "पासवर्ड भूल गए?" : "Forgot password?"}
                    </button>
                  </div>
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="mt-1.5 h-12 w-full rounded-xl border border-input bg-card px-4 text-sm font-semibold text-navy focus-ring"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="mt-4 flex h-12 w-full items-center justify-center rounded-xl bg-gradient-leaf text-sm font-bold text-primary-foreground transition-transform hover:-translate-y-0.5 focus-ring"
                >
                  {isSubmitting ? (hi ? "सत्यापित किया जा रहा है..." : "Authenticating with Supabase...") : hi ? "सुरक्षित प्रवेश करें" : "Sign In to Portal"}
                </button>

                <div className="mt-6 rounded-xl bg-muted/60 p-3.5 text-xs text-muted-foreground">
                  <p className="font-semibold text-navy">
                    {hi ? "भूमिका आधारित स्वचालित रीडायरेक्ट:" : "Role-Based Automatic Redirection:"}
                  </p>
                  <p className="mt-1 leading-relaxed">
                    {hi
                      ? "आपके लॉगिन के बाद सिस्टम डेटाबेस से आपकी सत्यापित भूमिका की जाँच करके संबंधित डैशबोर्ड (किसान, ऑपरेटर, या प्रशासनिक कंट्रोल टावर) पर रीडायरेक्ट करेगा।"
                      : "After login, your role is verified directly in Supabase and you are routed to your authorized dashboard (Farmer, Centre Operator, District Control Tower, or State Directorate)."}
                  </p>
                </div>
              </form>
            )}

            {/* ─── TAB 2: CREATE ACCOUNT (SIGN UP - ALL 4 ROLES) ─── */}
            {mode === "signup" && (
              <form onSubmit={handleSignUp} className="mt-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {hi ? "1. पंजीकरण भूमिका चुनें (सभी 4 भूमिकाएँ उपलब्ध)" : "1. Select Registration Role (All 4 Roles Available)"}
                  </label>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {roleOptions.map((opt) => (
                      <button
                        key={opt.role}
                        type="button"
                        onClick={() => setSignupRole(opt.role)}
                        className={cn(
                          "flex flex-col items-start gap-1 rounded-xl border-2 p-3 text-left transition-all focus-ring",
                          signupRole === opt.role
                            ? "border-leaf bg-leaf-soft shadow-sm"
                            : "border-border bg-card text-muted-foreground hover:border-leaf/40 hover:text-navy",
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-base">{opt.icon}</span>
                          <span className="font-display text-xs font-extrabold text-navy">
                            {hi ? opt.labelHi : opt.labelEn}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground line-clamp-1">{opt.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Common Fields */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      {hi ? "पूरा नाम" : "Full Name"}
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Ramesh Kumar"
                      className="mt-1.5 h-11 w-full rounded-xl border border-input bg-card px-3 text-sm font-semibold text-navy focus-ring"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      {hi ? "मोबाइल नंबर" : "Phone Number"}
                    </label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. +91 98765 43210"
                      className="mt-1.5 h-11 w-full rounded-xl border border-input bg-card px-3 text-sm font-semibold text-navy focus-ring"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {hi ? "ईमेल पता" : "Email Address"}
                  </label>
                  <input
                    type="email"
                    required
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    placeholder="user@domain.com"
                    className="mt-1.5 h-11 w-full rounded-xl border border-input bg-card px-3 text-sm font-semibold text-navy focus-ring"
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      {hi ? "पासवर्ड" : "Password"}
                    </label>
                    <input
                      type="password"
                      required
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      placeholder="••••••••"
                      className="mt-1.5 h-11 w-full rounded-xl border border-input bg-card px-3 text-sm font-semibold text-navy focus-ring"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      {hi ? "पासवर्ड पुष्टि करें" : "Confirm Password"}
                    </label>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="mt-1.5 h-11 w-full rounded-xl border border-input bg-card px-3 text-sm font-semibold text-navy focus-ring"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {hi ? "जिला" : "District / Region"}
                  </label>
                  <input
                    type="text"
                    required
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    placeholder="Karnal"
                    className="mt-1.5 h-11 w-full rounded-xl border border-input bg-card px-3 text-sm font-semibold text-navy focus-ring"
                  />
                </div>

                {/* 1. Farmer-specific fields */}
                {signupRole === "farmer" && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                        {hi ? "गाँव का नाम" : "Village"}
                      </label>
                      <input
                        type="text"
                        required
                        value={village}
                        onChange={(e) => setVillage(e.target.value)}
                        placeholder="Bahadurgarh"
                        className="mt-1.5 h-11 w-full rounded-xl border border-input bg-card px-3 text-sm font-semibold text-navy focus-ring"
                      />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                          {hi ? "फ़सल" : "Primary Crop"}
                        </label>
                        <select
                          value={crop}
                          onChange={(e) => setCrop(e.target.value)}
                          className="mt-1.5 h-11 w-full rounded-xl border border-input bg-card px-3 text-sm font-semibold text-navy focus-ring"
                        >
                          <option value="Wheat">🌾 {hi ? "गेहूँ (Wheat)" : "Wheat"}</option>
                          <option value="Paddy">🌱 {hi ? "धान (Paddy)" : "Paddy"}</option>
                          <option value="Mustard">🌼 {hi ? "सरसों (Mustard)" : "Mustard"}</option>
                          <option value="Gram">🫘 {hi ? "चना (Gram)" : "Gram"}</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                          {hi ? "मात्रा (क्विंटल)" : "Est. Quantity (qtl)"}
                        </label>
                        <input
                          type="number"
                          required
                          value={quantity}
                          onChange={(e) => setQuantity(e.target.value)}
                          placeholder="120"
                          className="mt-1.5 h-11 w-full rounded-xl border border-input bg-card px-3 text-sm font-semibold text-navy focus-ring"
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* 2. Operator-specific fields */}
                {signupRole === "centre_operator" && (
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      {hi ? "नियुक्त खरीद केंद्र" : "Assigned Procurement Centre"}
                    </label>
                    <select
                      value={selectedCentreId}
                      onChange={(e) => setSelectedCentreId(e.target.value)}
                      className="mt-1.5 h-11 w-full rounded-xl border border-input bg-card px-3 text-sm font-semibold text-navy focus-ring"
                    >
                      {centres.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.code} — {hi ? c.nameHi : c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* 3. District Admin specific fields */}
                {signupRole === "district_admin" && (
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      {hi ? "प्रशासनिक कार्यालय / पदनाम" : "Administrative Office / Designation"}
                    </label>
                    <input
                      type="text"
                      required
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      placeholder="e.g. Deputy Director of Agriculture, Karnal"
                      className="mt-1.5 h-11 w-full rounded-xl border border-input bg-card px-3 text-sm font-semibold text-navy focus-ring"
                    />
                  </div>
                )}

                {/* 4. Super Admin specific fields */}
                {signupRole === "super_admin" && (
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      {hi ? "राज्य निदेशालय / विभाग" : "State Directorate / Department"}
                    </label>
                    <input
                      type="text"
                      required
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      placeholder="e.g. State Agricultural Marketing Board / Directorate"
                      className="mt-1.5 h-11 w-full rounded-xl border border-input bg-card px-3 text-sm font-semibold text-navy focus-ring"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="mt-4 flex h-12 w-full items-center justify-center rounded-xl bg-gradient-leaf text-sm font-bold text-primary-foreground transition-transform hover:-translate-y-0.5 focus-ring"
                >
                  {isSubmitting
                    ? hi ? "पंजीकरण किया जा रहा है..." : "Creating Account in Supabase..."
                    : hi ? "पंजीकरण पूरा करें एवं डैशबोर्ड खोलें" : `Register as ${ROLE_LABELS[signupRole]?.en || signupRole} & Open Dashboard`}
                </button>
              </form>
            )}

            {/* ─── TAB 3: FORGOT PASSWORD ─── */}
            {mode === "forgot" && (
              <form onSubmit={handleForgotPassword} className="mt-6 space-y-4">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {hi
                    ? "अपना पंजीकृत ईमेल पता दर्ज करें। हम आपको पासवर्ड रीसेट करने के लिए सुरक्षित लिंक भेजेंगे।"
                    : "Enter your registered email address and we will send you a secure password reset link."}
                </p>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {hi ? "पंजीकृत ईमेल" : "Registered Email"}
                  </label>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="user@kisansetu.in"
                    className="mt-1.5 h-12 w-full rounded-xl border border-input bg-card px-4 text-sm font-semibold text-navy focus-ring"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="mt-4 flex h-12 w-full items-center justify-center rounded-xl bg-navy text-sm font-bold text-primary-foreground transition-transform hover:-translate-y-0.5 focus-ring"
                >
                  {isSubmitting ? (hi ? "भेजा जा रहा है..." : "Sending...") : hi ? "रीसेट लिंक भेजें" : "Send Password Reset Link"}
                </button>

                <div className="text-center mt-4">
                  <button
                    type="button"
                    onClick={() => setMode("signin")}
                    className="text-xs font-bold text-leaf hover:underline"
                  >
                    ← {hi ? "साइन इन पर वापस जाएँ" : "Back to Sign In"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
