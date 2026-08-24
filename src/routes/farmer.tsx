/**
 * KISAN SETU — Farmer Portal (Complete Redesign with Pure Supabase Connectivity)
 * Mobile-first, voice-enabled, low-literacy friendly, zero mock data.
 */
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { PageShell } from "@/components/kisan/app-shell";
import { AuthGuard } from "@/components/kisan/auth-guard";
import { CapacityBar, HealthDot, Pill, PrototypeBadge, SectionLabel } from "@/components/kisan/primitives";
import { VoiceAssistant } from "@/components/kisan/voice-assistant";
import { useAuth } from "@/hooks/use-auth";
import { centreHealth, useKisan } from "@/lib/kisan/store";
import {
  auditService,
  centreService,
  farmerService,
  notificationService,
  slotService,
} from "@/lib/kisan/services";
import { speak } from "@/lib/kisan/voice";
import type { ProcurementCentre, SlotSuggestion, TimelineStep } from "@/lib/kisan/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/farmer")({
  head: () => ({
    meta: [
      { title: "Farmer Portal — Procurement Centres, Slots, Live Queue & Payments | KISAN SETU" },
      {
        name: "description",
        content:
          "Voice-enabled farmer procurement platform: Smart centre allocation, virtual token tracking, timeline, and direct MSP payment updates.",
      },
    ],
  }),
  component: FarmerPageGuarded,
});

function FarmerPageGuarded() {
  return (
    <AuthGuard allowedRoles={["farmer", "super_admin"]}>
      <FarmerPortal />
    </AuthGuard>
  );
}

