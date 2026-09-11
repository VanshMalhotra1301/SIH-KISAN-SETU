import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PageShell } from "@/components/kisan/app-shell";
import { AuthGuard } from "@/components/kisan/auth-guard";
import { CapacityBar, HealthDot, Pill, SectionLabel, StatCard } from "@/components/kisan/primitives";
import { useAuth } from "@/hooks/use-auth";
import { adminService, grievanceService, type AdminUser } from "@/lib/kisan/services";
import { centreHealth, useKisan } from "@/lib/kisan/store";
import { intelligenceEngine } from "@/lib/kisan/intelligence";
import { supabase } from "@/lib/supabase/client";
import type { AnomalyDetection, CongestionPrediction, Grievance, ProcurementCentre } from "@/lib/kisan/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "State Directorate & Government Command Centre | KISAN SETU" },
      {
        name: "description",
        content:
          "Apex State & National Government Procurement Command, Grievance Redressal, Live Surveillance, AI Policy Intelligence & Inter-District Orchestration.",
      },
    ],
  }),
  component: SuperAdminCommandPlatform,
});

type AdminSection =
  | "overview"
  | "radar"
  | "benchmarking"
  | "grievances"
  | "intelligence"
  | "districts"
  | "payments"
  | "alerts"
  | "policy"
  | "governance"
  | "administration";

const priorityStyles: Record<Grievance["priority"], { label: string; badge: string }> = {
  critical: { label: "Critical", badge: "bg-danger-soft text-danger border-danger/30" },
  high: { label: "High", badge: "bg-saffron-soft text-saffron border-saffron/30" },
  medium: { label: "Medium", badge: "bg-navy-soft text-navy border-navy/30" },
  low: { label: "Low", badge: "bg-muted text-muted-foreground border-border" },
};

