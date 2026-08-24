import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { PageShell } from "@/components/kisan/app-shell";
import { AuthGuard } from "@/components/kisan/auth-guard";
import { useAuth } from "@/hooks/use-auth";
import { ForecastChart, RadialGauge } from "@/components/kisan/charts";
import {
  CapacityBar,
  HealthDot,
  Pill,
  SectionLabel,
  StatCard,
} from "@/components/kisan/primitives";
import { centreHealth, useKisan } from "@/lib/kisan/store";
import type { CentreAlert, ProcurementCentre, QueueRow } from "@/lib/kisan/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/centre")({
  head: () => ({
    meta: [
      { title: "Procurement Centre Operator Workstation | KISAN SETU" },
      {
        name: "description",
        content:
          "Official Mandi Operator workstation for live queue management, electronic weighbridge recording, FAQ quality grading, and digital J-Form MSP issuance.",
      },
    ],
  }),
  component: CentrePageGuarded,
});

function CentrePageGuarded() {
  return (
    <AuthGuard allowedRoles={["centre_operator", "district_admin", "super_admin"]}>
      <CentrePage />
    </AuthGuard>
  );
}

type CentreTab = "queue" | "weighing" | "quality" | "completed" | "analytics";

const statusConfig: Record<QueueRow["status"], { label: string; labelHi: string; tone: "leaf" | "saffron" | "navy" | "muted" | "danger" }> = {
  waiting: { label: "In Queue", labelHi: "कतार में", tone: "saffron" },
  arrived: { label: "At Gate", labelHi: "गेट पर उपस्थित", tone: "navy" },
  weighing: { label: "Weighing", labelHi: "तुलाई जारी", tone: "leaf" },
  grading: { label: "Quality Lab", labelHi: "गुणवत्ता जांच", tone: "navy" },
  accepted: { label: "Accepted", labelHi: "स्वीकृत", tone: "leaf" },
  rejected: { label: "Rejected", labelHi: "अस्वीकृत", tone: "danger" },
  payment: { label: "Payment Queued", labelHi: "भुगतान जारी", tone: "leaf" },
  done: { label: "Completed", labelHi: "पूर्ण", tone: "muted" },
};

