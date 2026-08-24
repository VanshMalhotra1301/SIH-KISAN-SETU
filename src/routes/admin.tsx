import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PageShell } from "@/components/kisan/app-shell";
import { AuthGuard } from "@/components/kisan/auth-guard";
import { CapacityBar, HealthDot, Pill, PrototypeBadge, SectionLabel, StatCard } from "@/components/kisan/primitives";
import { useAuth } from "@/hooks/use-auth";
import { adminService, grievanceService, type AdminUser } from "@/lib/kisan/services";
import { centreHealth, useKisan } from "@/lib/kisan/store";
import { supabase } from "@/lib/supabase/client";
import type { ActivityEvent, AiRecommendation, CentreAlert, Grievance, ProcurementCentre } from "@/lib/kisan/types";
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
  | "grievances"
  | "intelligence"
  | "districts"
  | "payments"
  | "alerts"
  | "governance"
  | "administration";

const grievanceCategoryIcons: Record<Grievance["category"], string> = {
  weighing: "⚖️",
  delay: "⏱️",
  payment: "💰",
  quality_rejection: "🔬",
  staff_conduct: "👔",
  portal_bug: "💻",
  other: "📋",
};

const priorityStyles: Record<Grievance["priority"], { label: string; badge: string }> = {
  critical: { label: "Critical", badge: "bg-danger/20 text-danger border-danger/40" },
  high: { label: "High", badge: "bg-saffron/20 text-saffron border-saffron/40" },
  medium: { label: "Medium", badge: "bg-cyan-signal/20 text-cyan-signal border-cyan-signal/40" },
  low: { label: "Low", badge: "bg-muted/40 text-command-muted border-command-line" },
};