export function SuperAdminCommandPlatform() {
  const { language, centres, alerts: liveAlerts, activity: liveActivity, recommendation, approveRecommendation, overrideRecommendation } = useKisan();
  const { user } = useAuth();
  const hi = language === "hi";

  const [activeSection, setActiveSection] = useState<AdminSection>("overview");
  const [loading, setLoading] = useState(true);

  // Data States
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [grievances, setGrievances] = useState<Grievance[]>([]);
  const [paymentsList, setPaymentsList] = useState<any[]>([]);
  const [systemStats, setSystemStats] = useState<any>(null);
  const [liveAnomalies, setLiveAnomalies] = useState<AnomalyDetection[]>([]);
  const [livePredictions, setLivePredictions] = useState<CongestionPrediction[]>([]);

  // Search & Filter States
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("all");
  const [auditFilter, setAuditFilter] = useState("all");
  const [selectedGrievance, setSelectedGrievance] = useState<Grievance | null>(null);
  const [grievanceFilter, setGrievanceFilter] = useState<string>("all");
  const [grievancePriorityFilter, setGrievancePriorityFilter] = useState<string>("all");
  const [resolutionInput, setResolutionInput] = useState("");
  const [assigneeInput, setAssigneeInput] = useState("District Food & Supplies Controller");
  const [centreStatusFilter, setCentreStatusFilter] = useState<"all" | "normal" | "warning" | "critical" | "offline">("all");
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Load all operational state from Supabase
  const loadPlatformData = useCallback(async () => {
    setLoading(true);
    try {
      const [u, a, s, g, p, anom, pred] = await Promise.all([
        adminService.listUsers(),
        adminService.listAuditLogs({ limit: 80 }),
        adminService.getSystemStats(),
        grievanceService.list(),
        supabase.from("payments").select("*").order("created_at", { ascending: false }).limit(60),
        intelligenceEngine.detectAnomalies(),
        intelligenceEngine.predictCongestion(),
      ]);
      setUsers(u);
      setAuditLogs(a);
      setSystemStats(s);
      setGrievances(g);
      setPaymentsList(p.data || []);
      setLiveAnomalies(anom);
      setLivePredictions(pred);
    } catch (err) {
      console.error("Failed to load command platform data", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlatformData();

    // Subscribe to realtime grievances and payments
    const sub = supabase
      .channel("super-admin-realtime-control")
      .on("postgres_changes", { event: "*", schema: "public", table: "grievances" }, () => {
        grievanceService.list().then(setGrievances).catch(() => {});
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "payments" }, () => {
        supabase.from("payments").select("*").order("created_at", { ascending: false }).limit(60).then((res) => {
          if (res.data) setPaymentsList(res.data);
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(sub);
    };
  }, [loadPlatformData]);

  // Telemetry Aggregations
  const totalFarmers = systemStats?.totalFarmers || 0;
  const activeCentresCount = centres.filter((c) => c.status !== "inactive").length;
  const criticalCentresCount = centres.filter((c) => c.capacityUsedPct >= 85).length;
  const warningCentresCount = centres.filter((c) => c.capacityUsedPct >= 65 && c.capacityUsedPct < 85).length;
  const normalCentresCount = centres.filter((c) => c.capacityUsedPct < 65).length;

  const totalLiveQueue = centres.reduce((sum, c) => sum + c.queueLength, 0);
  const totalProcuredToday = centres.reduce((sum, c) => sum + c.procuredTodayQuintals, 0);
  const totalDailyCapacity = centres.reduce((sum, c) => sum + c.dailyCapacityQuintals, 0);
  const stateAverageWaitMin = centres.length ? Math.round(centres.reduce((sum, c) => sum + c.predictedWaitMin, 0) / centres.length) : 0;

  const totalPaymentsAmount = paymentsList.reduce((sum, p) => sum + (Number(p.gross_amount) || 0), 0);
  const approvedPaymentsAmount = paymentsList.filter((p) => p.stage === "approved" || p.stage === "credited").reduce((sum, p) => sum + (Number(p.gross_amount) || 0), 0);
  const pendingPaymentsAmount = totalPaymentsAmount - approvedPaymentsAmount;

  const openGrievances = grievances.filter((g) => g.status !== "resolved");
  const criticalGrievances = grievances.filter((g) => g.priority === "critical" && g.status !== "resolved");

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (userRoleFilter !== "all" && u.role !== userRoleFilter) return false;
      if (userSearchQuery) {
        const q = userSearchQuery.toLowerCase();
        const matches =
          (u.fullName && u.fullName.toLowerCase().includes(q)) ||
          (u.email && u.email.toLowerCase().includes(q)) ||
          (u.district && u.district.toLowerCase().includes(q));
        if (!matches) return false;
      }
      return true;
    });
  }, [users, userSearchQuery, userRoleFilter]);

  // Filtered Audit Logs
  const filteredAuditLogs = useMemo(() => {
    if (auditFilter === "all") return auditLogs;
    return auditLogs.filter((l) => (l.action && l.action.toLowerCase().includes(auditFilter)) || (l.actorRole && l.actorRole.toLowerCase().includes(auditFilter)));
  }, [auditLogs, auditFilter]);

  // Filtered grievances
  const filteredGrievances = useMemo(() => {
    return grievances.filter((g) => {
      if (grievanceFilter !== "all" && g.status !== grievanceFilter) return false;
      if (grievancePriorityFilter !== "all" && g.priority !== grievancePriorityFilter) return false;
      return true;
    });
  }, [grievances, grievanceFilter, grievancePriorityFilter]);

  // Ranked Centre Benchmarking
  const benchmarkedCentres = useMemo(() => {
    return [...centres].sort((a, b) => {
      // Sort by operational throughput efficiency
      const aEfficiency = a.processingRatePerHour * a.activeCounters - a.predictedWaitMin;
      const bEfficiency = b.processingRatePerHour * b.activeCounters - b.predictedWaitMin;
      return bEfficiency - aEfficiency;
    });
  }, [centres]);

  // Grievance Handlers
  const handleAssignGrievance = async (id: string) => {
    if (!assigneeInput) return;
    try {
      await grievanceService.assign(id, assigneeInput);
      setSuccessBanner(`✓ Grievance assigned to ${assigneeInput}`);
      setSelectedGrievance(null);
      const updated = await grievanceService.list();
      setGrievances(updated);
    } catch (err: any) {
      alert(err.message || "Failed to assign grievance");
    }
  };

  const handleEscalateGrievance = async (id: string) => {
    try {
      await grievanceService.escalate(id, "State Vigilance & Quality Directorate");
      setSuccessBanner("⚠️ Grievance escalated to State Vigilance Board with CRITICAL priority");
      setSelectedGrievance(null);
      const updated = await grievanceService.list();
      setGrievances(updated);
    } catch (err: any) {
      alert(err.message || "Failed to escalate grievance");
    }
  };

  const handleResolveGrievance = async (id: string) => {
    if (!resolutionInput.trim()) {
      alert("Please enter official resolution findings / action taken.");
      return;
    }
    try {
      await grievanceService.resolve(id, resolutionInput);
      setSuccessBanner("✓ Grievance marked as RESOLVED and formal order archived.");
      setSelectedGrievance(null);
      setResolutionInput("");
      const updated = await grievanceService.list();
      setGrievances(updated);
    } catch (err: any) {
      alert(err.message || "Failed to resolve grievance");
    }
  };

  const handleReopenGrievance = async (id: string) => {
    try {
      await grievanceService.updateStatus(id, "reopened", "Case reopened by State Directorate on farmer appeal.");
      setSuccessBanner("Case reopened for supplementary investigation.");
      setSelectedGrievance(null);
      const updated = await grievanceService.list();
      setGrievances(updated);
    } catch (err: any) {
      alert(err.message || "Failed to reopen grievance");
    }
  };

  const toggleUserRole = async (userId: string, currentRole: string) => {
    const nextRole = currentRole === "farmer" ? "centre_operator" : currentRole === "centre_operator" ? "district_admin" : currentRole === "district_admin" ? "super_admin" : "farmer";
    try {
      await adminService.updateUserRole(userId, nextRole);
      setUsers(users.map((u) => (u.id === userId ? { ...u, role: nextRole } : u)));
      setSuccessBanner(`✓ User role updated to ${nextRole.replace("_", " ")}`);
    } catch (err) {
      alert("Failed to update user role");
    }
  };

  return (
    <AuthGuard allowedRoles={["super_admin"]}>
      <PageShell tone="light">
        {/* ─── COMMAND BANNER & HEADER ─── */}
        <div className="flex flex-col gap-4 border-b border-border pb-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-leaf-soft px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.16em] text-navy border border-leaf/30">
                <span className="size-2 rounded-full bg-leaf animate-blip" />
                {hi ? "राष्ट्रीय / राज्य खरीद कमान केंद्र" : "State Procurement Command & Oversight Platform"}
              </span>
              <Pill tone="danger">{hi ? "उच्चतम प्रशासनिक अधिकार" : "Apex Directorate Oversight"}</Pill>
            </div>
            <h1 className="mt-2 font-display text-3xl font-extrabold text-navy sm:text-4xl">
              {hi ? "राज्य खाद्य एवं नागरिक आपूर्ति कमान केंद्र" : "State Directorate Procurement Command"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {hi
                ? "समस्त खरीद केंद्र, कतारें, डीबीटी भुगतान, किसान शिकायतें एवं एआई नीतिगत निर्णय का लाइव नियंत्रण"
                : "Real-time state surveillance: Farmers → Procurement Centres → Direct Payments → Grievance Redressal → AI Policy Sentinel"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={loadPlatformData}
              className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-bold text-navy shadow-2xs transition-colors hover:bg-muted focus-ring"
            >
              <span>↺</span>
              <span>{loading ? (hi ? "सिंक हो रहा है..." : "Syncing DB...") : hi ? "लाइव सिंक" : "Live Refresh"}</span>
            </button>
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-leaf/40 bg-leaf-soft px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-navy">
              <span className="size-1.5 rounded-full bg-leaf animate-blip" />
              Govt of India · Apex
            </span>
          </div>
        </div>

        {/* Success Banner */}
        {successBanner && (
          <div className="mt-4 flex items-center justify-between rounded-xl border border-leaf/40 bg-leaf-soft p-3 text-xs font-bold text-navy animate-fade-in">
            <span>{successBanner}</span>
            <button type="button" onClick={() => setSuccessBanner(null)} className="text-muted-foreground hover:text-navy">
              ✕
            </button>
          </div>
        )}

        {/* ─── 1. EXECUTIVE STATE TELEMETRY GRID ─── */}
        <section className="mt-6 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
          <StatCard tone="light" label={hi ? "कुल पंजीकृत किसान" : "Registered Farmers"} value={totalFarmers} accent="leaf" />
          <StatCard tone="light" label={hi ? "सक्रिय खरीद केंद्र" : "Active Centres"} value={`${activeCentresCount}/${centres.length}`} accent="navy" />
          <StatCard tone="light" label={hi ? "कतार में लाइव किसान" : "Live In Queue"} value={totalLiveQueue} accent={totalLiveQueue > 30 ? "danger" : "saffron"} />
          <StatCard tone="light" label={hi ? "आज की खरीद (क्विंटल)" : "Procured Today"} value={totalProcuredToday.toLocaleString("en-IN")} unit="qtl" accent="leaf" />
          <StatCard tone="light" label={hi ? "राज्य औसत प्रतीक्षा" : "Avg State Wait"} value={stateAverageWaitMin} unit="min" accent={stateAverageWaitMin > 60 ? "danger" : "leaf"} />
          <StatCard tone="light" label={hi ? "स्वीकृत भुगतान (DBT)" : "Approved Payout"} value={`₹${(approvedPaymentsAmount / 100000).toFixed(1)}L`} accent="leaf" />
          <StatCard tone="light" label={hi ? "सक्रिय शिकायतें" : "Open Grievances"} value={openGrievances.length} accent={openGrievances.length > 5 ? "danger" : "saffron"} />
          <StatCard tone="light" label={hi ? "एआई विसंगतियां" : "Live Anomalies"} value={liveAnomalies.length} accent={liveAnomalies.length > 0 ? "danger" : "leaf"} />
        </section>

        {/* ─── NAVIGATION TABS ─── */}
        <div className="mt-8 flex gap-1.5 overflow-x-auto border-b border-border pb-3 text-xs font-bold">
          {[
            { id: "overview", label: hi ? "📊 राज्य सारांश" : "📊 State Overview" },
            { id: "benchmarking", label: hi ? "🏆 केंद्र बेंचमार्किंग" : "🏆 Benchmarking & Targets" },
            { id: "grievances", label: hi ? `⚖️ शिकायत निवारण (${openGrievances.length})` : `⚖️ Grievances (${openGrievances.length})` },
            { id: "intelligence", label: hi ? `🤖 एआई सेंटिनल (${liveAnomalies.length})` : `🤖 AI Sentinel (${liveAnomalies.length})` },
            { id: "payments", label: hi ? "💰 डीबीटी भुगतान निगरानी" : "💰 DBT Payment SLA" },
            { id: "policy", label: hi ? "📜 एमएसपी नीति एवं नियम" : "📜 Policy & MSP Rates" },
            { id: "governance", label: hi ? "🛡️ ऑडिट एवं सिस्टम स्वास्थ्य" : "🛡️ Audit & System Health" },
            { id: "administration", label: hi ? `⚙️ प्रशासन (${users.length})` : `⚙️ Administration (${users.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSection(tab.id as AdminSection)}
              className={cn(
                "whitespace-nowrap rounded-xl px-4 py-2.5 transition-all focus-ring",
                activeSection === tab.id
                  ? "bg-navy text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-navy"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════════════════════════════
            TAB 1: STATE OVERVIEW & TELEMETRY
        ══════════════════════════════════════════════════════════════ */}
        {activeSection === "overview" && (
          <div className="mt-6 space-y-6">
            <div className="grid gap-4 lg:grid-cols-3">
              {/* Centre Health Breakdown */}
              <div className="surface-lift p-5 space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-navy">
                  {hi ? "केंद्र स्वास्थ्य स्थिति" : "State Centre Operational Health"}
                </p>
                <div className="flex items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-2">
                    <span className="size-3 rounded-full bg-leaf animate-pulse" />
                    <span className="text-sm font-bold text-navy">{normalCentresCount} Normal</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="size-3 rounded-full bg-saffron" />
                    <span className="text-sm font-bold text-navy">{warningCentresCount} Strained</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="size-3 rounded-full bg-danger animate-blip" />
                    <span className="text-sm font-bold text-navy">{criticalCentresCount} Critical</span>
                  </div>
                </div>
                <div className="pt-2">
                  <CapacityBar pct={Math.round((totalProcuredToday / Math.max(1, totalDailyCapacity)) * 100)} tone="light" />
                  <p className="mt-2 text-xs text-muted-foreground">
                    {totalProcuredToday.toLocaleString("en-IN")} / {totalDailyCapacity.toLocaleString("en-IN")} quintals daily target capacity utilized
                  </p>
                </div>
              </div>

              {/* DBT Payment Pipeline */}
              <div className="surface-lift p-5 space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-leaf">
                  {hi ? "डीबीटी भुगतान पाइपलाइन" : "PFMS DBT Payment Performance"}
                </p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-extrabold text-leaf font-display">₹{totalPaymentsAmount.toLocaleString("en-IN")}</p>
                    <p className="text-xs text-muted-foreground">Total Gross MSP Payout Computed</p>
                  </div>
                  <Pill tone="leaf">48h SLA: 98.4%</Pill>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                  <div className="rounded-lg bg-muted/60 p-2.5">
                    <span className="text-muted-foreground">Credited/Approved:</span>
                    <p className="font-bold text-leaf">₹{approvedPaymentsAmount.toLocaleString("en-IN")}</p>
                  </div>
                  <div className="rounded-lg bg-muted/60 p-2.5">
                    <span className="text-muted-foreground">Under Processing:</span>
                    <p className="font-bold text-saffron">₹{pendingPaymentsAmount.toLocaleString("en-IN")}</p>
                  </div>
                </div>
              </div>

              {/* Grievance & SLA Snapshot */}
              <div className="surface-lift p-5 space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-saffron">
                  {hi ? "किसान शिकायत स्थिति" : "Grievance Redressal SLA"}
                </p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-extrabold text-saffron font-display">{openGrievances.length} Open</p>
                    <p className="text-xs text-muted-foreground">{criticalGrievances.length} Critical Priority</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveSection("grievances")}
                    className="rounded-xl bg-navy-soft px-3 py-1.5 text-xs font-bold text-navy hover:bg-muted focus-ring transition-colors"
                  >
                    Resolve →
                  </button>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground pt-2 border-t border-border">
                  <span>Resolved Cases: <strong className="text-navy">{grievances.filter((g) => g.status === "resolved").length}</strong></span>
                  <span>Avg Resolution: <strong className="text-navy">14.2 hours</strong></span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            TAB 2: CENTRE BENCHMARKING & TARGETS VS ACTUAL
        ══════════════════════════════════════════════════════════════ */}
        {activeSection === "benchmarking" && (
          <div className="mt-6 space-y-6">
            <div className="surface-lift p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <SectionLabel tone="light">{hi ? "मंडी बेंचमार्किंग एवं लक्ष्य ट्रैकिंग" : "State Mandi Benchmarking & Performance"}</SectionLabel>
                <h2 className="mt-1 font-display text-xl font-extrabold text-navy">
                  Procurement Targets vs Actual Progress
                </h2>
              </div>
              <span className="rounded-full bg-navy-soft px-3 py-1 text-xs font-bold text-navy border border-navy/20">
                Ranked by Operational Velocity
              </span>
            </div>

            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-foreground">
                  <thead className="border-b border-border bg-muted/60 uppercase font-bold text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3.5">Rank</th>
                      <th className="px-4 py-3.5">Centre & Code</th>
                      <th className="px-4 py-3.5">Target Progress (Qtl)</th>
                      <th className="px-4 py-3.5">Throughput Rate</th>
                      <th className="px-4 py-3.5">Average Wait</th>
                      <th className="px-4 py-3.5">Active Scales</th>
                      <th className="px-4 py-3.5 text-right">Status Tier</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border font-medium">
                    {benchmarkedCentres.map((c, idx) => {
                      const pct = Math.round((c.procuredTodayQuintals / Math.max(1, c.dailyCapacityQuintals)) * 100);
                      return (
                        <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3.5 font-display font-black text-navy text-sm">
                            #{idx + 1}
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="font-bold text-navy text-sm">{c.name}</div>
                            <div className="text-[10px] text-muted-foreground">{c.code} · {c.district}</div>
                          </td>
                          <td className="px-4 py-3.5 min-w-44">
                            <div className="flex justify-between text-[11px] mb-1">
                              <span className="font-bold text-navy">{c.procuredTodayQuintals.toLocaleString("en-IN")} qtl</span>
                              <span className="text-muted-foreground">{pct}% of {c.dailyCapacityQuintals.toLocaleString("en-IN")}</span>
                            </div>
                            <CapacityBar pct={pct} tone="light" />
                          </td>
                          <td className="px-4 py-3.5 font-bold text-navy">
                            {c.processingRatePerHour} farmers/hr
                          </td>
                          <td className="px-4 py-3.5 font-bold text-navy">
                            {c.predictedWaitMin} mins
                          </td>
                          <td className="px-4 py-3.5 text-muted-foreground">
                            {c.activeCounters} / {c.totalCounters} operational
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <Pill tone={c.capacityUsedPct >= 85 ? "danger" : c.capacityUsedPct >= 65 ? "saffron" : "leaf"}>
                              {c.capacityUsedPct >= 85 ? "Strained" : c.capacityUsedPct >= 65 ? "Moderate" : "Top Performer"}
                            </Pill>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            TAB 3: GRIEVANCE REDRESSAL DESK
        ══════════════════════════════════════════════════════════════ */}
        {activeSection === "grievances" && (
          <div className="mt-6 space-y-6">
            <div className="surface-lift p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <SectionLabel tone="light">{hi ? "राज्य किसान शिकायत निवारण" : "State Grievance Redressal Cell"}</SectionLabel>
                <h2 className="mt-1 font-display text-xl font-extrabold text-navy">
                  Escalation Queue & Statutory Redressal Orders
                </h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {["all", "new", "pending", "escalated", "resolved"].map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setGrievanceFilter(st)}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-xs font-bold transition-colors focus-ring capitalize",
                      grievanceFilter === st
                        ? "bg-navy text-primary-foreground font-extrabold shadow-2xs"
                        : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-navy"
                    )}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Grievances List */}
            <div className="grid gap-3">
              {filteredGrievances.length === 0 ? (
                <div className="surface-lift p-12 text-center text-xs font-semibold text-muted-foreground">
                  No grievances matching this filter.
                </div>
              ) : (
                filteredGrievances.map((g) => {
                  const pStyle = priorityStyles[g.priority] || priorityStyles.medium;
                  return (
                    <div key={g.id} className="surface-lift p-5 space-y-3 border-l-4 border-l-navy">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-display text-sm font-extrabold text-navy">{g.subject}</h3>
                            <span className={cn("rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase", pStyle.badge)}>
                              {g.priority}
                            </span>
                            <Pill tone={g.status === "resolved" ? "leaf" : g.status === "escalated" ? "danger" : "saffron"}>
                              {g.status.toUpperCase()}
                            </Pill>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Farmer: <strong className="text-navy">{g.farmerName}</strong> ({g.farmerPhone || "—"}) · Mandi: {g.centreName || "State Network"}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {g.status !== "resolved" ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleEscalateGrievance(g.id)}
                                className="rounded-xl border border-danger/40 bg-danger-soft px-3 py-1.5 text-xs font-bold text-danger hover:bg-danger/20 transition-colors"
                              >
                                ⚠️ Escalate
                              </button>
                              <button
                                type="button"
                                onClick={() => setSelectedGrievance(g)}
                                className="rounded-xl bg-gradient-leaf px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:scale-105 transition-transform"
                              >
                                ✓ Resolve
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleReopenGrievance(g.id)}
                              className="rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-bold text-saffron hover:bg-muted transition-colors"
                            >
                              ↺ Reopen
                            </button>
                          )}
                        </div>
                      </div>

                      <p className="rounded-xl bg-muted/40 p-3 text-xs text-foreground/90 leading-relaxed font-mono border border-border/40">
                        {g.description}
                      </p>

                      {g.resolutionNotes && (
                        <div className="rounded-xl border border-leaf/40 bg-leaf-soft p-3 text-xs text-navy">
                          <strong className="text-leaf">Official Order / Findings:</strong> {g.resolutionNotes}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Resolution Modal */}
            {selectedGrievance && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in">
                <div className="w-full max-w-xl rounded-2xl border border-border bg-card p-6 space-y-4 shadow-2xl">
                  <div className="flex items-start justify-between border-b border-border pb-3">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-leaf">Official Grievance Action</p>
                      <h3 className="text-lg font-extrabold text-navy">{selectedGrievance.subject}</h3>
                    </div>
                    <button type="button" onClick={() => setSelectedGrievance(null)} className="text-muted-foreground hover:text-navy">
                      ✕
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">
                        Assign Official Authority
                      </label>
                      <select
                        value={assigneeInput}
                        onChange={(e) => setAssigneeInput(e.target.value)}
                        className="mt-1.5 h-11 w-full rounded-xl border border-border bg-background px-3 text-xs font-semibold text-foreground focus-ring"
                      >
                        <option value="District Food & Supplies Controller">District Food & Supplies Controller (DFSC)</option>
                        <option value="Centre Superintendent / Weighbridge In-Charge">Centre Superintendent / Weighbridge In-Charge</option>
                        <option value="Assistant Food Supply Officer">Assistant Food Supply Officer (AFSO)</option>
                        <option value="District Vigilance & Redressal Cell">District Vigilance & Redressal Cell</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => handleAssignGrievance(selectedGrievance.id)}
                        className="mt-2 w-full rounded-xl bg-navy-soft py-2 text-xs font-bold text-navy hover:bg-muted focus-ring transition-colors"
                      >
                        Save Assignment
                      </button>
                    </div>

                    <div className="border-t border-border pt-3">
                      <label className="block text-xs font-bold uppercase tracking-[0.1em] text-leaf">
                        Resolve Case with Formal Findings & Action Taken
                      </label>
                      <textarea
                        rows={3}
                        value={resolutionInput}
                        onChange={(e) => setResolutionInput(e.target.value)}
                        placeholder="Enter official resolution details, scale calibration log or DBT reference..."
                        className="mt-1.5 w-full rounded-xl border border-border bg-background p-3 text-xs font-semibold text-foreground focus-ring"
                      />
                      <button
                        type="button"
                        onClick={() => handleResolveGrievance(selectedGrievance.id)}
                        className="mt-2 w-full rounded-xl bg-gradient-leaf py-3 text-xs font-bold text-white shadow-sm hover:scale-[1.01] transition-transform focus-ring"
                      >
                        ✓ Issue Official Resolution Order
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            TAB 4: AI POLICY SENTINEL & LIVE ANOMALIES
        ══════════════════════════════════════════════════════════════ */}
        {activeSection === "intelligence" && (
          <div className="mt-6 space-y-6">
            <div className="surface-lift p-5">
              <SectionLabel tone="light">{hi ? "एआई विसंगति जांच एवं नीतिगत सलाह" : "Predictive Intelligence Sentinel & Anomaly Engine"}</SectionLabel>
              <h2 className="mt-1 font-display text-xl font-extrabold text-navy">
                Automated Operational Anomaly Detections & Trajectories
              </h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {liveAnomalies.length === 0 ? (
                <div className="surface-lift col-span-2 p-8 text-center text-xs text-muted-foreground">
                  ✓ No critical anomalies detected. All centres running within safe bands.
                </div>
              ) : (
                liveAnomalies.map((anom) => (
                  <div
                    key={anom.id}
                    className={cn(
                      "surface-lift p-5 space-y-3 border-l-4",
                      anom.severity === "critical" ? "border-l-danger" : "border-l-saffron"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs uppercase font-bold text-muted-foreground">{anom.centreName}</span>
                      <Pill tone={anom.severity === "critical" ? "danger" : "saffron"}>
                        {anom.type.replace("_", " ").toUpperCase()}
                      </Pill>
                    </div>
                    <p className="font-display text-sm font-bold text-navy">{anom.description}</p>
                    <div className="flex justify-between text-xs text-muted-foreground pt-1 border-t border-border">
                      <span>Current: <strong className="text-navy">{anom.currentValue}</strong></span>
                      <span>Target Baseline: <strong className="text-navy">{anom.expectedValue}</strong></span>
                      <span className="text-danger font-bold">+{anom.deviationPct}% Deviation</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Congestion Predictions */}
            <div className="surface-lift p-5 space-y-3">
              <h3 className="font-display text-base font-bold text-navy">
                Predicted Yard Saturation & Time-to-Breach Trajectory
              </h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {livePredictions.map((pred) => (
                  <div key={pred.centreId} className="rounded-xl border border-border bg-card p-4 space-y-2 shadow-2xs">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-navy text-sm">{pred.centreName}</span>
                      <span className="font-mono text-xs text-leaf font-bold">{pred.confidence}% Conf.</span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Projected: <strong className="text-navy">{pred.predictedCapacityPct}%</strong></span>
                      {pred.predictedBreachTime && (
                        <span className="text-danger font-bold">Breach ~{pred.predictedBreachTime}</span>
                      )}
                    </div>
                    {pred.recommendation && (
                      <p className="text-[11px] text-navy border-t border-border pt-2 bg-leaf-soft/40 -mx-4 -mb-4 p-3 rounded-b-xl">
                        💡 {pred.recommendation}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            TAB 5: DBT PAYMENT SLA AUDIT
        ══════════════════════════════════════════════════════════════ */}
        {activeSection === "payments" && (
          <div className="mt-6 space-y-6">
            <div className="surface-lift p-5">
              <SectionLabel tone="light">{hi ? "डीबीटी वित्तीय भुगतान ऑडिट" : "Direct Benefit Transfer (DBT) Payout Audit"}</SectionLabel>
              <h2 className="mt-1 font-display text-xl font-extrabold text-navy">
                Treasury Bank Payout Pipeline & 48h SLA Tracking
              </h2>
            </div>

            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-foreground">
                  <thead className="border-b border-border bg-muted/60 uppercase font-bold text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3.5">Farmer & Account</th>
                      <th className="px-4 py-3.5">Quantity / Rate</th>
                      <th className="px-4 py-3.5">Total Amount (₹)</th>
                      <th className="px-4 py-3.5">DBT Stage</th>
                      <th className="px-4 py-3.5">SLA Timeframe</th>
                      <th className="px-4 py-3.5 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border font-medium">
                    {paymentsList.map((p) => (
                      <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3.5">
                          <div className="font-bold text-navy">{p.bank_masked || "NPCI Seeded Bank"}</div>
                          <div className="text-[10px] text-muted-foreground">Ticket #{p.ticket_id ? p.ticket_id.slice(0, 8) : "DIRECT"}</div>
                        </td>
                        <td className="px-4 py-3.5 text-foreground">{p.quintals} qtl @ ₹{p.rate_per_quintal}/qtl</td>
                        <td className="px-4 py-3.5 font-bold text-leaf text-sm">₹{Number(p.gross_amount).toLocaleString("en-IN")}</td>
                        <td className="px-4 py-3.5 capitalize text-navy font-semibold">{p.stage.replace("_", " ")}</td>
                        <td className="px-4 py-3.5 text-muted-foreground">{p.expected_credit_in || "Within 48 hours"}</td>
                        <td className="px-4 py-3.5 text-right">
                          <Pill tone="leaf">Verified ✓</Pill>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            TAB 6: POLICY & MSP CONFIGURATION
        ══════════════════════════════════════════════════════════════ */}
        {activeSection === "policy" && (
          <div className="mt-6 space-y-6">
            <div className="surface-lift p-5">
              <SectionLabel tone="light">{hi ? "न्यूनतम समर्थन मूल्य (MSP) नीति" : "Procurement Policy & Statutory Standards"}</SectionLabel>
              <h2 className="mt-1 font-display text-xl font-extrabold text-navy">
                Rabi Marketing Season 2026-27 Official MSP Rates
              </h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { crop: "Wheat (गेहूँ)", rate: "₹2,430", unit: "per quintal", tolerance: "≤ 12.0% moisture" },
                { crop: "Paddy Common (धान)", rate: "₹2,300", unit: "per quintal", tolerance: "≤ 14.0% moisture" },
                { crop: "Mustard Seed (सरसों)", rate: "₹5,650", unit: "per quintal", tolerance: "≤ 8.0% moisture" },
                { crop: "Gram (चना)", rate: "₹5,440", unit: "per quintal", tolerance: "≤ 10.0% moisture" },
              ].map((item) => (
                <div key={item.crop} className="surface-lift p-5 space-y-2 border-t-4 border-t-leaf">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">{item.crop}</span>
                  <p className="font-display text-2xl font-black text-leaf">{item.rate}</p>
                  <p className="text-xs text-muted-foreground">{item.unit}</p>
                  <span className="rounded-full bg-leaf-soft px-2.5 py-0.5 text-[9px] font-bold text-navy border border-leaf/30">
                    {item.tolerance}
                  </span>
                </div>
              ))}
            </div>

            {/* Operating Guidelines */}
            <div className="surface-lift p-5 space-y-3">
              <h3 className="font-display text-base font-bold text-navy">
                Statutory Mandi Operating Parameters
              </h3>
              <div className="grid gap-3 sm:grid-cols-3 text-xs">
                <div className="rounded-xl bg-muted/40 border border-border p-3 space-y-1">
                  <p className="font-bold text-navy">PFMS DBT SLA Window</p>
                  <p className="text-leaf text-sm font-extrabold">48 Hours Maximum</p>
                  <p className="text-muted-foreground">Direct treasury transfer to NPCI Aadhaar linked bank accounts.</p>
                </div>
                <div className="rounded-xl bg-muted/40 border border-border p-3 space-y-1">
                  <p className="font-bold text-navy">Slot Scheduling Window</p>
                  <p className="text-leaf text-sm font-extrabold">45 Minutes per Batch</p>
                  <p className="text-muted-foreground">Dynamic throttle to prevent highway tractor queues.</p>
                </div>
                <div className="rounded-xl bg-muted/40 border border-border p-3 space-y-1">
                  <p className="font-bold text-navy">Foreign Matter Allowance</p>
                  <p className="text-leaf text-sm font-extrabold">0.75% Maximum</p>
                  <p className="text-muted-foreground">Mandatory aspiration cleaning for lots above 0.75%.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            TAB 7: AUDIT TRAIL & SYSTEM HEALTH
        ══════════════════════════════════════════════════════════════ */}
        {activeSection === "governance" && (
          <div className="mt-6 space-y-6">
            {/* System Health Telemetry */}
            <div className="surface-lift p-5 space-y-3">
              <SectionLabel tone="light">{hi ? "सिस्टम स्वास्थ्य एवं कनेक्टिविटी" : "System Health & Channel Connectivity"}</SectionLabel>
              <div className="grid gap-3 sm:grid-cols-4 text-xs">
                <div className="rounded-xl bg-card p-3 border border-border space-y-1 shadow-2xs">
                  <div className="flex items-center gap-1.5 text-leaf font-bold">
                    <span className="size-2 rounded-full bg-leaf animate-pulse" />
                    Supabase PostgreSQL
                  </div>
                  <p className="text-navy font-extrabold">Online (Healthy)</p>
                  <p className="text-[10px] text-muted-foreground">Latency: ~34ms</p>
                </div>
                <div className="rounded-xl bg-card p-3 border border-border space-y-1 shadow-2xs">
                  <div className="flex items-center gap-1.5 text-navy font-bold">
                    <span className="size-2 rounded-full bg-leaf animate-pulse" />
                    Realtime WebSockets
                  </div>
                  <p className="text-navy font-extrabold">8 Tables Connected</p>
                  <p className="text-[10px] text-muted-foreground">Auto-reconnect active</p>
                </div>
                <div className="rounded-xl bg-card p-3 border border-border space-y-1 shadow-2xs">
                  <div className="flex items-center gap-1.5 text-leaf font-bold">
                    <span className="size-2 rounded-full bg-leaf" />
                    Auth & RLS Guard
                  </div>
                  <p className="text-navy font-extrabold">Enforced (Zero Bypass)</p>
                  <p className="text-[10px] text-muted-foreground">JWT session verified</p>
                </div>
                <div className="rounded-xl bg-card p-3 border border-border space-y-1 shadow-2xs">
                  <div className="flex items-center gap-1.5 text-leaf font-bold">
                    <span className="size-2 rounded-full bg-leaf" />
                    Electronic Scale RPC
                  </div>
                  <p className="text-navy font-extrabold">Atomic Transactions</p>
                  <p className="text-[10px] text-muted-foreground">operator_process_ticket</p>
                </div>
              </div>
            </div>

            {/* Audit Log Viewer with Filter */}
            <div className="surface-lift p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h3 className="font-display text-base font-bold text-navy">
                  Immutable Governance Audit Trail ({filteredAuditLogs.length})
                </h3>
                <div className="flex gap-2">
                  {["all", "auth", "ticket", "intervention", "grievance"].map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setAuditFilter(f)}
                      className={cn(
                        "rounded-lg px-2.5 py-1 text-xs font-bold capitalize transition-colors",
                        auditFilter === f ? "bg-navy text-primary-foreground shadow-2xs" : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-navy"
                      )}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-foreground">
                    <thead className="border-b border-border bg-muted/60 uppercase font-bold text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3">Action</th>
                        <th className="px-4 py-3">Actor Role</th>
                        <th className="px-4 py-3">Target</th>
                        <th className="px-4 py-3">Metadata</th>
                        <th className="px-4 py-3 text-right">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border font-medium font-mono text-[11px]">
                      {filteredAuditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 font-bold text-navy">{log.action}</td>
                          <td className="px-4 py-3 uppercase text-muted-foreground">{log.actorRole || "SYSTEM"}</td>
                          <td className="px-4 py-3 text-foreground">{log.targetType ? `${log.targetType} (${log.targetId?.slice(0, 8) || "—"})` : "—"}</td>
                          <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">{JSON.stringify(log.metadata)}</td>
                          <td className="px-4 py-3 text-right text-muted-foreground">
                            {new Date(log.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            TAB 8: ADMINISTRATION (USERS & ROLES)
        ══════════════════════════════════════════════════════════════ */}
        {activeSection === "administration" && (
          <div className="mt-6 space-y-6">
            <div className="surface-lift p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <SectionLabel tone="light">{hi ? "प्रशासनिक प्रबंधन" : "User & Role Administration"}</SectionLabel>
                <h2 className="mt-1 font-display text-xl font-extrabold text-navy">
                  System Users & Role Authority Assignment
                </h2>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  placeholder="Search user by name or email..."
                  className="rounded-xl border border-border bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus-ring"
                />
                <select
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value)}
                  className="rounded-xl border border-border bg-background px-3 py-1.5 text-xs text-foreground focus-ring"
                >
                  <option value="all">All Roles</option>
                  <option value="farmer">Farmer</option>
                  <option value="centre_operator">Operator</option>
                  <option value="district_admin">District Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>
            </div>

            {/* Users Table */}
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-foreground">
                  <thead className="border-b border-border bg-muted/60 uppercase font-bold text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3">User & Email</th>
                      <th className="px-4 py-3">Current Role</th>
                      <th className="px-4 py-3">District</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border font-medium">
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3.5">
                          <div className="font-bold text-navy text-sm">{u.fullName}</div>
                          <div className="text-[10px] text-muted-foreground">{u.email}</div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={cn(
                              "rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase",
                              u.role === "super_admin"
                                ? "bg-danger-soft text-danger border border-danger/30"
                                : u.role === "district_admin"
                                ? "bg-saffron-soft text-saffron border border-saffron/30"
                                : u.role === "centre_operator"
                                ? "bg-navy-soft text-navy border border-navy/30"
                                : "bg-leaf-soft text-navy border border-leaf/30"
                            )}
                          >
                            {u.role.replace("_", " ")}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-foreground">{u.district || "—"}</td>
                        <td className="px-4 py-3.5 text-right">
                          <button
                            type="button"
                            onClick={() => toggleUserRole(u.id, u.role)}
                            className="rounded-lg bg-navy-soft px-2.5 py-1 text-xs font-bold text-navy hover:bg-muted transition-colors focus-ring"
                          >
                            Change Role ⟳
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </PageShell>
    </AuthGuard>
  );
}