function CentrePage() {
  const { user } = useAuth();
  const {
    language,
    centres,
    queueRows,
    alerts,
    forecast,
    operatorProcessTicket,
    operatorUpdateCounters,
    refreshFromDatabase,
  } = useKisan();
  const hi = language === "hi";

  const [activeTab, setActiveTab] = useState<CentreTab>("queue");
  const [selectedCentreId, setSelectedCentreId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Operational Modal State
  const [selectedTicket, setSelectedTicket] = useState<QueueRow | null>(null);
  const [modalStage, setModalStage] = useState<"call" | "weigh" | "grade" | "complete">("call");
  const [counterInput, setCounterInput] = useState<number>(1);
  const [grossInput, setGrossInput] = useState<string>("");
  const [tareInput, setTareInput] = useState<string>("");
  const [qualityGradeInput, setQualityGradeInput] = useState<string>("FAQ");
  const [moistureInput, setMoistureInput] = useState<string>("11.4");
  const [foreignMatterInput, setForeignMatterInput] = useState<string>("0.4");
  const [operatorNotesInput, setOperatorNotesInput] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Active centre: User assigned centre, or selected centre, or first centre
  const activeCentre: ProcurementCentre = useMemo(() => {
    if (selectedCentreId) {
      const found = centres.find((c) => c.id === selectedCentreId);
      if (found) return found;
    }
    if (user?.centreId) {
      const assigned = centres.find((c) => c.id === user.centreId);
      if (assigned) return assigned;
    }
    return (
      centres[0] || {
        id: "centre-a",
        code: "A",
        name: "Mandi Centre A — Karnal City",
        nameHi: "मंडी केंद्र A — करनाल शहर",
        distanceKm: 7,
        queueLength: 1,
        predictedWaitMin: 10,
        capacityUsedPct: 34,
        dailyCapacityQuintals: 5000,
        procuredTodayQuintals: 1700,
        activeCounters: 4,
        totalCounters: 6,
        processingRatePerHour: 18,
        farmersToday: 142,
        map: { x: 42, y: 55 },
        recommended: true,
      }
    );
  }, [centres, selectedCentreId, user?.centreId]);

  // Filter queue rows for active centre
  const centreTickets = useMemo(() => {
    return queueRows.filter((row) => {
      // Filter by search
      const matchesSearch =
        row.token.toLowerCase().includes(searchQuery.toLowerCase()) ||
        row.farmerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        row.village.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (row.jFormNo && row.jFormNo.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      // Filter by status
      if (statusFilter === "waiting") return row.status === "waiting" || row.status === "arrived";
      if (statusFilter === "processing") return row.status === "weighing" || row.status === "grading";
      if (statusFilter === "completed") return row.status === "done" || row.status === "accepted";
      if (statusFilter === "rejected") return row.status === "rejected";

      return true;
    });
  }, [queueRows, searchQuery, statusFilter]);

  // Active queue vs completed
  const activeInQueue = useMemo(
    () => queueRows.filter((r) => r.status !== "done" && r.status !== "rejected"),
    [queueRows]
  );
  const completedToday = useMemo(
    () => queueRows.filter((r) => r.status === "done" || r.status === "accepted"),
    [queueRows]
  );

  // Counter management
  const handleCounterChange = async (delta: number) => {
    const next = Math.max(1, Math.min(activeCentre.totalCounters, activeCentre.activeCounters + delta));
    if (next !== activeCentre.activeCounters) {
      await operatorUpdateCounters(activeCentre.id, next);
      setSuccessBanner(hi ? `काउंटर अपडेट: ${next}/${activeCentre.totalCounters} सक्रिय` : `Counters updated: ${next}/${activeCentre.totalCounters} operational`);
      setTimeout(() => setSuccessBanner(null), 3500);
    }
  };

  // Open ticket workflow modal
  const openTicketModal = (ticket: QueueRow, defaultStage?: "call" | "weigh" | "grade" | "complete") => {
    setSelectedTicket(ticket);
    setCounterInput(ticket.counterAssigned || 1);
    setGrossInput(ticket.grossWeightQuintals ? ticket.grossWeightQuintals.toString() : (ticket.quantityQuintals + 25).toString());
    setTareInput(ticket.tareWeightQuintals ? ticket.tareWeightQuintals.toString() : "25");
    setQualityGradeInput(ticket.qualityGrade || "FAQ");
    setMoistureInput(ticket.moisturePct ? ticket.moisturePct.toString() : "11.4");
    setForeignMatterInput(ticket.foreignMatterPct ? ticket.foreignMatterPct.toString() : "0.4");
    setOperatorNotesInput(ticket.operatorNotes || "");

    if (defaultStage) {
      setModalStage(defaultStage);
    } else if (ticket.status === "waiting") {
      setModalStage("call");
    } else if (ticket.status === "arrived" || ticket.status === "weighing") {
      setModalStage("weigh");
    } else if (ticket.status === "grading") {
      setModalStage("grade");
    } else {
      setModalStage("complete");
    }
  };

  // Process Stage Actions
  const handleExecuteAction = async (action: "call" | "weigh" | "grade" | "accept" | "reject" | "complete") => {
    if (!selectedTicket?.id) {
      alert("Ticket ID not found for database processing");
      return;
    }

    setIsSubmitting(true);
    try {
      const grossNum = Number(grossInput) || 0;
      const tareNum = Number(tareInput) || 0;
      const netQuintals = grossNum > tareNum ? grossNum - tareNum : selectedTicket.quantityQuintals;

      const res = await operatorProcessTicket({
        ticketId: selectedTicket.id,
        action,
        counter: counterInput,
        gross: grossNum,
        tare: tareNum,
        actualQuintals: netQuintals,
        qualityGrade: qualityGradeInput,
        moisture: Number(moistureInput) || 11.4,
        foreignMatter: Number(foreignMatterInput) || 0.4,
        notes: operatorNotesInput,
      });

      if (action === "call") {
        setSuccessBanner(hi ? `📢 टोकन ${selectedTicket.token} को काउंटर #${counterInput} पर बुलाया गया` : `📢 Token ${selectedTicket.token} called to Counter #${counterInput}`);
        setModalStage("weigh");
      } else if (action === "weigh") {
        setSuccessBanner(hi ? `⚖️ धर्मकांटा तुलाई दर्ज: ${netQuintals} क्विंटल शुद्ध` : `⚖️ Weighment saved: ${netQuintals} qtl net recorded`);
        setModalStage("grade");
      } else if (action === "grade") {
        setSuccessBanner(hi ? `🔬 गुणवत्ता परीक्षण सफल: ग्रेड ${qualityGradeInput}` : `🔬 Quality inspected: Grade ${qualityGradeInput}`);
        setModalStage("complete");
      } else if (action === "complete" || action === "accept") {
        setSuccessBanner(hi ? `🎉 खरीद पूर्ण! जे-फॉर्म: ${res.j_form_no} | भुगतान ₹${res.gross_amount.toLocaleString("en-IN")} कतारबद्ध` : `🎉 Completed! J-Form: ${res.j_form_no} | Payment ₹${res.gross_amount.toLocaleString("en-IN")} queued`);
        setSelectedTicket(null);
      } else if (action === "reject") {
        setSuccessBanner(hi ? `⚠️ टोकन ${selectedTicket.token} अस्वीकृत किया गया` : `⚠️ Token ${selectedTicket.token} rejected`);
        setSelectedTicket(null);
      }

      await refreshFromDatabase();
    } catch (err: any) {
      alert(err.message || "Failed to process ticket");
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setSuccessBanner(null), 5000);
    }
  };

  // Export Daily Register to CSV
  const handleExportCSV = () => {
    const headers = ["Token", "J-Form No", "Farmer Name", "Village", "Crop", "Quantity (Qtl)", "Actual Weighed (Qtl)", "Quality Grade", "Status", "Slot Window"];
    const rows = completedToday.map((r) => [
      r.token,
      r.jFormNo || "—",
      `"${r.farmerName}"`,
      `"${r.village}"`,
      r.crop,
      r.quantityQuintals,
      r.actualQuintals || r.quantityQuintals,
      r.qualityGrade || "FAQ",
      r.status,
      `"${r.slotWindow}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `KisanSetu_Mandi_${activeCentre.code}_Daily_Register.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <PageShell>
      {/* ── Success Toast Banner ── */}
      {successBanner && (
        <div className="mb-5 animate-rise rounded-2xl bg-gradient-leaf p-4 text-primary-foreground shadow-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">✓</span>
            <p className="font-display font-bold text-sm sm:text-base">{successBanner}</p>
          </div>
          <button
            type="button"
            onClick={() => setSuccessBanner(null)}
            className="rounded-lg bg-primary-foreground/20 px-2 py-1 text-xs font-bold hover:bg-primary-foreground/30"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Header & Centre Profile ── */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-leaf-soft px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.14em] text-leaf">
              <span className="size-2 rounded-full bg-leaf animate-blip" />
              {hi ? "अधिकृत खरीद केंद्र वर्कस्टेशन" : "Official Mandi Workstation"}
            </span>
            <Pill tone="navy">
              {hi ? `ऑपरेटर: ${user?.fullName || "स्टाफ़"}` : `In-Charge: ${user?.fullName || "Staff"}`}
            </Pill>
          </div>
          <h1 className="mt-2 font-display text-3xl font-extrabold text-navy sm:text-4xl">
            {hi ? activeCentre.nameHi : activeCentre.name}
          </h1>
          <p className="mt-1 text-xs font-semibold text-muted-foreground">
            {hi
              ? `दैनिक खरीद लक्ष्य: ${activeCentre.dailyCapacityQuintals.toLocaleString("en-IN")} क्विंटल | जिला: करनाल, हरियाणा`
              : `Daily Procurement Target: ${activeCentre.dailyCapacityQuintals.toLocaleString("en-IN")} quintals | District: Karnal, Haryana`}
          </p>
        </div>

        {/* Counter & Mandi Selector Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {centres.length > 1 && (
            <select
              value={activeCentre.id}
              onChange={(e) => setSelectedCentreId(e.target.value)}
              aria-label={hi ? "खरीद केंद्र चुनें" : "Select Procurement Centre"}
              className="rounded-xl border-2 border-border bg-card px-3 py-2 text-xs font-bold text-navy focus-ring shadow-xs"
            >
              {centres.map((c) => (
                <option key={c.id} value={c.id}>
                  {hi ? c.nameHi : c.name} ({c.code})
                </option>
              ))}
            </select>
          )}

          {/* Active Counters Controller */}
          <div className="flex items-center gap-2 rounded-xl border-2 border-leaf/40 bg-leaf-soft px-3 py-1.5">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-leaf">
                {hi ? "सक्रिय काउंटर" : "Counters Active"}
              </p>
              <p className="font-display text-sm font-extrabold text-navy">
                {activeCentre.activeCounters} / {activeCentre.totalCounters}
              </p>
            </div>
            <div className="flex flex-col gap-0.5">
              <button
                type="button"
                onClick={() => handleCounterChange(1)}
                disabled={activeCentre.activeCounters >= activeCentre.totalCounters}
                className="rounded bg-navy px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground hover:bg-leaf disabled:opacity-30"
                title={hi ? "काउंटर खोलें" : "Open Counter"}
              >
                +
              </button>
              <button
                type="button"
                onClick={() => handleCounterChange(-1)}
                disabled={activeCentre.activeCounters <= 1}
                className="rounded bg-navy px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground hover:bg-danger disabled:opacity-30"
                title={hi ? "काउंटर बंद करें" : "Close Counter"}
              >
                -
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-bold text-navy hover:bg-muted shadow-xs focus-ring"
          >
            📥 {hi ? "रजिस्टर CSV" : "Export APMC"}
          </button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label={hi ? "आज के कुल किसान" : "Farmers Served"}
          value={activeCentre.farmersToday}
          accent="navy"
        />
        <StatCard
          label={hi ? "सक्रिय कतार" : "Live Queue"}
          value={activeCentre.queueLength}
          unit={hi ? "किसान" : "waiting"}
          accent={activeCentre.queueLength > 20 ? "danger" : "saffron"}
        />
        <StatCard
          label={hi ? "आज की तुलाई" : "Procured Today"}
          value={Number(activeCentre.procuredTodayQuintals).toLocaleString("en-IN")}
          unit="qtl"
          accent="leaf"
        />
        <StatCard
          label={hi ? "यार्ड क्षमता उपयोग" : "Capacity Used"}
          value={activeCentre.capacityUsedPct}
          unit="%"
          accent={activeCentre.capacityUsedPct >= 85 ? "danger" : activeCentre.capacityUsedPct >= 65 ? "saffron" : "leaf"}
        />
        <StatCard
          label={hi ? "औसत प्रतीक्षा" : "Avg Wait"}
          value={activeCentre.predictedWaitMin}
          unit="min"
          accent={activeCentre.predictedWaitMin > 60 ? "danger" : "leaf"}
        />
        <StatCard
          label={hi ? "प्रोसेसिंग गति" : "Processing Rate"}
          value={activeCentre.processingRatePerHour}
          unit="/hr"
          accent="navy"
        />
      </section>

      {/* ── Navigation Tabs ── */}
      <div className="mt-8 flex flex-wrap gap-2 border-b border-border pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("queue")}
          className={cn(
            "rounded-xl px-4 py-2.5 text-xs font-extrabold transition-all focus-ring",
            activeTab === "queue"
              ? "bg-navy text-primary-foreground shadow-md"
              : "bg-muted/60 text-navy hover:bg-muted"
          )}
        >
          📋 {hi ? "लाइव कतार एवं टोकन" : "Live Queue & Tokens"} ({activeInQueue.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("weighing")}
          className={cn(
            "rounded-xl px-4 py-2.5 text-xs font-extrabold transition-all focus-ring",
            activeTab === "weighing"
              ? "bg-navy text-primary-foreground shadow-md"
              : "bg-muted/60 text-navy hover:bg-muted"
          )}
        >
          ⚖️ {hi ? "धर्मकांटा तुलाई स्टेशन" : "Weighbridge Station"}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("quality")}
          className={cn(
            "rounded-xl px-4 py-2.5 text-xs font-extrabold transition-all focus-ring",
            activeTab === "quality"
              ? "bg-navy text-primary-foreground shadow-md"
              : "bg-muted/60 text-navy hover:bg-muted"
          )}
        >
          🔬 {hi ? "गुणवत्ता एवं एफएक्यू लैब" : "FAQ Quality Lab"}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("completed")}
          className={cn(
            "rounded-xl px-4 py-2.5 text-xs font-extrabold transition-all focus-ring",
            activeTab === "completed"
              ? "bg-navy text-primary-foreground shadow-md"
              : "bg-muted/60 text-navy hover:bg-muted"
          )}
        >
          📜 {hi ? "जे-फॉर्म एवं पूर्ण खरीद" : "J-Form Register"} ({completedToday.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("analytics")}
          className={cn(
            "rounded-xl px-4 py-2.5 text-xs font-extrabold transition-all focus-ring",
            activeTab === "analytics"
              ? "bg-navy text-primary-foreground shadow-md"
              : "bg-muted/60 text-navy hover:bg-muted"
          )}
        >
          📈 {hi ? "पूर्वानुमान एवं अलर्ट" : "AI Forecast & Alerts"}
        </button>
      </div>

      {/* ── TAB 1 & 2 & 3: QUEUE & WORKSTATION ── */}
      {(activeTab === "queue" || activeTab === "weighing" || activeTab === "quality") && (
        <section className="mt-6 space-y-6">
          {/* Quick Filter Bar */}
          <div className="surface p-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <div className="flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={hi ? "टोकन, किसान नाम, गाँव या जे-फॉर्म से खोजें..." : "Search by token, farmer name, village..."}
                className="w-full rounded-xl border border-border bg-card px-4 py-2 text-xs font-semibold text-navy placeholder:text-muted-foreground focus-ring"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[
                { key: "all", labelEn: "All", labelHi: "सभी" },
                { key: "waiting", labelEn: "In Queue", labelHi: "कतार में" },
                { key: "processing", labelEn: "In Process", labelHi: "प्रक्रिया जारी" },
                { key: "completed", labelEn: "Done", labelHi: "पूर्ण" },
              ].map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setStatusFilter(f.key)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-bold transition-colors focus-ring",
                    statusFilter === f.key
                      ? "bg-leaf text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-navy"
                  )}
                >
                  {hi ? f.labelHi : f.labelEn}
                </button>
              ))}
            </div>
          </div>

          {/* Queue Table */}
          <div className="surface overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/60 text-left text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                    <th className="px-4 py-3.5">{hi ? "टोकन" : "Token"}</th>
                    <th className="px-4 py-3.5">{hi ? "किसान विवरण" : "Farmer Details"}</th>
                    <th className="px-4 py-3.5">{hi ? "फसल" : "Crop"}</th>
                    <th className="px-4 py-3.5">{hi ? "मात्रा (क्विंटल)" : "Quantity (Qtl)"}</th>
                    <th className="px-4 py-3.5">{hi ? "स्लॉट" : "Slot Window"}</th>
                    <th className="px-4 py-3.5">{hi ? "काउंटर" : "Counter"}</th>
                    <th className="px-4 py-3.5">{hi ? "स्थिति" : "Stage Status"}</th>
                    <th className="px-4 py-3.5 text-right">{hi ? "कार्रवाई" : "Action"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {centreTickets.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-xs font-semibold text-muted-foreground">
                        {hi ? "इस श्रेणी में कोई किसान टिकट नहीं मिला।" : "No queue tickets found in this view."}
                      </td>
                    </tr>
                  ) : (
                    centreTickets.map((row) => {
                      const cfg = statusConfig[row.status] || { label: row.status, labelHi: row.status, tone: "muted" };
                      return (
                        <tr key={row.token} className="hover:bg-muted/30 transition-colors">
                          <td className="whitespace-nowrap px-4 py-3.5 font-display font-extrabold text-navy text-sm">
                            {row.token}
                          </td>
                          <td className="px-4 py-3.5">
                            <p className="font-bold text-navy">{row.farmerName}</p>
                            <p className="text-xs text-muted-foreground">{row.village || "Karnal"}</p>
                          </td>
                          <td className="px-4 py-3.5 font-semibold text-navy">
                            {row.crop}
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="font-bold tabular-nums text-navy">
                              {row.actualQuintals ? `${row.actualQuintals} qtl net` : `${row.quantityQuintals} qtl est`}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-xs tabular-nums text-muted-foreground whitespace-nowrap">
                            {row.slotWindow}
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="inline-flex items-center justify-center size-6 rounded-full bg-muted font-bold text-xs text-navy">
                              #{row.counterAssigned || "—"}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <Pill tone={cfg.tone}>{hi ? cfg.labelHi : cfg.label}</Pill>
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            {row.status === "waiting" && (
                              <button
                                type="button"
                                onClick={() => openTicketModal(row, "call")}
                                className="rounded-xl bg-gradient-leaf px-3 py-1.5 text-xs font-bold text-primary-foreground hover:scale-105 transition-transform focus-ring"
                              >
                                📢 {hi ? "बुलाएँ" : "Call Farmer"}
                              </button>
                            )}
                            {row.status === "arrived" && (
                              <button
                                type="button"
                                onClick={() => openTicketModal(row, "weigh")}
                                className="rounded-xl bg-gradient-saffron px-3 py-1.5 text-xs font-bold text-primary-foreground hover:scale-105 transition-transform focus-ring"
                              >
                                ⚖️ {hi ? "तुलाई करें" : "Start Weighing"}
                              </button>
                            )}
                            {row.status === "weighing" && (
                              <button
                                type="button"
                                onClick={() => openTicketModal(row, "grade")}
                                className="rounded-xl bg-navy px-3 py-1.5 text-xs font-bold text-primary-foreground hover:scale-105 transition-transform focus-ring"
                              >
                                🔬 {hi ? "ग्रेडिंग करें" : "Quality Test"}
                              </button>
                            )}
                            {row.status === "grading" && (
                              <button
                                type="button"
                                onClick={() => openTicketModal(row, "complete")}
                                className="rounded-xl bg-gradient-leaf px-3 py-1.5 text-xs font-bold text-primary-foreground hover:scale-105 transition-transform focus-ring"
                              >
                                ✓ {hi ? "जे-फॉर्म जारी करें" : "Issue J-Form"}
                              </button>
                            )}
                            {(row.status === "done" || row.status === "accepted") && (
                              <button
                                type="button"
                                onClick={() => openTicketModal(row, "complete")}
                                className="rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-bold text-muted-foreground hover:text-navy focus-ring"
                              >
                                📜 {row.jFormNo || (hi ? "विवरण देखें" : "View J-Form")}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* ── TAB 4: COMPLETED REGISTER ── */}
      {activeTab === "completed" && (
        <section className="mt-6 space-y-6">
          <div className="surface p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <SectionLabel>{hi ? "दैनिक खरीद रजिस्टर" : "Daily Procurement Register"}</SectionLabel>
                <h3 className="mt-1 font-display text-xl font-extrabold text-navy">
                  {hi ? "आज के सभी स्वीकृत जे-फॉर्म एवं डीबीटी रिकॉर्ड" : "All Approved J-Forms & DBT Records Today"}
                </h3>
              </div>
              <button
                type="button"
                onClick={handleExportCSV}
                className="rounded-xl bg-navy px-4 py-2.5 text-xs font-bold text-primary-foreground hover:bg-leaf focus-ring"
              >
                📥 {hi ? "एपीएमसी रजिस्टर डाउनलोड करें (CSV)" : "Download APMC Register (CSV)"}
              </button>
            </div>

            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/60 text-left text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                    <th className="px-4 py-3">{hi ? "जे-फॉर्म संख्या" : "J-Form No"}</th>
                    <th className="px-4 py-3">{hi ? "टोकन" : "Token"}</th>
                    <th className="px-4 py-3">{hi ? "किसान का नाम" : "Farmer Name"}</th>
                    <th className="px-4 py-3">{hi ? "फसल" : "Crop"}</th>
                    <th className="px-4 py-3">{hi ? "शुद्ध वजन" : "Net Weight"}</th>
                    <th className="px-4 py-3">{hi ? "एमएसपी दर" : "MSP Rate"}</th>
                    <th className="px-4 py-3">{hi ? "कुल देय राशि" : "Gross Payout"}</th>
                    <th className="px-4 py-3">{hi ? "गुणवत्ता ग्रेड" : "Grade"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {completedToday.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-xs font-semibold text-muted-foreground">
                        {hi ? "आज अभी तक कोई खरीद पूर्ण नहीं हुई है।" : "No procurements completed today yet."}
                      </td>
                    </tr>
                  ) : (
                    completedToday.map((r) => {
                      const netQtl = r.actualQuintals || r.quantityQuintals;
                      const rate = r.crop === "Wheat" ? 2430 : 2300;
                      const totalAmount = netQtl * rate;
                      return (
                        <tr key={r.token} className="hover:bg-muted/30">
                          <td className="px-4 py-3 font-mono font-bold text-leaf text-xs">
                            {r.jFormNo || `JF-2026-${activeCentre.code}-${r.token}`}
                          </td>
                          <td className="px-4 py-3 font-display font-bold text-navy">{r.token}</td>
                          <td className="px-4 py-3 font-semibold text-navy">{r.farmerName}</td>
                          <td className="px-4 py-3 text-muted-foreground">{r.crop}</td>
                          <td className="px-4 py-3 font-bold tabular-nums text-navy">{netQtl} qtl</td>
                          <td className="px-4 py-3 tabular-nums text-muted-foreground">₹{rate}/qtl</td>
                          <td className="px-4 py-3 font-display font-extrabold text-navy">
                            ₹{totalAmount.toLocaleString("en-IN")}
                          </td>
                          <td className="px-4 py-3">
                            <Pill tone="leaf">{r.qualityGrade || "FAQ"}</Pill>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* ── TAB 5: AI FORECAST & ALERTS ── */}
      {activeTab === "analytics" && (
        <section className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
          <div className="space-y-6">
            <section className="surface p-5">
              <SectionLabel>{hi ? "कतार पूर्वानुमान" : "Queue Forecast & Inflow"}</SectionLabel>
              <h3 className="mt-2 font-display text-lg font-extrabold text-navy">
                {hi ? "वास्तविक बनाम अनुमानित आगमन" : "Actual vs Predicted Farmer Inflow"}
              </h3>
              <div className="mt-4">
                <ForecastChart data={forecast} tone="light" />
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="surface p-5">
              <SectionLabel>{hi ? "सक्रिय अलर्ट" : "Operational Alerts"}</SectionLabel>
              <div className="mt-3 space-y-3">
                {alerts.length === 0 ? (
                  <p className="text-xs font-semibold text-muted-foreground">
                    {hi ? "कोई गंभीर अलर्ट नहीं। केंद्र सामान्य चल रहा है।" : "All systems normal. No operational alerts."}
                  </p>
                ) : (
                  alerts.map((a) => (
                    <div key={a.id} className="rounded-xl border-2 border-saffron/40 bg-saffron-soft p-3.5">
                      <p className="font-display text-xs font-bold text-navy">{a.title}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">{a.detail}</p>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        </section>
      )}

      {/* ── OPERATIONAL TICKET ACTION MODAL ── */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/60 backdrop-blur-xs p-4 animate-rise">
          <div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-card border-2 border-leaf/40 shadow-2xl">
            {/* Modal Header */}
            <div className="bg-hero p-5 text-primary-foreground">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-leaf">
                    {hi ? "कार्यवाही वर्कस्टेशन" : "Procurement Stepper"} · {selectedTicket.token}
                  </span>
                  <h3 className="mt-1 font-display text-xl font-extrabold">
                    {selectedTicket.farmerName} ({selectedTicket.crop} · {selectedTicket.quantityQuintals} qtl)
                  </h3>
                  <p className="text-xs text-primary-foreground/70">{selectedTicket.village} · Slot {selectedTicket.slotWindow}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedTicket(null)}
                  className="rounded-full bg-primary-foreground/10 p-2 text-primary-foreground hover:bg-primary-foreground/20 focus-ring"
                >
                  ✕
                </button>
              </div>

              {/* Stepper Tabs in Modal */}
              <div className="mt-4 grid grid-cols-4 gap-1 rounded-xl bg-primary-foreground/10 p-1 text-center text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => setModalStage("call")}
                  className={cn("py-1.5 rounded-lg transition-colors", modalStage === "call" ? "bg-leaf text-primary-foreground" : "text-primary-foreground/70")}
                >
                  1. {hi ? "गेट कॉल" : "Gate Call"}
                </button>
                <button
                  type="button"
                  onClick={() => setModalStage("weigh")}
                  className={cn("py-1.5 rounded-lg transition-colors", modalStage === "weigh" ? "bg-leaf text-primary-foreground" : "text-primary-foreground/70")}
                >
                  2. {hi ? "तुलाई" : "Weighing"}
                </button>
                <button
                  type="button"
                  onClick={() => setModalStage("grade")}
                  className={cn("py-1.5 rounded-lg transition-colors", modalStage === "grade" ? "bg-leaf text-primary-foreground" : "text-primary-foreground/70")}
                >
                  3. {hi ? "ग्रेडिंग" : "Grading"}
                </button>
                <button
                  type="button"
                  onClick={() => setModalStage("complete")}
                  className={cn("py-1.5 rounded-lg transition-colors", modalStage === "complete" ? "bg-leaf text-primary-foreground" : "text-primary-foreground/70")}
                >
                  4. {hi ? "जे-फॉर्म" : "J-Form"}
                </button>
              </div>
            </div>

            {/* Modal Body based on stage */}
            <div className="p-6 space-y-5">
              {/* STAGE 1: CALL TO COUNTER */}
              {modalStage === "call" && (
                <div className="space-y-4">
                  <div className="rounded-2xl bg-muted/60 p-4">
                    <p className="font-display text-sm font-bold text-navy">
                      {hi ? "किसान को किस काउंटर पर उपस्थित होने का संदेश भेजें?" : "Assign Operational Counter for Gate Entry"}
                    </p>
                    <div className="mt-3 grid grid-cols-6 gap-2">
                      {[1, 2, 3, 4, 5, 6].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setCounterInput(num)}
                          className={cn(
                            "rounded-xl py-3 font-display font-extrabold text-sm transition-all focus-ring",
                            counterInput === num
                              ? "bg-navy text-primary-foreground ring-2 ring-leaf scale-105"
                              : "bg-card border border-border text-navy hover:bg-muted"
                          )}
                        >
                          #{num}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleExecuteAction("call")}
                    className="w-full rounded-2xl bg-gradient-leaf py-3.5 text-sm font-extrabold text-primary-foreground shadow-md hover:scale-[1.01] transition-transform focus-ring"
                  >
                    {isSubmitting ? "Processing..." : hi ? `📢 काउंटर #${counterInput} पर बुलाएँ एवं प्रवेश दर्ज करें` : `📢 Call to Counter #${counterInput} & Mark Arrived`}
                  </button>
                </div>
              )}

              {/* STAGE 2: ELECTRONIC WEIGHBRIDGE */}
              {modalStage === "weigh" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                        {hi ? "सकल वजन (Gross Weight in Qtl)" : "Gross Truck Weight (Qtl)"}
                      </label>
                      <input
                        type="number"
                        value={grossInput}
                        onChange={(e) => setGrossInput(e.target.value)}
                        placeholder="125"
                        className="mt-1.5 w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-bold text-navy focus-ring"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                        {hi ? "खाली वाहन वजन (Tare Weight in Qtl)" : "Tare Vehicle Weight (Qtl)"}
                      </label>
                      <input
                        type="number"
                        value={tareInput}
                        onChange={(e) => setTareInput(e.target.value)}
                        placeholder="25"
                        className="mt-1.5 w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-bold text-navy focus-ring"
                      />
                    </div>
                  </div>

                  {/* Calculated Net Weight Card */}
                  <div className="rounded-2xl border-2 border-leaf/40 bg-leaf-soft p-4 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-leaf">
                        {hi ? "शुद्ध तुलाई परिणाम (Net Weight)" : "Net Crop Weight (Gross - Tare)"}
                      </p>
                      <p className="mt-1 font-display text-2xl font-black text-navy">
                        {Math.max(0, (Number(grossInput) || 0) - (Number(tareInput) || 0))} quintals
                      </p>
                    </div>
                    <span className="text-3xl">⚖️</span>
                  </div>

                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleExecuteAction("weigh")}
                    className="w-full rounded-2xl bg-gradient-leaf py-3.5 text-sm font-extrabold text-primary-foreground shadow-md hover:scale-[1.01] transition-transform focus-ring"
                  >
                    {isSubmitting ? "Processing..." : hi ? "✓ तुलाई दर्ज करें एवं गुणवत्ता लैब भेजें" : "✓ Save Weight & Send to Quality Lab"}
                  </button>
                </div>
              )}

              {/* STAGE 3: FAQ QUALITY GRADING */}
              {modalStage === "grade" && (
                <div className="space-y-4">
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                      {hi ? "गुणवत्ता ग्रेड (FAQ Standard Grade)" : "Quality Grade"}
                    </label>
                    <div className="mt-2 grid grid-cols-4 gap-2">
                      {["FAQ", "Grade_A", "Grade_B", "Below_FAQ"].map((g) => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => setQualityGradeInput(g)}
                          className={cn(
                            "rounded-xl py-2.5 text-xs font-extrabold transition-all focus-ring",
                            qualityGradeInput === g
                              ? g === "Below_FAQ"
                                ? "bg-danger text-primary-foreground ring-2 ring-danger"
                                : "bg-leaf text-primary-foreground ring-2 ring-leaf"
                              : "bg-card border border-border text-navy hover:bg-muted"
                          )}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                        {hi ? "नमी प्रतिशत (Moisture % - Max 12%)" : "Moisture Content (%)"}
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={moistureInput}
                        onChange={(e) => setMoistureInput(e.target.value)}
                        className="mt-1.5 w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-bold text-navy focus-ring"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                        {hi ? "विदेशी तत्व (Foreign Matter % - Max 0.75%)" : "Foreign Matter (%)"}
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={foreignMatterInput}
                        onChange={(e) => setForeignMatterInput(e.target.value)}
                        className="mt-1.5 w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-bold text-navy focus-ring"
                      />
                    </div>
                  </div>

                  {qualityGradeInput === "Below_FAQ" ? (
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleExecuteAction("reject")}
                      className="w-full rounded-2xl bg-danger py-3.5 text-sm font-extrabold text-primary-foreground shadow-md hover:bg-danger/90 focus-ring"
                    >
                      {isSubmitting ? "Processing..." : hi ? "⚠️ लॉट अस्वीकृत करें (Below FAQ)" : "⚠️ Reject Lot (Below FAQ Standards)"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleExecuteAction("grade")}
                      className="w-full rounded-2xl bg-gradient-leaf py-3.5 text-sm font-extrabold text-primary-foreground shadow-md hover:scale-[1.01] transition-transform focus-ring"
                    >
                      {isSubmitting ? "Processing..." : hi ? "✓ गुणवत्ता स्वीकृत करें एवं जे-फॉर्म जनरेट करें" : "✓ Approve Quality & Proceed to J-Form"}
                    </button>
                  )}
                </div>
              )}

              {/* STAGE 4: J-FORM & DBT COMPLETION */}
              {modalStage === "complete" && (
                <div className="space-y-4">
                  {/* Digital J-Form Receipt Preview */}
                  <div className="rounded-2xl border-2 border-border bg-muted/40 p-5 space-y-3 font-sans">
                    <div className="flex items-center justify-between border-b border-border pb-2">
                      <div>
                        <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-leaf">
                          FORM J (GOVERNMENT APMC VOUCHER)
                        </p>
                        <p className="font-mono text-sm font-bold text-navy">
                          {selectedTicket.jFormNo || `JF-2026-${activeCentre.code}-${selectedTicket.token}`}
                        </p>
                      </div>
                      <span className="rounded-lg bg-leaf-soft px-2.5 py-1 text-[10px] font-extrabold uppercase text-leaf">
                        MSP Verified
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div>
                        <p className="text-muted-foreground">{hi ? "किसान" : "Farmer"}</p>
                        <p className="font-bold text-navy">{selectedTicket.farmerName}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">{hi ? "शुद्ध वजन" : "Net Weight"}</p>
                        <p className="font-bold text-navy">{selectedTicket.actualQuintals || selectedTicket.quantityQuintals} qtl</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">{hi ? "एमएसपी दर" : "MSP Rate"}</p>
                        <p className="font-bold text-navy">₹2,430/qtl</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">{hi ? "कुल देय राशि" : "Gross Payout"}</p>
                        <p className="font-display font-extrabold text-leaf text-sm">
                          ₹{((selectedTicket.actualQuintals || selectedTicket.quantityQuintals) * 2430).toLocaleString("en-IN")}
                        </p>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleExecuteAction("complete")}
                    className="w-full rounded-2xl bg-gradient-leaf py-4 text-base font-extrabold text-primary-foreground shadow-lg hover:scale-[1.01] transition-transform focus-ring"
                  >
                    {isSubmitting ? "Finalizing..." : hi ? "🎉 खरीद पूर्ण करें एवं डीबीटी भुगतान जारी करें" : "🎉 Complete Procurement & Queue DBT Payout"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