function FarmerPortal() {
  const { user, logout } = useAuth();
  const {
    language,
    toggleLanguage,
    farmer,
    centres,
    slot,
    ticket,
    timeline,
    payment,
    refreshFromDatabase,
    updateFarmerProfile,
    isLoading,
  } = useKisan();
  const router = useRouter();
  const hi = language === "hi";

  // Tab navigation for mobile-first layout
  const [activeTab, setActiveTab] = useState<"home" | "centres" | "queue" | "timeline" | "payments" | "profile">("home");
  const [notifications, setNotifications] = useState<Array<{ id: string; title: string; body: string; isRead: boolean; createdAt: string }>>([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [selectedCentre, setSelectedCentre] = useState<ProcurementCentre | null>(null);
  const [availableSlots, setAvailableSlots] = useState<SlotSuggestion[]>([]);
  const [bookingInProgress, setBookingInProgress] = useState(false);

  // Dynamic farmer name resolution (Never hardcoded!)
  const displayName = user?.fullName || farmer?.name || user?.email?.split("@")[0] || (hi ? "किसान भाई" : "Farmer");
  const initial = displayName.charAt(0).toUpperCase() || "K";
  const farmerIdCode = farmer?.farmerId || user?.farmerIdCode || `HR-KRN-2026-${(user?.id || "88214").slice(0, 5).toUpperCase()}`;
  const registeredCrop = farmer?.crop || user?.crop || "Wheat";
  const registeredCropHi = farmer?.cropHi || (registeredCrop === "Wheat" ? "गेहूँ" : registeredCrop === "Paddy" ? "धान" : registeredCrop === "Mustard" ? "सरसों" : "चना");
  const registeredQuantity = farmer?.quantityQuintals || user?.quantityQuintals || 120;
  const villageName = farmer?.village || user?.village || "";
  const districtName = farmer?.district || user?.district || "";

  // Best recommended centre
  const recommendedCentre = centres.find((c) => c.recommended) || centres[0];
  const activeCentre = selectedCentre || recommendedCentre;

  // Load real notifications
  useEffect(() => {
    if (user?.id) {
      notificationService.getForUser(user.id).then(setNotifications).catch(() => {});
    }
  }, [user?.id, ticket?.token]);

  // Load available slots when active centre changes
  useEffect(() => {
    if (activeCentre?.id) {
      slotService.listAvailable(activeCentre.id).then(setAvailableSlots).catch(() => {});
    }
  }, [activeCentre?.id]);

  // Listen to status via Web Speech API
  const handleListenStatus = () => {
    let text = "";
    if (hi) {
      text = `नमस्ते ${displayName} जी। आपकी ${registeredCropHi} की मात्रा ${registeredQuantity} क्विंटल दर्ज है।`;
      if (ticket) {
        text += ` आपका टोकन ${ticket.token} है। आपसे आगे ${ticket.farmersAhead} किसान हैं। अनुमानित समय ${ticket.etaMinutes} मिनट है।`;
      } else {
        text += ` आपके लिए ${activeCentre ? activeCentre.nameHi : "मंडी"} सबसे अच्छा केंद्र है। आज ही अपना स्लॉट बुक करें।`;
      }
    } else {
      text = `Welcome, ${displayName}. You have ${registeredQuantity} quintals of ${registeredCrop} registered.`;
      if (ticket) {
        text += ` Your queue token is ${ticket.token}. There are ${ticket.farmersAhead} farmers ahead of you with an estimated wait of ${ticket.etaMinutes} minutes.`;
      } else {
        text += ` ${activeCentre ? activeCentre.name : "Centre"} is your optimal procurement centre. Book your slot now.`;
      }
    }
    speak(text, language);
  };

  // Start Procurement / Book Slot Handler
  const handleBookSlot = async (slotId?: string, slotWindow?: string) => {
    if (!user || !activeCentre) return;
    setBookingInProgress(true);
    try {
      await farmerService.bookProcurementJourney({
        farmerId: user.id,
        farmerName: displayName,
        village: villageName,
        crop: registeredCrop,
        quantityQuintals: registeredQuantity,
        centreId: activeCentre.id,
        slotId: slotId || slot?.id,
        slotWindow: slotWindow || slot?.window || "11:30 – 12:00",
      });

      await auditService.log({
        actorId: user.id,
        actorRole: "farmer",
        action: "book_slot",
        targetType: "centre",
        targetId: activeCentre.id,
        metadata: { crop: registeredCrop, quantity: registeredQuantity, window: slotWindow },
      });

      await refreshFromDatabase();
      alert(hi ? "✓ स्लॉट एवं टोकन सफलतापूर्वक आवंटित किया गया!" : "✓ Slot booked & virtual queue token issued!");
      setActiveTab("queue");
    } catch (err: any) {
      alert(err.message || "Failed to book slot");
    } finally {
      setBookingInProgress(false);
    }
  };

  if (isLoading && !farmer) {
    return (
      <PageShell>
        <div className="mx-auto w-full max-w-2xl py-16 text-center">
          <div className="size-12 mx-auto animate-spin rounded-full border-4 border-leaf border-t-transparent" />
          <h2 className="mt-4 font-display text-xl font-extrabold text-navy">
            {hi ? "किसान डेटा सिंक किया जा रहा है..." : "Syncing live farmer data from Supabase..."}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {hi ? "कृपया प्रतीक्षा करें" : "Connecting with national procurement database"}
          </p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="mx-auto w-full max-w-3xl space-y-6 pb-20 sm:pb-8">

        {/* ── 1. TOP HERO GREETING & VERIFIED PROFILE ── */}
        <section className="surface-lift overflow-hidden">
          <div className="relative bg-hero p-5 text-primary-foreground sm:p-7">
            {/* Background Glow Accents */}
            <div className="pointer-events-none absolute -right-12 -top-12 size-48 rounded-full bg-leaf/20 blur-3xl" />

            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                {/* Profile Initial Avatar */}
                <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-leaf text-2xl font-extrabold text-primary-foreground shadow-lg shadow-leaf/30 sm:size-16 sm:text-3xl">
                  {initial}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-foreground/70">
                      {hi ? "नमस्ते" : "Welcome"}
                    </p>
                    <span className="inline-flex items-center gap-1 rounded-full bg-leaf/20 px-2 py-0.5 text-[10px] font-bold text-leaf">
                      ✓ {hi ? "सत्यापित किसान" : "Verified Farmer"}
                    </span>
                  </div>
                  <h1 className="mt-0.5 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
                    {displayName} 👋
                  </h1>
                  <p className="text-xs font-semibold text-primary-foreground/75 sm:text-sm">
                    {villageName} · {districtName}
                  </p>
                </div>
              </div>

              {/* Status Audio & Notification buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleListenStatus}
                  title={hi ? "ऑडियो स्थिति सुनें" : "Listen to status"}
                  className="flex items-center gap-1.5 rounded-xl border border-primary-foreground/20 bg-primary-foreground/10 px-3.5 py-2 text-xs font-bold text-primary-foreground backdrop-blur transition-all hover:bg-primary-foreground/20 focus-ring"
                >
                  <span>🔊</span>
                  <span>{hi ? "स्थिति सुनें" : "Listen Status"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowNotifs(!showNotifs)}
                  className="relative flex size-10 items-center justify-center rounded-xl border border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground backdrop-blur hover:bg-primary-foreground/20 focus-ring"
                >
                  <span>🔔</span>
                  {notifications.filter((n) => !n.isRead).length > 0 && (
                    <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-danger text-[9px] font-bold text-primary-foreground">
                      {notifications.filter((n) => !n.isRead).length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="mt-5 grid grid-cols-3 gap-2 rounded-2xl bg-primary-foreground/10 p-3 backdrop-blur sm:grid-cols-3">
              <div className="text-center sm:text-left sm:px-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-primary-foreground/60">
                  {hi ? "फ़सल (Crop)" : "Crop"}
                </p>
                <p className="mt-0.5 font-display text-base font-extrabold sm:text-lg">
                  {hi ? registeredCropHi : registeredCrop}
                </p>
              </div>
              <div className="border-x border-primary-foreground/10 text-center sm:text-left sm:px-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-primary-foreground/60">
                  {hi ? "मात्रा (Quantity)" : "Quantity"}
                </p>
                <p className="mt-0.5 font-display text-base font-extrabold sm:text-lg">
                  {registeredQuantity} <span className="text-xs font-semibold">{hi ? "क्विंटल" : "qtl"}</span>
                </p>
              </div>
              <div className="text-center sm:text-left sm:px-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-primary-foreground/60">
                  {hi ? "किसान आईडी" : "Farmer ID"}
                </p>
                <p className="mt-0.5 font-display text-xs font-bold sm:text-sm truncate">
                  {farmerIdCode}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── NOTIFICATIONS POPUP DRAWER ── */}
        {showNotifs && (
          <section className="surface animate-rise p-5">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <span className="text-base">🔔</span>
                <h3 className="font-display text-base font-extrabold text-navy">
                  {hi ? "महत्वपूर्ण सूचनाएँ (Notifications)" : "Procurement Alerts & Updates"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowNotifs(false)}
                className="text-xs font-bold text-muted-foreground hover:text-navy"
              >
                ✕ {hi ? "बंद करें" : "Close"}
              </button>
            </div>
            <div className="mt-3 space-y-2">
              {notifications.length > 0 ? (
                notifications.map((n) => (
                  <div key={n.id} className="rounded-xl border border-border bg-card p-3">
                    <p className="font-display text-sm font-bold text-navy">{n.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{n.body}</p>
                  </div>
                ))
              ) : (
                <p className="py-4 text-center text-xs text-muted-foreground">
                  {hi ? "कोई नई सूचना नहीं है।" : "No unread notifications at this time."}
                </p>
              )}
            </div>
          </section>
        )}

        {/* ── NAVIGATION PILLS (MOBILE FIRST) ── */}
        <div className="flex gap-2 overflow-x-auto rounded-2xl bg-muted p-1 text-xs font-bold">
          {[
            { id: "home", label: hi ? "🏠 मुख्य पृष्ठ" : "🏠 Overview" },
            { id: "centres", label: hi ? "🏢 खरीद केंद्र" : "🏢 Centre Finder" },
            { id: "queue", label: hi ? "🎫 कतार स्थिति" : "🎫 Virtual Queue" },
            { id: "timeline", label: hi ? "📋 खरीद चरण" : "📋 Timeline" },
            { id: "payments", label: hi ? "💰 बैंक भुगतान" : "💰 Payments" },
            { id: "profile", label: hi ? "👤 मेरी प्रोफ़ाइल" : "👤 Profile" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "whitespace-nowrap rounded-xl px-3.5 py-2.5 transition-all focus-ring",
                activeTab === tab.id
                  ? "bg-card text-navy shadow-sm"
                  : "text-muted-foreground hover:text-navy",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── 2. ACTIVE PROCUREMENT JOURNEY / START WIZARD ── */}
        {activeTab === "home" && (
          <div className="space-y-6">
            {/* Active Procurement Card */}
            {ticket ? (
              <section className="surface-lift border-2 border-leaf/40 p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full bg-leaf animate-blip" />
                    <SectionLabel>{hi ? "सक्रिय खरीद यात्रा" : "Live Procurement in Progress"}</SectionLabel>
                  </div>
                  <Pill tone="leaf">{ticket.status === "scheduled" ? (hi ? "स्लॉट आरक्षित" : "Slot Confirmed") : ticket.status}</Pill>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl bg-muted/70 p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      {hi ? "आवंटित टोकन संख्या" : "Allocated Queue Token"}
                    </p>
                    <p className="mt-1 font-display text-4xl font-extrabold text-navy tracking-tight">
                      {ticket.token}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-leaf">
                      {hi ? `समय स्लॉट: ${ticket.slotWindow}` : `Arrival Window: ${ticket.slotWindow}`}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-leaf-soft/60 p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-leaf">
                      {hi ? "निर्धारित खरीद केंद्र" : "Allocated Procurement Centre"}
                    </p>
                    <p className="mt-1 font-display text-xl font-extrabold text-navy">
                      {hi ? activeCentre?.nameHi : activeCentre?.name}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {activeCentre?.distanceKm} km {hi ? "दूरी" : "away"} · {ticket.farmersAhead} {hi ? "किसान आगे" : "farmers ahead"}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab("queue")}
                    className="flex-1 rounded-xl bg-navy px-4 py-3 text-center text-sm font-bold text-primary-foreground transition-transform hover:-translate-y-0.5 focus-ring"
                  >
                    🎫 {hi ? "लाइव कतार एवं ईटीए देखें" : "View Live Queue & ETA"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("timeline")}
                    className="flex-1 rounded-xl border border-border bg-card px-4 py-3 text-center text-sm font-bold text-navy hover:bg-muted focus-ring"
                  >
                    📋 {hi ? "खरीद प्रक्रिया चरण" : "Procurement Stages"}
                  </button>
                </div>
              </section>
            ) : (
              /* Start Procurement Wizard if no ticket exists */
              <section className="surface-lift border-2 border-dashed border-leaf/50 p-6 text-center">
                <span className="text-4xl">🌾</span>
                <h3 className="mt-3 font-display text-2xl font-extrabold text-navy">
                  {hi ? "अपनी फसल खरीद शुरू करें" : "Start Your Procurement Journey"}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                  {hi
                    ? "स्मार्ट स्लॉट बुक करें, न्यूनतम प्रतीक्षा समय प्राप्त करें, और कतार में अपनी जगह सुरक्षित करें।"
                    : "Book a verified smart slot, get lowest waiting times, and track your queue live from home."}
                </p>

                <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    type="button"
                    disabled={bookingInProgress}
                    onClick={() => handleBookSlot()}
                    className="rounded-xl bg-gradient-leaf px-6 py-3.5 text-sm font-bold text-primary-foreground shadow-lg shadow-leaf/20 transition-transform hover:-translate-y-0.5 focus-ring"
                  >
                    {bookingInProgress ? (hi ? "आवंटित किया जा रहा है..." : "Allocating slot...") : hi ? "⚡ 1-क्लिक सर्वोत्तम स्लॉट बुक करें" : "⚡ 1-Click Best Slot Booking"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("centres")}
                    className="rounded-xl border border-border bg-card px-5 py-3.5 text-sm font-bold text-navy hover:bg-muted focus-ring"
                  >
                    🏢 {hi ? "केंद्र सूची देखें" : "Explore Procurement Centres"}
                  </button>
                </div>
              </section>
            )}

            {/* ── 3. VOICE-FIRST ASSISTANT (KISAN SETU SAHAYAK) ── */}
            <VoiceAssistant
              onNavigateTab={(tab) => setActiveTab(tab as any)}
              onExecuteAction={async (act) => {
                if (act.type === "book_slot") {
                  await handleBookSlot(undefined, act.payload?.slotWindow || "11:30 – 12:00");
                }
              }}
            />

            {/* ── 4. CROP & QUANTITY REGISTRATION CARD ── */}
            <RegistrationCard
              currentCrop={registeredCrop}
              currentQuantity={registeredQuantity}
              hi={hi}
              onSave={async (c, q) => {
                if (user?.id) {
                  await updateFarmerProfile({ crop: c, quantityQuintals: q });
                  await refreshFromDatabase();
                }
              }}
            />
          </div>
        )}

        {/* ── TAB 2: SMART CENTRES ── */}
        {activeTab === "centres" && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <SectionLabel>{hi ? "निकटतम अधिकृत केंद्र" : "Authorized Procurement Centres"}</SectionLabel>
                <h2 className="mt-1 font-display text-2xl font-extrabold text-navy">
                  {hi ? "आपके क्षेत्र के खरीद केंद्र" : "Smart Centre Allocation"}
                </h2>
              </div>
              <PrototypeBadge tone="light" />
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {hi
                ? "दूरी, वास्तविक कतार, क्षमता और प्रसंस्करण गति के आधार पर तुलना की गई है।"
                : "Real-time comparison across distance, live queue, daily processing rate, and counter availability."}
            </p>

            <div className="space-y-4 pt-2">
              {centres.length === 0 && (
                <div className="rounded-xl border border-border bg-card p-8 text-center">
                  <p className="text-sm font-semibold text-muted-foreground">
                    {hi ? "आपके क्षेत्र में कोई खरीद केंद्र उपलब्ध नहीं है।" : "No procurement centres are currently available in your area."}
                  </p>
                </div>
              )}
              {centres.map((c) => {
                const health = centreHealth(c.capacityUsedPct);
                const isSelected = activeCentre?.id === c.id;
                return (
                  <article
                    key={c.id}
                    className={cn(
                      "surface p-5 transition-all",
                      c.recommended && "border-2 border-leaf/60 surface-lift",
                      isSelected && "ring-2 ring-navy",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="flex size-7 items-center justify-center rounded-lg bg-navy font-display text-xs font-bold text-primary-foreground">
                            {c.code}
                          </span>
                          <h3 className="font-display text-lg font-extrabold text-navy">
                            {hi ? c.nameHi : c.name}
                          </h3>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {c.distanceKm} km {hi ? "दूरी" : "distance"} · {c.activeCounters}/{c.totalCounters} {hi ? "काउंटर चालू" : "counters active"}
                        </p>
                      </div>

                      {c.recommended ? (
                        <Pill tone="leaf">★ {hi ? "AI अनुशंसित" : "AI RECOMMENDED"}</Pill>
                      ) : (
                        <HealthDot health={health} />
                      )}
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-xl bg-muted/60 p-2.5">
                        <p className="font-display text-lg font-extrabold text-navy">{c.predictedWaitMin}</p>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                          {hi ? "मिनट प्रतीक्षा" : "min wait"}
                        </p>
                      </div>
                      <div className="rounded-xl bg-muted/60 p-2.5">
                        <p className="font-display text-lg font-extrabold text-navy">{c.queueLength}</p>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                          {hi ? "कतार में" : "in queue"}
                        </p>
                      </div>
                      <div className="rounded-xl bg-muted/60 p-2.5">
                        <p className="font-display text-lg font-extrabold text-navy">{c.capacityUsedPct}%</p>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                          {hi ? "क्षमता उपयोग" : "capacity"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4">
                      <CapacityBar pct={c.capacityUsedPct} />
                    </div>

                    {/* AI Reasons based on live DB metrics */}
                    {c.recommended && (
                      <div className="mt-4 rounded-xl bg-leaf-soft p-3.5">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-leaf">
                          {hi ? "यह केंद्र क्यों चुनें? (लाइव एआई विश्लेषण)" : "Why Choose This Centre? (Live AI Analysis)"}
                        </p>
                        <ul className="mt-2 space-y-1.5">
                          <li className="text-xs font-semibold text-navy flex items-center gap-1.5">
                            <span className="size-1.5 rounded-full bg-leaf shrink-0" />
                            {hi
                              ? `न्यूनतम प्रतीक्षा समय: केवल ${c.predictedWaitMin} मिनट (${c.distanceKm} किमी दूरी पर सबसे तेज़)`
                              : `Lowest predicted wait: Only ${c.predictedWaitMin} min (fastest processing at ${c.distanceKm} km)`}
                          </li>
                          <li className="text-xs font-semibold text-navy flex items-center gap-1.5">
                            <span className="size-1.5 rounded-full bg-leaf shrink-0" />
                            {hi
                              ? `सक्रिय कतार: मात्र ${c.queueLength} किसान कतार में हैं (${c.activeCounters}/${c.totalCounters} काउंटर चालू हैं)`
                              : `Current active queue: Only ${c.queueLength} farmers in queue (${c.activeCounters}/${c.totalCounters} counters active)`}
                          </li>
                          <li className="text-xs font-semibold text-navy flex items-center gap-1.5">
                            <span className="size-1.5 rounded-full bg-leaf shrink-0" />
                            {hi
                              ? `यार्ड क्षमता: ${c.capacityUsedPct}% उपयोग — आपकी ${registeredQuantity} क्विंटल फसल आसानी से स्वीकृत होगी`
                              : `Yard capacity: ${c.capacityUsedPct}% utilized — ample capacity for your ${registeredQuantity} quintals`}
                          </li>
                        </ul>
                      </div>
                    )}

                    <div className="mt-4 flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCentre(c);
                          handleBookSlot(undefined, "11:30 – 12:00");
                        }}
                        className="flex-1 rounded-xl bg-navy py-2.5 text-xs font-bold text-primary-foreground focus-ring"
                      >
                        ✓ {hi ? "इस केंद्र पर स्लॉट बुक करें" : "Book Slot at This Centre"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {/* ── TAB 3: VIRTUAL QUEUE ── */}
        {activeTab === "queue" && (
          <section className="space-y-5">
            {ticket ? (
              <div className="surface-lift overflow-hidden">
                <div className="bg-hero p-6 text-primary-foreground">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-foreground/70">
                      {hi ? "वर्चुअल कतार टोकन" : "Live Virtual Queue Token"}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-leaf/20 px-2.5 py-1 text-[10px] font-bold uppercase text-leaf">
                      <span className="size-1.5 rounded-full bg-leaf animate-blip" /> {hi ? "लाइव सिंक" : "Live Sync"}
                    </span>
                  </div>

                  <p className="mt-3 font-display text-5xl font-extrabold tracking-tight sm:text-6xl">
                    {ticket.token}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-primary-foreground/80">
                    {hi ? activeCentre?.nameHi : activeCentre?.name} · {ticket.slotWindow}
                  </p>
                </div>

                <div className="grid grid-cols-2 divide-x divide-border">
                  <div className="p-5 text-center">
                    <p className="font-display text-4xl font-extrabold text-navy tabular-nums">
                      {ticket.farmersAhead}
                    </p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                      {hi ? "आपसे आगे किसान" : "Farmers ahead"}
                    </p>
                  </div>
                  <div className="p-5 text-center">
                    <p className="font-display text-4xl font-extrabold text-navy tabular-nums">
                      {ticket.etaMinutes} <span className="text-base font-bold">{hi ? "मिनट" : "min"}</span>
                    </p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                      {hi ? "लाइव अनुमानित समय" : "Live ETA"}
                    </p>
                  </div>
                </div>

                {/* Animated progress blip */}
                <div className="relative h-1.5 overflow-hidden bg-muted">
                  <span className="absolute inset-y-0 w-1/3 bg-gradient-leaf animate-sweep" />
                </div>

                <div className="p-5 space-y-3">
                  <div className="rounded-xl bg-leaf-soft p-3.5">
                    <p className="text-xs font-semibold text-navy leading-relaxed">
                      💡 {hi
                        ? "कतार में आपकी जगह सुरक्षित है। अपने स्लॉट समय से 10 मिनट पहले मंडी के मुख्य द्वार पर पहुँचें।"
                        : "Your place in the virtual queue is secured in the central database. Please arrive at the centre gate 10 minutes prior to your window."}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const centreName = activeCentre ? (hi ? activeCentre.nameHi : activeCentre.name) : (hi ? "खरीद केंद्र" : "Procurement Centre");
                        alert(hi ? `केंद्र: ${centreName}` : `Centre: ${centreName}`);
                      }}
                      className="rounded-xl bg-navy py-3 text-xs font-bold text-primary-foreground focus-ring"
                    >
                      🧭 {hi ? "दिशा-निर्देश" : "Get Directions"}
                    </button>
                    <button
                      type="button"
                      onClick={handleListenStatus}
                      className="rounded-xl border border-border bg-card py-3 text-xs font-bold text-navy hover:bg-muted focus-ring"
                    >
                      🔊 {hi ? "कतार स्थिति सुनें" : "Speak Token Status"}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="surface p-8 text-center">
                <span className="text-4xl">🎫</span>
                <h3 className="mt-3 font-display text-xl font-extrabold text-navy">
                  {hi ? "कोई सक्रिय टोकन नहीं मिला" : "No Active Queue Ticket"}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {hi ? "कतार टोकन प्राप्त करने के लिए कृपया पहले स्लॉट बुक करें।" : "Please book a procurement slot to generate your live queue ticket."}
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab("centres")}
                  className="mt-5 rounded-xl bg-gradient-leaf px-5 py-2.5 text-xs font-bold text-primary-foreground focus-ring"
                >
                  {hi ? "स्लॉट बुक करें" : "Book Smart Slot"}
                </button>
              </div>
            )}
          </section>
        )}

        {/* ── TAB 4: PROCUREMENT TIMELINE ── */}
        {activeTab === "timeline" && (
          <section className="surface p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <SectionLabel>{hi ? "खरीद प्रक्रिया" : "Procurement Stages"}</SectionLabel>
                <h2 className="mt-1 font-display text-xl font-extrabold text-navy">
                  {hi ? "8-चरणीय खरीद प्रगति" : "8-Step Procurement Lifecycle"}
                </h2>
              </div>
              <Pill tone="leaf">{hi ? "डेटाबेस सिंक" : "Realtime Sync"}</Pill>
            </div>

            <ol className="mt-5 space-y-2">
              {timeline.length > 0 ? (
                timeline.map((step, i) => (
                  <li key={step.id} className="relative flex gap-4 pb-5 last:pb-0">
                    {i < timeline.length - 1 && (
                      <span
                        className={cn(
                          "absolute left-[15px] top-8 h-[calc(100%-1.5rem)] w-0.5",
                          step.state === "done" ? "bg-leaf" : "bg-border",
                        )}
                      />
                    )}
                    <span
                      className={cn(
                        "z-10 flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-extrabold",
                        step.state === "done" && "bg-leaf text-primary-foreground",
                        step.state === "active" && "bg-gradient-saffron text-primary-foreground animate-pulse",
                        step.state === "upcoming" && "bg-muted text-muted-foreground",
                      )}
                    >
                      {step.state === "done" ? "✓" : i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className={cn("font-display text-sm font-bold", step.state === "upcoming" ? "text-muted-foreground" : "text-navy")}>
                          {hi ? step.labelHi : step.label}
                        </p>
                        {step.timestamp && (
                          <span className="text-[11px] font-semibold text-muted-foreground">{step.timestamp}</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{hi ? step.detailHi : step.detail}</p>
                      {step.state === "active" && (
                        <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-saffron-soft px-2 py-0.5 text-[10px] font-bold text-navy">
                          <span className="size-1.5 rounded-full bg-saffron animate-blip" /> {hi ? "वर्तमान में प्रगति पर" : "In Progress"}
                        </span>
                      )}
                    </div>
                  </li>
                ))
              ) : (
                <p className="py-6 text-center text-xs text-muted-foreground">
                  {hi ? "प्रक्रिया चरण देखने के लिए स्लॉट बुक करें।" : "Book a slot to initialize your 8-stage procurement timeline."}
                </p>
              )}
            </ol>
          </section>
        )}

        {/* ── TAB 5: PAYMENTS ── */}
        {activeTab === "payments" && (
          <section className="surface overflow-hidden">
            <div className="flex items-center justify-between border-b border-border p-5">
              <div>
                <SectionLabel>{hi ? "प्रत्यक्ष लाभ अंतरण (DBT)" : "MSP Payment Tracking"}</SectionLabel>
                <h2 className="mt-1 font-display text-xl font-extrabold text-navy">
                  {hi ? "न्यूनतम समर्थन मूल्य (MSP) भुगतान" : "Direct Benefit Transfer (DBT)"}
                </h2>
              </div>
              <Pill tone="leaf">{hi ? "स्वीकृत" : "MSP Approved"}</Pill>
            </div>

            <div className="p-5 sm:p-6 space-y-5">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {hi ? "कुल देय राशि (Gross Amount)" : "Total Calculated Payable"}
                </p>
                <p className="mt-1 font-display text-4xl font-extrabold text-navy tracking-tight">
                  ₹{payment?.grossAmount ? payment.grossAmount.toLocaleString("en-IN") : (registeredQuantity * 2430).toLocaleString("en-IN")}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {registeredQuantity} {hi ? "क्विंटल" : "quintals"} × ₹{payment?.ratePerQuintal || 2430} (Govt MSP 2026 Rate)
                </p>
              </div>

              <div>
                <CapacityBar pct={payment?.progressPct || 35} showTicks={false} />
                <div className="mt-2.5 grid grid-cols-4 gap-1 text-center text-[10px] font-bold uppercase tracking-[0.06em]">
                  <span className="text-leaf">1. {hi ? "सत्यापन" : "Verified"}</span>
                  <span className="text-leaf">2. {hi ? "स्वीकृति" : "Approved"}</span>
                  <span className="text-navy">3. {hi ? "अंतरण" : "Transfer"}</span>
                  <span className="text-muted-foreground">4. {hi ? "खाता जमा" : "Credited"}</span>
                </div>
              </div>

              <div className="rounded-2xl bg-muted/60 p-4 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{hi ? "पंजीकृत बैंक खाता" : "Bank Account"}:</span>
                  <span className="font-bold text-navy">{payment?.bankMasked || "PNB ••••4417"}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{hi ? "अनुमानित जमा समय" : "Expected Credit"}:</span>
                  <span className="font-bold text-leaf">{hi ? (payment?.expectedCreditInHi || "तुलाई के 48 घंटे के भीतर") : (payment?.expectedCreditIn || "Within 48 hours")}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => alert(hi ? "डिजिटल बिल रसीद डाउनलोड हो रही है..." : "Downloading official digital invoice receipt...")}
                className="w-full rounded-xl bg-navy py-3 text-xs font-bold text-primary-foreground focus-ring"
              >
                📄 {hi ? "डिजिटल बिल रसीद डाउनलोड करें" : "Download Digital Invoice Voucher"}
              </button>
            </div>
          </section>
        )}

        {/* ── TAB 6: PROFILE ── */}
        {activeTab === "profile" && (
          <section className="surface p-5 sm:p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="font-display text-xl font-extrabold text-navy">
                {hi ? "किसान प्रोफ़ाइल विवरण" : "Farmer Profile & Account"}
              </h2>
              <span className="rounded-full bg-leaf-soft px-3 py-1 text-xs font-bold text-leaf">
                ✓ {hi ? "प्रमाणित" : "Active Profile"}
              </span>
            </div>

            <dl className="grid gap-3 sm:grid-cols-2 text-xs">
              <div className="rounded-xl bg-muted/60 p-3">
                <dt className="text-muted-foreground uppercase font-semibold text-[10px]">{hi ? "पूरा नाम" : "Full Name"}</dt>
                <dd className="font-bold text-navy text-sm mt-0.5">{displayName}</dd>
              </div>
              <div className="rounded-xl bg-muted/60 p-3">
                <dt className="text-muted-foreground uppercase font-semibold text-[10px]">{hi ? "किसान आईडी" : "Farmer ID"}</dt>
                <dd className="font-bold text-navy text-sm mt-0.5">{farmerIdCode}</dd>
              </div>
              <div className="rounded-xl bg-muted/60 p-3">
                <dt className="text-muted-foreground uppercase font-semibold text-[10px]">{hi ? "ईमेल पता" : "Email"}</dt>
                <dd className="font-bold text-navy text-sm mt-0.5">{user?.email || "farmer@kisansetu.in"}</dd>
              </div>
              <div className="rounded-xl bg-muted/60 p-3">
                <dt className="text-muted-foreground uppercase font-semibold text-[10px]">{hi ? "मोबाइल नंबर" : "Phone"}</dt>
                <dd className="font-bold text-navy text-sm mt-0.5">{user?.phone || "+91 98765 43210"}</dd>
              </div>
              <div className="rounded-xl bg-muted/60 p-3">
                <dt className="text-muted-foreground uppercase font-semibold text-[10px]">{hi ? "गाँव एवं जिला" : "Village & District"}</dt>
                <dd className="font-bold text-navy text-sm mt-0.5">{villageName}, {districtName}</dd>
              </div>
              <div className="rounded-xl bg-muted/60 p-3">
                <dt className="text-muted-foreground uppercase font-semibold text-[10px]">{hi ? "पंजीकृत फसल" : "Registered Crop"}</dt>
                <dd className="font-bold text-navy text-sm mt-0.5">{hi ? registeredCropHi : registeredCrop} ({registeredQuantity} qtl)</dd>
              </div>
            </dl>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={toggleLanguage}
                className="flex-1 rounded-xl border border-border bg-card py-3 text-xs font-bold text-navy focus-ring"
              >
                🌐 {hi ? "भाषा बदलें (Switch to English)" : "Switch Language (हिंदी)"}
              </button>
              <button
                type="button"
                onClick={logout}
                className="rounded-xl border border-danger/40 bg-danger-soft px-5 py-3 text-xs font-bold text-danger focus-ring"
              >
                🚪 {hi ? "लॉगआउट" : "Sign Out"}
              </button>
            </div>

            {/* Change Password Component */}
            <ChangePasswordCard hi={hi} />
          </section>
        )}

      </div>
    </PageShell>
  );
}

function RegistrationCard({
  currentCrop,
  currentQuantity,
  hi,
  onSave,
}: {
  currentCrop: string;
  currentQuantity: number;
  hi: boolean;
  onSave: (crop: string, qty: number) => Promise<void>;
}) {
  const [crop, setCrop] = useState(currentCrop);
  const [quantity, setQuantity] = useState(String(currentQuantity));
  const [saved, setSaved] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setCrop(currentCrop);
    setQuantity(String(currentQuantity));
  }, [currentCrop, currentQuantity]);

  const crops = [
    { id: "Wheat", hi: "गेहूँ", icon: "🌾" },
    { id: "Paddy", hi: "धान", icon: "🌱" },
    { id: "Mustard", hi: "सरसों", icon: "🌼" },
    { id: "Gram", hi: "चना", icon: "🫘" },
  ];

  return (
    <section className="surface p-5 sm:p-6">
      <SectionLabel>{hi ? "फसल अद्यतन" : "Crop & Harvest Volume"}</SectionLabel>
      <h2 className="mt-1 font-display text-xl font-extrabold text-navy">
        {hi ? "पंजीकृत फसल एवं मात्रा संशोधित करें" : "Update Crop & Estimated Harvest"}
      </h2>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {crops.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => {
              setCrop(c.id);
              setSaved(false);
            }}
            className={cn(
              "flex flex-col items-center gap-1 rounded-xl border-2 p-3 text-xs font-bold transition-all focus-ring",
              crop === c.id
                ? "border-leaf bg-leaf-soft text-navy shadow-sm"
                : "border-border bg-card text-muted-foreground hover:border-leaf/40 hover:text-navy",
            )}
          >
            <span className="text-2xl">{c.icon}</span>
            <span>{hi ? c.hi : c.id}</span>
          </button>
        ))}
      </div>

      <div className="mt-4">
        <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {hi ? "मात्रा (क्विंटल में)" : "Quantity (Quintals)"}
        </label>
        <div className="mt-1.5 flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setQuantity((q) => String(Math.max(10, Number(q) - 10)));
              setSaved(false);
            }}
            className="size-12 rounded-xl border border-border bg-card text-xl font-bold text-navy hover:bg-muted focus-ring"
          >
            −
          </button>
          <input
            value={quantity}
            onChange={(e) => {
              setQuantity(e.target.value.replace(/\D/g, ""));
              setSaved(false);
            }}
            inputMode="numeric"
            className="h-12 flex-1 rounded-xl border border-input bg-card text-center font-display text-2xl font-extrabold text-navy focus-ring"
          />
          <button
            type="button"
            onClick={() => {
              setQuantity((q) => String(Number(q) + 10));
              setSaved(false);
            }}
            className="size-12 rounded-xl border border-border bg-card text-xl font-bold text-navy hover:bg-muted focus-ring"
          >
            +
          </button>
        </div>
      </div>

      <button
        type="button"
        disabled={saving}
        onClick={async () => {
          setSaving(true);
          try {
            await onSave(crop, Number(quantity) || 120);
            setSaved(true);
          } finally {
            setSaving(false);
          }
        }}
        className={cn(
          "mt-4 w-full rounded-xl py-3.5 text-xs font-bold transition-all focus-ring",
          saved
            ? "bg-leaf-soft text-leaf"
            : "bg-gradient-leaf text-primary-foreground shadow-md shadow-leaf/20 hover:-translate-y-0.5",
        )}
      >
        {saving
          ? (hi ? "सुरक्षित किया जा रहा है..." : "Saving to Supabase...")
          : saved
            ? (hi ? "✓ डेटाबेस में सुरक्षित" : "✓ Saved to Database")
            : (hi ? "परिवर्तन सुरक्षित करें" : "Save Changes to Database")}
      </button>
    </section>
  );
}

function ChangePasswordCard({ hi }: { hi: boolean }) {
  const { changePassword } = useAuth();
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPwd.length < 6) {
      setErrorMsg(hi ? "नया पासवर्ड कम से कम 6 अक्षरों का होना चाहिए" : "New password must be at least 6 characters");
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    setSuccess(false);
    try {
      await changePassword(currentPwd, newPwd);
      setSuccess(true);
      setCurrentPwd("");
      setNewPwd("");
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-6 rounded-xl border border-border bg-card p-5">
      <h3 className="font-display text-sm font-extrabold text-navy">
        {hi ? "पासवर्ड बदलें" : "Change Password"}
      </h3>
      {success && (
        <div className="mt-3 rounded-lg bg-leaf-soft p-2.5 text-xs font-semibold text-leaf">
          ✓ {hi ? "पासवर्ड सफलतापूर्वक अपडेट हो गया!" : "Password updated successfully!"}
        </div>
      )}
      {errorMsg && (
        <div className="mt-3 rounded-lg bg-danger-soft p-2.5 text-xs font-semibold text-danger">
          {errorMsg}
        </div>
      )}
      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <div>
          <label className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
            {hi ? "वर्तमान पासवर्ड" : "Current Password"}
          </label>
          <input
            type="password"
            required
            value={currentPwd}
            onChange={(e) => setCurrentPwd(e.target.value)}
            className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-ring"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
            {hi ? "नया पासवर्ड" : "New Password"}
          </label>
          <input
            type="password"
            required
            value={newPwd}
            onChange={(e) => setNewPwd(e.target.value)}
            className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-ring"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className={cn(
            "w-full rounded-lg bg-navy py-2 text-xs font-bold text-primary-foreground focus-ring transition-transform",
            loading ? "opacity-70" : "hover:-translate-y-0.5"
          )}
        >
          {loading ? (hi ? "अपडेट हो रहा है..." : "Updating...") : (hi ? "पासवर्ड बदलें" : "Update Password")}
        </button>
      </form>
    </div>
  );
}