const statusStyles: Record<Grievance["status"], { label: string; tone: "leaf" | "danger" | "saffron" | "navy" | "muted" }> = {
  new: { label: "New", tone: "danger" },
  pending: { label: "Under Investigation", tone: "saffron" },
  escalated: { label: "Escalated to Board", tone: "danger" },
  resolved: { label: "Resolved", tone: "leaf" },
  reopened: { label: "Reopened", tone: "navy" },
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

  // Interaction States
  const [selectedCentre, setSelectedCentre] = useState<ProcurementCentre | null>(null);
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
      const [u, a, s, g, p] = await Promise.all([
        adminService.listUsers(),
        adminService.listAuditLogs({ limit: 60 }),
        adminService.getSystemStats(),
        grievanceService.list(),
        supabase.from("payments").select("*").order("created_at", { ascending: false }).limit(50),
      ]);
      setUsers(u);
      setAuditLogs(a);
      setSystemStats(s);
      setGrievances(g);
      setPaymentsList(p.data || []);
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
        supabase.from("payments").select("*").order("created_at", { ascending: false }).limit(50).then((res) => {
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

  // Filtered grievances
  const filteredGrievances = useMemo(() => {
    return grievances.filter((g) => {
      if (grievanceFilter !== "all" && g.status !== grievanceFilter) return false;
      if (grievancePriorityFilter !== "all" && g.priority !== grievancePriorityFilter) return false;
      return true;
    });
  }, [grievances, grievanceFilter, grievancePriorityFilter]);

  // Filtered centres for map radar
  const filteredCentres = useMemo(() => {
    return centres.filter((c) => {
      const health = centreHealth(c.capacityUsedPct);
      if (centreStatusFilter === "normal") return health === "green";
      if (centreStatusFilter === "warning") return health === "yellow";
      if (centreStatusFilter === "critical") return health === "red";
      if (centreStatusFilter === "offline") return c.status === "inactive";
      return true;
    });
  }, [centres, centreStatusFilter]);

  // District Aggregations
  const districtScorecards = useMemo(() => {
    const districtMap: Record<string, {
      district: string;
      centresCount: number;
      farmersServed: number;
      procuredQtl: number;
      totalWait: number;
      totalCapacityUsed: number;
      openComplaints: number;
      resolvedComplaints: number;
    }> = {};

    users.forEach((u) => {
      const d = u.district || "Operational Region";
      if (!districtMap[d]) {
        districtMap[d] = {
          district: d,
          centresCount: 0,
          farmersServed: 0,
          procuredQtl: 0,
          totalWait: 0,
          totalCapacityUsed: 0,
          openComplaints: 0,
          resolvedComplaints: 0,
        };
      }
      if (u.role === "farmer") districtMap[d].farmersServed += 1;
    });

    centres.forEach((c) => {
      const d = "Karnal Division"; // Primary cluster
      if (!districtMap[d]) {
        districtMap[d] = {
          district: d,
          centresCount: 0,
          farmersServed: 0,
          procuredQtl: 0,
          totalWait: 0,
          totalCapacityUsed: 0,
          openComplaints: 0,
          resolvedComplaints: 0,
        };
      }
      districtMap[d].centresCount += 1;
      districtMap[d].farmersServed += c.farmersToday;
      districtMap[d].procuredQtl += c.procuredTodayQuintals;
      districtMap[d].totalWait += c.predictedWaitMin;
      districtMap[d].totalCapacityUsed += c.capacityUsedPct;
    });

    grievances.forEach((g) => {
      const d = g.district || "Operational Region";
      if (districtMap[d]) {
        if (g.status === "resolved") districtMap[d].resolvedComplaints += 1;
        else districtMap[d].openComplaints += 1;
      }
    });

    return Object.values(districtMap);
  }, [users, centres, grievances]);

  return (
    <AuthGuard allowedRoles={["super_admin"]}>
      <PageShell tone="dark">
        {/* ─── COMMAND BANNER & HEADER ─── */}
        <div className="flex flex-col gap-4 border-b border-command-line pb-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-signal/15 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.16em] text-cyan-signal border border-cyan-signal/30">
                <span className="size-2 rounded-full bg-cyan-signal animate-blip" />
                {hi ? "राष्ट्रीय / राज्य खरीद कमान केंद्र" : "State Procurement Command & Oversight Platform"}
              </span>
              <Pill tone="danger">{hi ? "उच्चतम प्रशासनिक अधिकार" : "Apex Directorate Oversight"}</Pill>
            </div>
            <h1 className="mt-2 font-display text-3xl font-extrabold text-command-fg sm:text-4xl">
              {hi ? "राज्य खाद्य एवं नागरिक आपूर्ति कमान केंद्र" : "State Directorate Procurement Command"}
            </h1>
            <p className="mt-1 text-sm text-command-muted">
              {hi
                ? "समस्त खरीद केंद्र, कतारें, डीबीटी भुगतान, किसान शिकायतें एवं एआई नीतिगत निर्णय का लाइव नियंत्रण"
                : "Real-time state surveillance: Farmers → Procurement Centres → Direct Payments → Grievance Redressal → AI Policy Sentinel"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={loadPlatformData}
              className="flex items-center gap-2 rounded-xl border border-command-line bg-command-panel px-4 py-2.5 text-xs font-bold text-command-fg transition-colors hover:bg-command-line focus-ring"
            >
              <span>↺</span>
              <span>{loading ? (hi ? "सिंक हो रहा है..." : "Syncing DB...") : hi ? "लाइव सिंक" : "Live Refresh"}</span>
            </button>
            <PrototypeBadge tone="dark" />
          </div>
        </div>

        {/* Success Banner */}
        {successBanner && (
          <div className="mt-4 flex items-center justify-between rounded-xl border border-leaf/40 bg-leaf/10 p-3 text-xs font-bold text-leaf animate-fade-in">
            <span>{successBanner}</span>
            <button type="button" onClick={() => setSuccessBanner(null)} className="text-leaf/70 hover:text-leaf">
              ✕
            </button>
          </div>
        )}

        {/* ─── 1. EXECUTIVE STATE TELEMETRY GRID ─── */}
        <section className="mt-6 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
          <StatCard tone="dark" label={hi ? "कुल पंजीकृत किसान" : "Registered Farmers"} value={totalFarmers} accent="leaf" />
          <StatCard tone="dark" label={hi ? "सक्रिय खरीद केंद्र" : "Active Centres"} value={`${activeCentresCount}/${centres.length}`} accent="navy" />
          <StatCard tone="dark" label={hi ? "कतार में लाइव किसान" : "Live In Queue"} value={totalLiveQueue} accent={totalLiveQueue > 30 ? "danger" : "saffron"} />
          <StatCard tone="dark" label={hi ? "आज की खरीद (क्विंटल)" : "Procured Today"} value={totalProcuredToday.toLocaleString("en-IN")} unit="qtl" accent="leaf" />
          <StatCard tone="dark" label={hi ? "राज्य औसत प्रतीक्षा" : "Avg State Wait"} value={stateAverageWaitMin} unit="min" accent={stateAverageWaitMin > 60 ? "danger" : "leaf"} />
          <StatCard tone="dark" label={hi ? "स्वीकृत भुगतान (DBT)" : "Approved Payout"} value={`₹${(approvedPaymentsAmount / 100000).toFixed(1)}L`} accent="leaf" />
          <StatCard tone="dark" label={hi ? "सक्रिय शिकायतें" : "Open Grievances"} value={openGrievances.length} accent={openGrievances.length > 5 ? "danger" : "saffron"} />
          <StatCard tone="dark" label={hi ? "क्रिटिकल अलर्ट" : "Critical Warnings"} value={criticalCentresCount + criticalGrievances.length} accent="danger" />
        </section>

        {/* ─── NAVIGATION TABS ─── */}
        <div className="mt-8 flex gap-1.5 overflow-x-auto border-b border-command-line pb-3 text-xs font-bold">
          {[
            { id: "overview", label: hi ? "📊 राज्य सारांश" : "📊 State Overview" },
            { id: "radar", label: hi ? "🛰️ लाइव केंद्र मैप / रडार" : "🛰️ Live Centre Radar" },
            { id: "grievances", label: hi ? `⚖️ शिकायत निवारण (${openGrievances.length})` : `⚖️ Grievances (${openGrievances.length})` },
            { id: "intelligence", label: hi ? "🤖 एआई नीतिगत सलाह" : "🤖 AI Policy Sentinel" },
            { id: "districts", label: hi ? "🏛️ जिला तुलना" : "🏛️ District Scorecards" },
            { id: "payments", label: hi ? "💰 डीबीटी भुगतान निगरानी" : "💰 DBT Payment SLA" },
            { id: "alerts", label: hi ? `🚨 अलर्ट इनबॉक्स (${liveAlerts.length})` : `🚨 Alert Inbox (${liveAlerts.length})` },
            { id: "governance", label: hi ? "📜 ऑडिट एवं गवर्नेंस" : "📜 Governance Audit" },
            { id: "administration", label: hi ? `⚙️ प्रशासन (${users.length})` : `⚙️ Administration (${users.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSection(tab.id as AdminSection)}
              className={cn(
                "whitespace-nowrap rounded-xl px-4 py-2.5 transition-all focus-ring",
                activeSection === tab.id
                  ? "bg-command-line text-cyan-signal shadow-sm border border-cyan-signal/30"
                  : "text-command-muted hover:bg-command-panel hover:text-command-fg"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════════════════════════════
            TAB 1: STATE OVERVIEW & LIVE SURVEILLANCE
        ══════════════════════════════════════════════════════════════ */}
        {activeSection === "overview" && (
          <div className="mt-6 space-y-6">
            {/* Top Operational Status Bar */}
            <div className="grid gap-4 lg:grid-cols-3">
              {/* Centre Health Breakdown */}
              <div className="panel-command p-5 space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-signal">
                  {hi ? "केंद्र स्वास्थ्य स्थिति" : "State Centre Operational Health"}
                </p>
                <div className="flex items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-2">
                    <span className="size-3 rounded-full bg-leaf animate-pulse" />
                    <span className="text-sm font-bold text-command-fg">{normalCentresCount} Normal</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="size-3 rounded-full bg-saffron" />
                    <span className="text-sm font-bold text-command-fg">{warningCentresCount} Strained</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="size-3 rounded-full bg-danger animate-blip" />
                    <span className="text-sm font-bold text-command-fg">{criticalCentresCount} Critical</span>
                  </div>
                </div>
                <div className="pt-2">
                  <CapacityBar pct={Math.round((totalProcuredToday / Math.max(1, totalDailyCapacity)) * 100)} tone="dark" />
                  <p className="mt-2 text-xs text-command-muted">
                    {totalProcuredToday.toLocaleString("en-IN")} / {totalDailyCapacity.toLocaleString("en-IN")} quintals daily target capacity utilized
                  </p>
                </div>
              </div>

              {/* DBT Payment Pipeline */}
              <div className="panel-command p-5 space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-leaf">
                  {hi ? "डीबीटी भुगतान पाइपलाइन" : "PFMS DBT Payment Performance"}
                </p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-extrabold text-leaf font-display">₹{totalPaymentsAmount.toLocaleString("en-IN")}</p>
                    <p className="text-xs text-command-muted">Total Gross MSP Payout Computed</p>
                  </div>
                  <Pill tone="leaf">48h SLA: 98.4%</Pill>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                  <div className="rounded-lg bg-command-panel p-2">
                    <span className="text-command-muted">Credited/Approved:</span>
                    <p className="font-bold text-leaf">₹{approvedPaymentsAmount.toLocaleString("en-IN")}</p>
                  </div>
                  <div className="rounded-lg bg-command-panel p-2">
                    <span className="text-command-muted">Under Processing:</span>
                    <p className="font-bold text-saffron">₹{pendingPaymentsAmount.toLocaleString("en-IN")}</p>
                  </div>
                </div>
              </div>

              {/* Grievance & SLA Snapshot */}
              <div className="panel-command p-5 space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-saffron">
                  {hi ? "किसान शिकायत स्थिति" : "Grievance Redressal SLA"}
                </p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-extrabold text-command-fg font-display">
                      {openGrievances.length} <span className="text-sm font-normal text-command-muted">Active Cases</span>
                    </p>
                    <p className="text-xs text-command-muted">{criticalGrievances.length} marked as High/Critical priority</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveSection("grievances")}
                    className="rounded-lg bg-saffron/20 border border-saffron/40 px-3 py-1.5 text-xs font-bold text-saffron hover:bg-saffron/30"
                  >
                    Open Desk →
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1">
                  <div className="rounded-lg bg-command-panel p-1.5">
                    <p className="font-bold text-danger">{grievances.filter((g) => g.status === "new").length}</p>
                    <span className="text-[10px] text-command-muted">New</span>
                  </div>
                  <div className="rounded-lg bg-command-panel p-1.5">
                    <p className="font-bold text-saffron">{grievances.filter((g) => g.status === "escalated").length}</p>
                    <span className="text-[10px] text-command-muted">Escalated</span>
                  </div>
                  <div className="rounded-lg bg-command-panel p-1.5">
                    <p className="font-bold text-leaf">{grievances.filter((g) => g.status === "resolved").length}</p>
                    <span className="text-[10px] text-command-muted">Resolved</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Live Surveillance Stream & Active Interventions */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Live Operational Intelligence Feed */}
              <div className="panel-command overflow-hidden">
                <div className="flex items-center justify-between border-b border-command-line px-5 py-4">
                  <div>
                    <SectionLabel tone="dark">{hi ? "लाइव सर्विलांस फ़ीड" : "Live State Surveillance Feed"}</SectionLabel>
                    <h3 className="mt-1 font-display text-lg font-extrabold text-command-fg">Real-time Stream</h3>
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-signal">
                    <span className="size-2 rounded-full bg-cyan-signal animate-blip" /> Live
                  </span>
                </div>
                <div className="divide-y divide-command-line max-h-[380px] overflow-y-auto">
                  {liveActivity.map((evt) => (
                    <div key={evt.id} className="flex items-start gap-3 p-4 hover:bg-command-panel/60 transition-colors">
                      <span className="text-lg">
                        {evt.kind === "queue" ? "📋" : evt.kind === "ai" ? "🤖" : evt.kind === "payment" ? "💰" : "🏢"}
                      </span>
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-command-fg">{evt.message}</p>
                        <span className="text-[10px] font-mono text-command-muted">{evt.at}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Active AI Policy Recommendations */}
              <div className="panel-command p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-command-line pb-3">
                  <div>
                    <SectionLabel tone="dark">{hi ? "सक्रिय एआई नीति सुझाव" : "Apex AI Policy Interventions"}</SectionLabel>
                    <h3 className="mt-1 font-display text-lg font-extrabold text-command-fg">Congestion Balancing</h3>
                  </div>
                  <Pill tone="saffron">Confidence: {recommendation?.confidencePct || 89}%</Pill>
                </div>

                {recommendation ? (
                  <div className="space-y-4 rounded-xl border border-command-line bg-command-panel p-4">
                    <div>
                      <p className="text-sm font-extrabold text-command-fg">{recommendation.headline}</p>
                      <p className="mt-1 text-xs text-command-muted leading-relaxed">{recommendation.rationale}</p>
                    </div>

                    <div className="rounded-lg bg-leaf-soft/20 border border-leaf/30 p-3 text-xs text-leaf">
                      💡 <strong>Projected Impact:</strong> {recommendation.impact}
                    </div>

                    {recommendation.status === "pending" || recommendation.status === "reviewing" ? (
                      <div className="flex items-center gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            approveRecommendation();
                            setSuccessBanner("✓ AI Redistribution Plan approved and issued to affected procurement centres.");
                          }}
                          className="flex-1 rounded-xl bg-gradient-leaf py-2.5 text-xs font-bold text-primary-foreground hover:scale-[1.01] transition-transform focus-ring"
                        >
                          ✓ Execute Directive
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            overrideRecommendation();
                            setSuccessBanner("Directive overridden — manual staffing order logged.");
                          }}
                          className="rounded-xl border border-command-line bg-command-panel px-4 py-2.5 text-xs font-bold text-command-muted hover:text-danger focus-ring"
                        >
                          Override
                        </button>
                      </div>
                    ) : (
                      <div className="rounded-lg bg-command p-2.5 text-center text-xs font-bold text-leaf">
                        ✓ Directive Executed & Applied to State Schedule
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-8 text-center text-xs font-semibold text-command-muted">
                    All centres operating within optimal safe thresholds. Continuous ML monitoring active.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            TAB 2: LIVE GOVERNMENT CONTROL TOWER & RADAR MAP
        ══════════════════════════════════════════════════════════════ */}
        {activeSection === "radar" && (
          <div className="mt-6 grid gap-6 lg:grid-cols-[1.8fr_1fr]">
            {/* Left: Centre Map & Filter Bar */}
            <div className="panel-command p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-command-line pb-4">
                <div>
                  <SectionLabel tone="dark">{hi ? "राज्य खरीद रडार" : "State Procurement Radar"}</SectionLabel>
                  <h2 className="mt-1 font-display text-xl font-extrabold text-command-fg">
                    {hi ? "समस्त परिचालन क्षेत्र एवं खरीद केंद्र" : "Operational Centres Surveillance"}
                  </h2>
                </div>

                {/* Status Filter Buttons */}
                <div className="flex flex-wrap gap-1.5 text-xs font-bold">
                  {(["all", "normal", "warning", "critical", "offline"] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setCentreStatusFilter(st)}
                      className={cn(
                        "rounded-lg px-3 py-1.5 capitalize transition-all",
                        centreStatusFilter === st
                          ? "bg-cyan-signal text-command font-extrabold"
                          : "bg-command-panel text-command-muted hover:text-command-fg"
                      )}
                    >
                      {st === "all" ? "All Centres" : st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Interactive Vector Grid Map */}
              <div className="relative overflow-hidden rounded-2xl border border-command-line bg-command/90 p-4">
                <div className="absolute inset-0 grid-lines opacity-30 pointer-events-none" />
                <svg viewBox="0 0 100 90" className="relative w-full h-[420px]" role="img" aria-label="State Procurement Centre Radar">
                  <path
                    d="M10 15 L45 8 L82 16 L94 45 L86 78 L50 88 L16 80 L8 45 Z"
                    fill="color-mix(in oklab, var(--cyan-signal) 4%, transparent)"
                    stroke="color-mix(in oklab, var(--cyan-signal) 35%, transparent)"
                    strokeWidth="0.6"
                    strokeDasharray="2 2"
                  />

                  {/* Connect centres with radar mesh */}
                  {filteredCentres.map((c) =>
                    filteredCentres
                      .filter((o) => o.id !== c.id)
                      .slice(0, 1)
                      .map((o) => (
                        <line
                          key={`${c.id}-${o.id}`}
                          x1={c.map.x}
                          y1={c.map.y}
                          x2={o.map.x}
                          y2={o.map.y}
                          stroke="color-mix(in oklab, var(--command-line) 80%, transparent)"
                          strokeWidth="0.4"
                        />
                      ))
                  )}

                  {/* Centre Nodes */}
                  {filteredCentres.map((c) => {
                    const health = centreHealth(c.capacityUsedPct);
                    const isSelected = selectedCentre?.id === c.id;
                    const fill = health === "red" ? "var(--danger)" : health === "yellow" ? "var(--saffron)" : "var(--leaf)";

                    return (
                      <g
                        key={c.id}
                        onClick={() => setSelectedCentre(c)}
                        className="cursor-pointer group"
                        role="button"
                        tabIndex={0}
                      >
                        {/* Glow halo */}
                        <circle cx={c.map.x} cy={c.map.y} r={isSelected ? 8 : 6} fill={fill} opacity="0.18" />
                        <circle
                          cx={c.map.x}
                          cy={c.map.y}
                          r={health === "red" ? 4.8 : 3.8}
                          fill={fill}
                          opacity={health === "red" ? 0.38 : 0.22}
                          className={health === "red" ? "animate-blip" : undefined}
                        />
                        <circle cx={c.map.x} cy={c.map.y} r="2.2" fill={fill} stroke="var(--command)" strokeWidth="0.6" />

                        {/* Centre Label */}
                        <text
                          x={c.map.x}
                          y={c.map.y - 6}
                          textAnchor="middle"
                          fontSize="3.2"
                          fontWeight="800"
                          fill={isSelected ? "var(--cyan-signal)" : "var(--command-fg)"}
                        >
                          {c.code} · {c.capacityUsedPct}%
                        </text>
                        <text x={c.map.x} y={c.map.y + 7} textAnchor="middle" fontSize="2.4" fill="var(--command-muted)">
                          Q: {c.queueLength} | {c.predictedWaitMin}m
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Centre Quick Selector Chips */}
              <div className="flex flex-wrap gap-2 pt-2">
                {centres.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedCentre(c)}
                    className={cn(
                      "flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all",
                      selectedCentre?.id === c.id
                        ? "border-cyan-signal bg-cyan-signal/20 text-cyan-signal"
                        : "border-command-line bg-command-panel text-command-muted hover:text-command-fg"
                    )}
                  >
                    <span className="size-2 rounded-full" style={{ backgroundColor: centreHealth(c.capacityUsedPct) === "red" ? "var(--danger)" : centreHealth(c.capacityUsedPct) === "yellow" ? "var(--saffron)" : "var(--leaf)" }} />
                    <span>{c.name}</span>
                    <span className="text-[10px] opacity-70">({c.capacityUsedPct}%)</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Right: Centre Drilldown Drawer */}
            <div className="panel-command p-5 space-y-5">
              {selectedCentre ? (
                <>
                  <div className="flex items-start justify-between border-b border-command-line pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="flex size-7 items-center justify-center rounded-lg bg-cyan-signal font-display text-xs font-bold text-command">
                          {selectedCentre.code}
                        </span>
                        <h3 className="font-display text-lg font-extrabold text-command-fg">{selectedCentre.name}</h3>
                      </div>
                      <p className="mt-1 text-xs text-command-muted">{selectedCentre.nameHi}</p>
                    </div>
                    <HealthDot health={centreHealth(selectedCentre.capacityUsedPct)} />
                  </div>

                  {/* Core Metrics Grid */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="rounded-xl border border-command-line bg-command-panel p-3">
                      <span className="text-command-muted uppercase text-[10px] font-bold">Live Queue</span>
                      <p className="text-xl font-extrabold text-command-fg mt-0.5">{selectedCentre.queueLength} Farmers</p>
                    </div>
                    <div className="rounded-xl border border-command-line bg-command-panel p-3">
                      <span className="text-command-muted uppercase text-[10px] font-bold">Wait Time</span>
                      <p className="text-xl font-extrabold text-cyan-signal mt-0.5">{selectedCentre.predictedWaitMin} Minutes</p>
                    </div>
                    <div className="rounded-xl border border-command-line bg-command-panel p-3">
                      <span className="text-command-muted uppercase text-[10px] font-bold">Operational Counters</span>
                      <p className="text-xl font-extrabold text-command-fg mt-0.5">{selectedCentre.activeCounters} / {selectedCentre.totalCounters}</p>
                    </div>
                    <div className="rounded-xl border border-command-line bg-command-panel p-3">
                      <span className="text-command-muted uppercase text-[10px] font-bold">Throughput Rate</span>
                      <p className="text-xl font-extrabold text-leaf mt-0.5">{selectedCentre.processingRatePerHour} / hr</p>
                    </div>
                  </div>

                  {/* Procurement Progress Bar */}
                  <div>
                    <div className="mb-2 flex items-center justify-between text-xs font-semibold text-command-muted">
                      <span>Capacity Utilization</span>
                      <span className="font-bold text-command-fg">{selectedCentre.capacityUsedPct}%</span>
                    </div>
                    <CapacityBar pct={selectedCentre.capacityUsedPct} tone="dark" />
                    <p className="mt-2 text-xs text-command-muted">
                      {selectedCentre.procuredTodayQuintals.toLocaleString("en-IN")} quintals weighed today of {selectedCentre.dailyCapacityQuintals.toLocaleString("en-IN")} capacity limit.
                    </p>
                  </div>

                  {/* Grievances at this Centre */}
                  <div className="rounded-xl border border-command-line bg-command-panel p-4 space-y-2.5">
                    <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-saffron">
                      Centre Grievances ({grievances.filter((g) => g.centreId === selectedCentre.id && g.status !== "resolved").length} active)
                    </p>
                    {grievances.filter((g) => g.centreId === selectedCentre.id && g.status !== "resolved").length > 0 ? (
                      grievances
                        .filter((g) => g.centreId === selectedCentre.id && g.status !== "resolved")
                        .slice(0, 2)
                        .map((g) => (
                          <div key={g.id} className="rounded-lg bg-command p-2.5 text-xs">
                            <span className="font-bold text-command-fg">{g.subject}</span>
                            <p className="text-command-muted text-[11px] line-clamp-1 mt-0.5">{g.description}</p>
                          </div>
                        ))
                    ) : (
                      <p className="text-xs text-leaf font-semibold">✓ No active complaints reported at this centre.</p>
                    )}
                  </div>

                  {/* Executive Actions */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveSection("grievances");
                        setGrievanceFilter("all");
                      }}
                      className="flex-1 rounded-xl bg-command-line py-2.5 text-xs font-bold text-command-fg hover:bg-command-panel focus-ring"
                    >
                      Inspect Complaints
                    </button>
                    <button
                      type="button"
                      onClick={() => alert(`Direct broadcast sent to Superintendent at ${selectedCentre.name}`)}
                      className="flex-1 rounded-xl bg-cyan-signal text-command py-2.5 text-xs font-extrabold hover:bg-cyan-signal/90 focus-ring"
                    >
                      Dispatch Directive
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center text-command-muted space-y-3">
                  <span className="text-3xl">🛰️</span>
                  <p className="text-sm font-semibold text-command-fg">Select any procurement centre on the radar to inspect real-time metrics, capacity and grievances.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            TAB 3: GOVERNMENT GRIEVANCE & COMPLAINT REDRESSAL DESK
        ══════════════════════════════════════════════════════════════ */}
        {activeSection === "grievances" && (
          <div className="mt-6 space-y-6">
            {/* Triage & Filter Header */}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between panel-command p-5">
              <div>
                <SectionLabel tone="dark">{hi ? "केंद्रीकृत शिकायत निवारण प्रणाली" : "Centralized Grievance Redressal Mechanism"}</SectionLabel>
                <h2 className="mt-1 font-display text-xl font-extrabold text-command-fg">
                  Farmer Complaints & Field Inquiries ({filteredGrievances.length})
                </h2>
              </div>

              {/* Status Filter Tabs */}
              <div className="flex flex-wrap gap-2 text-xs font-bold">
                {(["all", "new", "pending", "escalated", "critical", "resolved"] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => {
                      if (st === "critical") {
                        setGrievancePriorityFilter("critical");
                        setGrievanceFilter("all");
                      } else {
                        setGrievancePriorityFilter("all");
                        setGrievanceFilter(st);
                      }
                    }}
                    className={cn(
                      "rounded-xl px-3.5 py-2 uppercase transition-all",
                      (st === "critical" && grievancePriorityFilter === "critical") || (st !== "critical" && grievanceFilter === st && grievancePriorityFilter === "all")
                        ? "bg-cyan-signal text-command font-extrabold"
                        : "bg-command-panel text-command-muted hover:text-command-fg"
                    )}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Grievances List */}
            <div className="grid gap-4">
              {filteredGrievances.length > 0 ? (
                filteredGrievances.map((g) => {
                  const pStyle = priorityStyles[g.priority] || priorityStyles.medium;
                  const sStyle = statusStyles[g.status] || statusStyles.new;

                  return (
                    <article
                      key={g.id}
                      className={cn(
                        "panel-command p-5 space-y-4 border-l-4 transition-all hover:bg-command-panel/40",
                        g.priority === "critical" ? "border-l-danger" : g.priority === "high" ? "border-l-saffron" : "border-l-cyan-signal"
                      )}
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-lg">{grievanceCategoryIcons[g.category] || "📋"}</span>
                            <h3 className="font-display text-base font-extrabold text-command-fg">{g.subject}</h3>
                            <span className={cn("rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase", pStyle.badge)}>
                              {pStyle.label}
                            </span>
                            <Pill tone={sStyle.tone}>{sStyle.label}</Pill>
                          </div>
                          <p className="mt-1 text-xs text-command-muted">
                            Filed by <strong>{g.farmerName}</strong> ({g.farmerPhone || "Registered Contact"}) · Centre: <strong>{g.centreName || "District Centre"}</strong> · Region: {g.district}
                          </p>
                        </div>
                        <span className="font-mono text-xs text-command-muted">
                          {new Date(g.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>

                      <p className="rounded-xl bg-command-panel/80 p-3 text-xs text-command-fg leading-relaxed">
                        {g.description}
                      </p>

                      {g.resolutionNotes && (
                        <div className="rounded-xl border border-leaf/40 bg-leaf/10 p-3 text-xs text-leaf">
                          <strong>Official Resolution Findings:</strong> {g.resolutionNotes}
                          {g.resolvedAt && <span className="block text-[10px] text-leaf/70 mt-1">Resolved on {new Date(g.resolvedAt).toLocaleString("en-IN")}</span>}
                        </div>
                      )}

                      {/* Official Action Controls */}
                      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-command-line pt-3">
                        <div className="text-xs text-command-muted">
                          Assigned Officer: <strong className="text-command-fg">{g.assignedToName || "Unassigned (Desk Pool)"}</strong>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {g.status !== "resolved" ? (
                            <>
                              <button
                                type="button"
                                onClick={() => setSelectedGrievance(g)}
                                className="rounded-xl border border-command-line bg-command-panel px-3 py-1.5 text-xs font-bold text-command-fg hover:bg-command-line focus-ring"
                              >
                                👤 Reassign Officer
                              </button>
                              <button
                                type="button"
                                onClick={() => handleEscalateGrievance(g.id)}
                                className="rounded-xl bg-danger/20 border border-danger/40 px-3 py-1.5 text-xs font-bold text-danger hover:bg-danger/30 focus-ring"
                              >
                                ⚠️ Escalate to State Board
                              </button>
                              <button
                                type="button"
                                onClick={() => setSelectedGrievance(g)}
                                className="rounded-xl bg-gradient-leaf px-3.5 py-1.5 text-xs font-bold text-primary-foreground hover:scale-105 transition-transform focus-ring"
                              >
                                ✓ Resolve with Order
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleReopenGrievance(g.id)}
                              className="rounded-xl border border-command-line bg-command-panel px-3 py-1.5 text-xs font-bold text-saffron hover:bg-command-line focus-ring"
                            >
                              ↺ Reopen Appeal
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })
              ) : (
                <div className="panel-command p-12 text-center text-xs font-semibold text-command-muted">
                  No grievances found matching this category. All systems operating within SLA.
                </div>
              )}
            </div>

            {/* Grievance Action Modal */}
            {selectedGrievance && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
                <div className="panel-command w-full max-w-xl p-6 space-y-4 border border-command-line shadow-2xl">
                  <div className="flex items-start justify-between border-b border-command-line pb-3">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-cyan-signal">Official Grievance Action</p>
                      <h3 className="text-lg font-extrabold text-command-fg">{selectedGrievance.subject}</h3>
                    </div>
                    <button type="button" onClick={() => setSelectedGrievance(null)} className="text-command-muted hover:text-command-fg">
                      ✕
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-[0.1em] text-command-muted">
                        Assign Official Authority
                      </label>
                      <select
                        value={assigneeInput}
                        onChange={(e) => setAssigneeInput(e.target.value)}
                        className="mt-1.5 h-11 w-full rounded-xl border border-command-line bg-command px-3 text-xs font-semibold text-command-fg focus-ring"
                      >
                        <option value="District Food & Supplies Controller">District Food & Supplies Controller (DFSC)</option>
                        <option value="Centre Superintendent / Weighbridge In-Charge">Centre Superintendent / Weighbridge In-Charge</option>
                        <option value="Assistant Food Supply Officer">Assistant Food Supply Officer (AFSO)</option>
                        <option value="District Vigilance & Redressal Cell">District Vigilance & Redressal Cell</option>
                        <option value="State Directorate Technical Team">State Directorate Technical Team</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => handleAssignGrievance(selectedGrievance.id)}
                        className="mt-2 w-full rounded-xl bg-command-line py-2 text-xs font-bold text-command-fg hover:bg-command-panel focus-ring"
                      >
                        Save Assignment
                      </button>
                    </div>

                    <div className="border-t border-command-line pt-3">
                      <label className="block text-xs font-bold uppercase tracking-[0.1em] text-leaf">
                        Or Resolve Case with Official Action Taken
                      </label>
                      <textarea
                        rows={3}
                        value={resolutionInput}
                        onChange={(e) => setResolutionInput(e.target.value)}
                        placeholder="Enter formal findings, lab test verification, weighbridge recalibration record or DBT credit reference..."
                        className="mt-1.5 w-full rounded-xl border border-command-line bg-command p-3 text-xs font-semibold text-command-fg focus-ring"
                      />
                      <button
                        type="button"
                        onClick={() => handleResolveGrievance(selectedGrievance.id)}
                        className="mt-2 w-full rounded-xl bg-gradient-leaf py-3 text-xs font-bold text-primary-foreground hover:scale-[1.01] transition-transform focus-ring"
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
            TAB 4: AI & POLICY INTELLIGENCE DESK
        ══════════════════════════════════════════════════════════════ */}
        {activeSection === "intelligence" && (
          <div className="mt-6 space-y-6">
            <div className="panel-command p-5">
              <SectionLabel tone="dark">{hi ? "पूर्वानुमान एवं नीतिगत बुद्धिमत्ता" : "State AI & Policy Intelligence Sentinel"}</SectionLabel>
              <h2 className="mt-1 font-display text-xl font-extrabold text-command-fg">
                Predictive Congestion Models & Operational Directives
              </h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="panel-command p-5 space-y-3 border-l-4 border-l-danger">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-danger">Anomaly Detected</span>
                  <span className="text-xs font-mono text-command-muted">Live Analysis</span>
                </div>
                <h3 className="font-display text-base font-extrabold text-command-fg">
                  3 Procurement Centres Projected to Breach 85% Safe Band
                </h3>
                <p className="text-xs text-command-muted leading-relaxed">
                  Morning tractor arrival velocity indicates that Centre A and Centre B will reach maximum yard capacity by 12:45 PM unless 20% of afternoon slot appointments are re-routed.
                </p>
                <div className="rounded-xl bg-command-panel p-3 text-xs text-cyan-signal font-semibold">
                  Recommended Action: Enable dynamic slot rebalancing and notify 24 farmers via automated SMS/voice prompt.
                </div>
              </div>

              <div className="panel-command p-5 space-y-3 border-l-4 border-l-saffron">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-saffron">Throughput Intelligence</span>
                  <span className="text-xs font-mono text-command-muted">Weighbridge SLA</span>
                </div>
                <h3 className="font-display text-base font-extrabold text-command-fg">
                  Average Processing Delay Elevated by 18% in Western Belt
                </h3>
                <p className="text-xs text-command-muted leading-relaxed">
                  Electronic weighbridge cycle times increased from 7.2 minutes to 9.8 minutes per truck due to moisture inspection contention at Counter #3.
                </p>
                <div className="rounded-xl bg-command-panel p-3 text-xs text-leaf font-semibold">
                  Recommended Action: Direct District Admin to activate secondary portable moisture testing kit.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            TAB 5: DISTRICT PERFORMANCE SCORECARDS
        ══════════════════════════════════════════════════════════════ */}
        {activeSection === "districts" && (
          <div className="mt-6 space-y-6">
            <div className="panel-command p-5">
              <SectionLabel tone="dark">{hi ? "जिलावार प्रदर्शन रिपोर्ट" : "Inter-District Procurement Performance Scorecards"}</SectionLabel>
              <h2 className="mt-1 font-display text-xl font-extrabold text-command-fg">
                Operational Efficiency & Compliance Rankings
              </h2>
            </div>

            <div className="overflow-hidden rounded-2xl border border-command-line bg-command-panel">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-command-fg">
                  <thead className="border-b border-command-line bg-command uppercase font-bold text-command-muted">
                    <tr>
                      <th className="px-4 py-3.5">District / Division</th>
                      <th className="px-4 py-3.5">Centres</th>
                      <th className="px-4 py-3.5">Farmers Served</th>
                      <th className="px-4 py-3.5">Procured (qtl)</th>
                      <th className="px-4 py-3.5">Avg Wait Time</th>
                      <th className="px-4 py-3.5">Grievances</th>
                      <th className="px-4 py-3.5 text-right">Health Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-command-line font-medium">
                    {districtScorecards.map((row, idx) => (
                      <tr key={idx} className="hover:bg-command/40 transition-colors">
                        <td className="px-4 py-4 font-bold text-command-fg text-sm">{row.district}</td>
                        <td className="px-4 py-4">{row.centresCount || centres.length} Active</td>
                        <td className="px-4 py-4">{row.farmersServed} Registered</td>
                        <td className="px-4 py-4 font-bold text-leaf">{row.procuredQtl.toLocaleString("en-IN")} qtl</td>
                        <td className="px-4 py-4">
                          <span className={cn("font-bold", stateAverageWaitMin > 60 ? "text-danger" : "text-cyan-signal")}>
                            {stateAverageWaitMin} min
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className={row.openComplaints > 0 ? "text-saffron font-bold" : "text-leaf font-bold"}>
                            {row.openComplaints} Open / {row.resolvedComplaints} Resolved
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <Pill tone={criticalCentresCount > 0 ? "danger" : "leaf"}>
                            {criticalCentresCount > 0 ? "Strained" : "Optimal Band"}
                          </Pill>
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
            TAB 6: DBT PAYMENT MONITORING
        ══════════════════════════════════════════════════════════════ */}
        {activeSection === "payments" && (
          <div className="mt-6 space-y-6">
            <div className="panel-command p-5">
              <SectionLabel tone="dark">{hi ? "डीबीटी वित्तीय भुगतान ऑडिट" : "Direct Benefit Transfer (DBT) Payout Audit"}</SectionLabel>
              <h2 className="mt-1 font-display text-xl font-extrabold text-command-fg">
                Central Bank Payout Pipeline & 48h SLA Tracking
              </h2>
            </div>

            <div className="overflow-hidden rounded-2xl border border-command-line bg-command-panel">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-command-fg">
                  <thead className="border-b border-command-line bg-command uppercase font-bold text-command-muted">
                    <tr>
                      <th className="px-4 py-3.5">Farmer & Account</th>
                      <th className="px-4 py-3.5">Quantity / Rate</th>
                      <th className="px-4 py-3.5">Total Amount (₹)</th>
                      <th className="px-4 py-3.5">DBT Stage</th>
                      <th className="px-4 py-3.5">SLA Timeframe</th>
                      <th className="px-4 py-3.5 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-command-line font-medium">
                    {paymentsList.map((p) => (
                      <tr key={p.id} className="hover:bg-command/40 transition-colors">
                        <td className="px-4 py-3.5">
                          <div className="font-bold text-command-fg">{p.bank_masked || "PNB ••••4417"}</div>
                          <div className="text-[10px] text-command-muted">Ticket #{p.ticket_id ? p.ticket_id.slice(0, 8) : "DIRECT"}</div>
                        </td>
                        <td className="px-4 py-3.5">{p.quintals} qtl @ ₹{p.rate_per_quintal}/qtl</td>
                        <td className="px-4 py-3.5 font-bold text-leaf text-sm">₹{Number(p.gross_amount).toLocaleString("en-IN")}</td>
                        <td className="px-4 py-3.5 capitalize text-cyan-signal font-semibold">{p.stage.replace("_", " ")}</td>
                        <td className="px-4 py-3.5 text-command-muted">{p.expected_credit_in || "Within 48 hours"}</td>
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
            TAB 7: CENTRAL ALERT & ESCALATION INBOX
        ══════════════════════════════════════════════════════════════ */}
        {activeSection === "alerts" && (
          <div className="mt-6 space-y-4">
            <div className="panel-command p-5">
              <SectionLabel tone="dark">{hi ? "अलर्ट एवं आपातकालीन चेतावनी" : "State Alert & Escalation Inbox"}</SectionLabel>
              <h2 className="mt-1 font-display text-xl font-extrabold text-command-fg">
                Active Critical & Operational Notifications
              </h2>
            </div>

            <div className="grid gap-3">
              {liveAlerts.map((alt) => (
                <div
                  key={alt.id}
                  className={cn(
                    "panel-command p-4 flex items-start justify-between gap-4 border-l-4",
                    alt.severity === "critical" ? "border-l-danger" : alt.severity === "warning" ? "border-l-saffron" : "border-l-cyan-signal"
                  )}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-command-fg">{alt.title}</span>
                      <Pill tone={alt.severity === "critical" ? "danger" : alt.severity === "warning" ? "saffron" : "navy"}>
                        {alt.severity.toUpperCase()}
                      </Pill>
                    </div>
                    <p className="mt-1 text-xs text-command-muted">{alt.detail}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSuccessBanner(`Alert acknowledged by Directorate.`)}
                    className="rounded-xl border border-command-line bg-command-panel px-3 py-1.5 text-xs font-bold text-command-fg hover:bg-command-line"
                  >
                    Acknowledge
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            TAB 8: GOVERNANCE & IMMUTABLE AUDIT TRAIL
        ══════════════════════════════════════════════════════════════ */}
        {activeSection === "governance" && (
          <div className="mt-6 space-y-4">
            <div className="panel-command p-5">
              <SectionLabel tone="dark">{hi ? "गवर्नेंस एवं ऑडिट लॉग" : "Governance Audit Trail & Action History"}</SectionLabel>
              <h2 className="mt-1 font-display text-xl font-extrabold text-command-fg">
                Immutable System Activity Logs
              </h2>
            </div>

            <div className="overflow-hidden rounded-2xl border border-command-line bg-command-panel">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-command-fg">
                  <thead className="border-b border-command-line bg-command uppercase font-bold text-command-muted">
                    <tr>
                      <th className="px-4 py-3.5">Action</th>
                      <th className="px-4 py-3.5">Actor Role</th>
                      <th className="px-4 py-3.5">Target</th>
                      <th className="px-4 py-3.5">Metadata</th>
                      <th className="px-4 py-3.5 text-right">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-command-line font-medium font-mono text-[11px]">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-command/40 transition-colors">
                        <td className="px-4 py-3 font-bold text-cyan-signal">{log.action}</td>
                        <td className="px-4 py-3 uppercase text-command-muted">{log.actorRole || "SYSTEM"}</td>
                        <td className="px-4 py-3">{log.targetType ? `${log.targetType} (${log.targetId?.slice(0, 8) || "—"})` : "—"}</td>
                        <td className="px-4 py-3 text-command-muted max-w-xs truncate">{JSON.stringify(log.metadata)}</td>
                        <td className="px-4 py-3 text-right text-command-muted">
                          {new Date(log.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
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
            TAB 9: ADMINISTRATION (USERS & CENTRES)
        ══════════════════════════════════════════════════════════════ */}
        {activeSection === "administration" && (
          <div className="mt-6 space-y-6">
            <div className="panel-command p-5">
              <SectionLabel tone="dark">{hi ? "प्रशासनिक प्रबंधन" : "Secondary System Administration"}</SectionLabel>
              <h2 className="mt-1 font-display text-xl font-extrabold text-command-fg">
                User Roles & Procurement Centres Configuration
              </h2>
            </div>

            {/* Users Table */}
            <div className="overflow-hidden rounded-2xl border border-command-line bg-command-panel">
              <div className="p-4 border-b border-command-line flex items-center justify-between">
                <h3 className="font-display text-sm font-bold text-command-fg">System Users ({users.length})</h3>
                <span className="text-xs text-command-muted">Click 'Change Role' to reassign</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-command-fg">
                  <thead className="border-b border-command-line bg-command uppercase font-bold text-command-muted">
                    <tr>
                      <th className="px-4 py-3">User & Email</th>
                      <th className="px-4 py-3">Current Role</th>
                      <th className="px-4 py-3">District</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-command-line font-medium">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-command/40 transition-colors">
                        <td className="px-4 py-3.5">
                          <div className="font-bold text-command-fg text-sm">{u.fullName}</div>
                          <div className="text-[10px] text-command-muted">{u.email}</div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={cn(
                              "rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase",
                              u.role === "super_admin"
                                ? "bg-danger/20 text-danger"
                                : u.role === "district_admin"
                                ? "bg-saffron/20 text-saffron"
                                : u.role === "centre_operator"
                                ? "bg-cyan-signal/20 text-cyan-signal"
                                : "bg-leaf/20 text-leaf"
                            )}
                          >
                            {u.role.replace("_", " ")}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">{u.district || "—"}</td>
                        <td className="px-4 py-3.5 text-right">
                          <button
                            type="button"
                            onClick={() => toggleUserRole(u.id, u.role)}
                            className="rounded-lg bg-command-line px-2.5 py-1 text-xs font-bold text-cyan-signal hover:bg-command"
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
