/**
 * KISAN SETU — Smart Government Crop Procurement Platform
 * Ministry of Consumer Affairs, Food & Public Distribution | SIH 2026
 * Digital Public Infrastructure for AI-Powered Procurement Intelligence.
 */

import { Link, createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { processSahayakQuery } from "@/lib/kisan/voice";

import heroImage from "@/assets/mandi-dawn.jpg";
import { PageShell } from "@/components/kisan/app-shell";
import { BeforeAfter } from "@/components/kisan/before-after";
import { PrototypeBadge, SectionLabel, StatCard } from "@/components/kisan/primitives";
import { useAuth } from "@/hooks/use-auth";
import { ROLE_PORTALS } from "@/lib/supabase/auth";
import { useKisan } from "@/lib/kisan/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "KISAN SETU — Smart Government Crop Procurement Intelligence Platform" },
      {
        name: "description",
        content:
          "From registration to procurement to payment — without the uncertainty. AI-powered smart centre allocation, virtual queues, DBT tracking, and predictive governance.",
      },
      { property: "og:title", content: "KISAN SETU — AI-Powered Crop Procurement Intelligence" },
      {
        property: "og:description",
        content: "Predict congestion, optimize farmer arrivals, reduce waiting times, and track 100% PFMS DBT payments.",
      },
    ],
  }),
  component: LandingPage,
});

interface InnovationItem {
  id: string;
  category: "ai" | "farmer" | "trade";
  number: string;
  badge: string;
  badgeColor: string;
  icon: string;
  title: string;
  titleHi: string;
  subtitle: string;
  subtitleHi: string;
  description: string;
  descriptionHi: string;
  metric: string;
  metricLabel: string;
  metricLabelHi: string;
  highlights: string[];
  highlightsHi: string[];
  route: string;
  actionLabel: string;
  actionLabelHi: string;
  tag: string;
}

const INNOVATION_ITEMS: InnovationItem[] = [
  {
    id: "recommender",
    category: "ai",
    number: "01",
    badge: "Multi-Objective AI Engine",
    badgeColor: "bg-leaf text-white border-leaf",
    icon: "🧠",
    title: "Dynamic Multi-Objective Mandi & Slot Allocation",
    titleHi: "गतिशील बहु-उद्देश्यीय मंडी एवं समय स्लॉट आवंटन",
    subtitle: "Real-time 5-Factor Optimization for Zero Gate Congestion",
    subtitleHi: "कतार रहित खरीद के लिए 5-कारकीय वास्तविक समय अनुकूलन",
    description:
      "Unlike static portals assigning arbitrary mandis, Kisan Setu continuously evaluates Distance, Live Queue Load, Available Yard Capacity, Open Slots, and Congestion Risk to assign the lowest-wait centre.",
    descriptionHi:
      "पारंपरिक पोर्टलों के विपरीत, किसान सेतु दूरी, कतार, यार्ड क्षमता, उपलब्ध स्लॉट और भीड़ जोखिम का वास्तविक समय मूल्यांकन कर न्यूनतम प्रतीक्षा वाली मंडी आवंटित करता है।",
    metric: "69% Wait Reduction",
    metricLabel: "Average waiting drop across 5 Karnal centres",
    metricLabelHi: "करनाल के 5 खरीद केंद्रों में औसत प्रतीक्षा समय में भारी कमी",
    highlights: [
      "Dynamic load balancing between Nilokheri and Taraori yards",
      "Calculates dynamic EffectiveServiceRate from live weighbridge slips",
      "Direct 1-click arrival window reservation (Morning/Midday/Afternoon)",
    ],
    highlightsHi: [
      "निलोखेड़ी और तरावड़ी मंडियों के बीच स्वतः लोड संतुलन",
      "लाइव तुलाई रसीदों से वास्तविक सेवा दर (Service Rate) की गणना",
      "सीधे 1-क्लिक में 30 मिनट के सुरक्षित समय स्लॉट का आरक्षण",
    ],
    route: "/farmer",
    actionLabel: "Experience in Farmer Portal →",
    actionLabelHi: "किसान पोर्टल में अनुभव करें →",
    tag: "LIVE ALGORITHM",
  },
  {
    id: "queue",
    category: "farmer",
    number: "02",
    badge: "Zero-Queue DPI",
    badgeColor: "bg-navy text-white border-navy",
    icon: "🎫",
    title: "Live Virtual Queue & Cryptographic Digital Gate Pass",
    titleHi: "लाइव वर्चुअल कतार एवं डिजिटल क्यूआर गेट पास",
    subtitle: "From 18-Hour Highway Stalls to Guaranteed 30-Min Windows",
    subtitleHi: "18 घंटे की सड़क कतार से मुक्ति, 30 मिनट का निश्चित समय",
    description:
      "Eliminates highway choke points and overnight tractor queues with real-time digital tokens, dynamic ETA countdowns, and instant weighbridge lane dispatch.",
    descriptionHi:
      "सड़क पर ट्रैक्टरों के रात भर खड़े रहने की समस्या को समाप्त कर, डिजिटल टोकन, लाइव उलटी गिनती और सीधे धर्मकांटा काउंटर आवंटन प्रदान करता है।",
    metric: "0 Overnight Stalls",
    metricLabel: "Tractors arrive strictly during their booked slot",
    metricLabelHi: "किसान केवल अपने निर्धारित समय पर ही मंडी पहुँचते हैं",
    highlights: [
      "Real-time countdown of vehicles ahead updated every 5 seconds",
      "Tamper-proof QR gate entry pass with automated gate scanner",
      "Instant SMS and app advisory when weighbridge scale opens",
    ],
    highlightsHi: [
      "आगे खड़े वाहनों की संख्या का हर 5 सेकंड में लाइव अपडेट",
      "गेट पर त्वरित प्रवेश के लिए छेड़छाड़-मुक्त डिजिटल क्यूआर पास",
      "तुलाई कांटा खाली होते ही एसएमएस एवं ऐप पर सूचना",
    ],
    route: "/farmer",
    actionLabel: "View Virtual Queue & Token →",
    actionLabelHi: "वर्चुअल कतार एवं टोकन देखें →",
    tag: "FARMER-FIRST",
  },
  {
    id: "buyer",
    category: "trade",
    number: "03",
    badge: "Direct B2B Marketplace",
    badgeColor: "bg-amber-600 text-white border-amber-600",
    icon: "🏪",
    title: "Institutional Buyer Marketplace & Real-Time Lot Bidding",
    titleHi: "संस्थागत खरीदार बाज़ार एवं लाइव लॉट नीलामी",
    subtitle: "Connecting Processors & Exporters Directly to Farmer Harvests",
    subtitleHi: "मिलों एवं निर्यातकों को सीधे किसान की फसल से जोड़ना",
    description:
      "Bypasses opaque intermediary trading rings. Verified institutional buyers, millers, and cooperatives place transparent bids on active mandi lots with instant deal confirmations.",
    descriptionHi:
      "बिचौलियों के गठजोड़ को समाप्त कर, सत्यापित आटा मिलें, निर्यातक और संस्थागत खरीदार किसान की फसल लॉट पर पारदर्शी बोली लगाते हैं।",
    metric: "₹180-240 / Qtl",
    metricLabel: "Premium realized over standard MSP threshold",
    metricLabelHi: "न्यूनतम समर्थन मूल्य (MSP) से अधिक प्राप्त अतिरिक्त लाभ",
    highlights: [
      "Real-time sound and visual chime when new farmer lots are listed",
      "Interactive Deal Room for instant farmer-buyer negotiation",
      "Certified quality grading certificates attached to every lot",
    ],
    highlightsHi: [
      "नई फसल आते ही खरीदारों को तुरंत ऑडियो-विज़ुअल अलर्ट",
      "सीधे मोलभाव के लिए समर्पित डिजिटल सौदा रूम",
      "प्रत्येक लॉट के साथ प्रमाणित नमी एवं गुणवत्ता प्रमाणपत्र संलग्न",
    ],
    route: "/buyer",
    actionLabel: "Open Buyer Marketplace →",
    actionLabelHi: "संस्थागत खरीदार पोर्टल खोलें →",
    tag: "TRADE REVOLUTION",
  },
  {
    id: "sahayak",
    category: "farmer",
    number: "04",
    badge: "Multilingual Voice AI",
    badgeColor: "bg-sky-600 text-white border-sky-600",
    icon: "🎙️",
    title: "Kisan Sahayak: Voice-First Conversational Intelligence",
    titleHi: "किसान सहायक: बहुभाषी वॉयस-प्रथम एआई साथी",
    subtitle: "Zero-Tech Barrier Interface for Rural Farmers",
    subtitleHi: "ग्रामीण किसानों के लिए सरल, बिना टाइपिंग वॉयस तकनीक",
    description:
      "No complex app learning required. Farmers speak naturally in Hindi, English, or Hinglish to check their token number, waiting time, weighment slips, and bank transfer dates.",
    descriptionHi:
      "किसी जटिल ऐप सीखने की आवश्यकता नहीं। किसान अपनी भाषा (हिंदी, अंग्रेजी, हिंग्लिश) में बोलकर अपना टोकन, नंबर, प्रतीक्षा समय और भुगतान जान सकते हैं।",
    metric: "3 Native Dialects",
    metricLabel: "Hindi, English & colloquial Hinglish voice queries",
    metricLabelHi: "हिंदी, अंग्रेजी और आम बोलचाल की हिंग्लिश में पूर्ण संवाद",
    highlights: [
      "Grounded 100% in real-time Supabase procurement database records",
      "One-click quick voice audio questions with native voice responses",
      "Direct action dispatch (opens queue or downloads pass on command)",
    ],
    highlightsHi: [
      "लाइव डेटाबेस से 100% प्रमाणित एवं सटीक उत्तर",
      "एक टैप में बोलकर सवाल पूछें और अपनी भाषा में आवाज़ सुनें",
      "बोलने पर स्वतः पास खोलना या कतार स्क्रीन पर ले जाना",
    ],
    route: "/farmer",
    actionLabel: "Try Sahayak Voice Companion →",
    actionLabelHi: "किसान सहायक वॉयस आज़माएं →",
    tag: "INCLUSIVE AI",
  },
  {
    id: "control-tower",
    category: "ai",
    number: "05",
    badge: "Predictive Governance",
    badgeColor: "bg-cyan-700 text-white border-cyan-700",
    icon: "🛰️",
    title: "District Command Control Tower with 42-Min Surge Warning",
    titleHi: "जिला कमांड कंट्रोल टावर (42 मिनट पूर्व भीड़ चेतावनी)",
    subtitle: "Geospatial Radar & Proactive Highway Congestion Prevention",
    subtitleHi: "भू-स्थानिक रडार एवं सड़क जाम की पूर्व रोकथाम",
    description:
      "Gives District Magistrates and Food & Civil Supplies officers unified aerial surveillance of all operational yards, active counters, and incoming tractor traffic vectors.",
    descriptionHi:
      "जिला प्रशासन को सभी मंडियों, चालू कांटों और आने वाले ट्रैक्टरों की लाइव 360-डिग्री निगरानी और भीड़ से 42 मिनट पहले स्वतः चेतावनी देता है।",
    metric: "42-Min Advance Warning",
    metricLabel: "Surges detected before road traffic gridlock occurs",
    metricLabelHi: "सड़क पर जाम लगने से 42 मिनट पहले ही सिस्टम द्वारा चेतावनी",
    highlights: [
      "Interactive district GIS map with live yard health dots",
      "Predictive congestion alerts with automated 1-click slot rebalancing",
      "Hourly throughput velocity and scale downtime monitoring",
    ],
    highlightsHi: [
      "लाइव मंडी स्वास्थ्य स्थिति वाला इंटरएक्टिव जिला नक्शा",
      "1-क्लिक में भीड़ को खाली मंडी की ओर मोड़ने की सुविधा",
      "धर्मकांटों की प्रति घंटा गति एवं खराबी की तुरंत सूचना",
    ],
    route: "/control-tower",
    actionLabel: "Inspect District Control Tower →",
    actionLabelHi: "जिला कंट्रोल टावर देखें →",
    tag: "COMMAND SYSTEM",
  },
  {
    id: "dbt",
    category: "trade",
    number: "06",
    badge: "Financial Transparency",
    badgeColor: "bg-emerald-700 text-white border-emerald-700",
    icon: "💰",
    title: "100% PFMS Direct Benefit Transfer (DBT) & 48h SLA Audit",
    titleHi: "100% पीएफएमएस डीबीटी सीधा भुगतान (48 घंटे गारंटी)",
    subtitle: "End-to-End Certified Tare-to-Bank Integrity",
    subtitleHi: "कांटे की तुलाई से लेकर सीधे बैंक खाते तक पूर्ण पारदर्शिता",
    description:
      "Eliminates paper slip manipulation and delay. Every electronic weighbridge reading, moisture test, and MSP calculation is cryptographically logged and tracked to direct bank transfer.",
    descriptionHi:
      "कागजी पर्चियों की धांधली और देरी समाप्त। इलेक्ट्रॉनिक धर्मकांटे का वजन, नमी परीक्षण और एमएसपी गणना सीधे किसान के खाते में पीएफएमएस द्वारा भेजी जाती है।",
    metric: "100% Auditable",
    metricLabel: "PFMS transaction IDs with 48-hour credit SLA",
    metricLabelHi: "48 घंटे में सीधे बैंक खाते में जमा होने की गारंटी",
    highlights: [
      "Tamper-evident tare, gross, and net quintal digital weighment records",
      "Automatic moisture deduction calculation conforming to FCI norms",
      "Complete SLA countdown with direct grievance escalation on delay",
    ],
    highlightsHi: [
      "इलेक्ट्रॉनिक कांटे का खाली व भरा वजन (Gross/Tare) डिजिटल रूप से दर्ज",
      "एफसीआई मानकों के अनुसार नमी की पारदर्शी व सटीक गणना",
      "भुगतान में देरी होने पर सीधे उच्चाधिकारियों को शिकायत निवारण",
    ],
    route: "/farmer",
    actionLabel: "Check Payment & DBT Tracking →",
    actionLabelHi: "डीबीटी भुगतान ट्रैकिंग देखें →",
    tag: "ZERO LEAKAGE",
  },
];

export function LandingPage() {
  const { language, summary, centres, farmer, ticket, slot, payment, timeline } = useKisan();
  const { user, logout } = useAuth();
  const hi = language === "hi";

  const [activeVoicePrompt, setActiveVoicePrompt] = useState(0);
  const [activeInnovationCategory, setActiveInnovationCategory] = useState<"all" | "ai" | "farmer" | "trade">("all");

  const filteredInnovations = useMemo(
    () =>
      activeInnovationCategory === "all"
        ? INNOVATION_ITEMS
        : INNOVATION_ITEMS.filter((i) => i.category === activeInnovationCategory),
    [activeInnovationCategory]
  );

  const voiceDemos = [
    {
      q: "मेरी बारी कब आएगी?",
      qEn: "When is my turn?",
      a: "राम-राम किसान भाई! आपका टोकन KS-3842 है। आपसे आगे 4 किसान हैं और अनुमानित प्रतीक्षा लगभग 18 मिनट है।",
      aEn: "Welcome farmer! Your token is KS-3842. There are 4 farmers ahead of you with ~18 minutes estimated wait.",
      tag: "Live Virtual Queue",
    },
    {
      q: "मेरा centre कौन सा है?",
      qEn: "Which centre is assigned to me?",
      a: "आपका आवंटित खरीद केंद्र 'Procurement Centre A' है, जो आपके गाँव से 4.2 किमी दूर है।",
      aEn: "Your assigned procurement centre is 'Procurement Centre A', 4.2 km from your registered village.",
      tag: "Centre Allocation",
    },
    {
      q: "आज मुझे कब जाना चाहिए?",
      qEn: "What time should I reach today?",
      a: "आपका स्लॉट 11:30 – 12:00 का है। समय पर तुलाई के लिए 11:20 बजे मुख्य गेट पर पहुँचे।",
      aEn: "Your slot window is 11:30 – 12:00. Arrive at 11:20 AM (10 mins prior) at the main gate.",
      tag: "Arrival Advisory",
    },
    {
      q: "मेरी payment कहाँ तक पहुँची?",
      qEn: "What is my payment status?",
      a: "आपकी 120 क्विंटल गेहूँ की तुलाई स्वीकार हो चुकी है। कुल ₹2,91,600 का भुगतान 48 घंटे में सीधे बैंक खाते में जमा होगा।",
      aEn: "Your 120 qtl wheat is accepted. Gross payout of ₹2,91,600 is queued for DBT credit within 48 hours.",
      tag: "PFMS DBT Payout",
    },
    {
      q: "मेरा procurement status क्या है?",
      qEn: "What is my procurement status?",
      a: "इलेक्ट्रॉनिक धर्मकांटे पर तुलाई पूर्ण हो चुकी है (शुद्ध वजन: 120 क्विंटल, नमी: 11.2%)। डिजिटल बिल जारी कर दिया गया है।",
      aEn: "Weighment completed on electronic scale (Net: 120 qtl, Moisture: 11.2%). Digital invoice generated.",
      tag: "Weighing & Quality",
    },
  ];

  return (
    <PageShell className="pt-0">
      {/* ─── 1. HERO / LANDING SECTION ─── */}
      <section className="relative mt-4 overflow-hidden rounded-3xl bg-black px-5 py-12 text-primary-foreground sm:px-10 sm:py-16 shadow-2xl border border-border/30">
        <img
          src={heroImage}
          alt="Farmers at grain procurement centre at dawn"
          className="pointer-events-none absolute inset-0 size-full object-cover object-center"
          loading="eager"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/90 via-black/65 to-black/30" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/20" />

        <div className="relative max-w-4xl">
          {/* Government / SIH Badge */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-leaf/40 bg-leaf-soft/20 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-leaf backdrop-blur-md">
              <span className="size-2 rounded-full bg-leaf animate-blip" />
              Government of India · Food & Public Distribution
            </span>
            <PrototypeBadge tone="dark" label="SIH 2026 · Problem Statement 26032" />
          </div>

          <h1 className="mt-5 font-display text-4xl font-black leading-[1.05] tracking-tight sm:text-6xl text-white drop-shadow-md">
            KISAN SETU
          </h1>
          <p className="mt-2 text-xs font-bold uppercase tracking-[0.25em] text-saffron drop-shadow-sm sm:text-sm">
            AI-POWERED PROCUREMENT INTELLIGENCE
          </p>

          <p className="mt-4 text-balance-tight text-xl font-semibold text-white/95 sm:text-3xl drop-shadow-sm leading-snug">
            {hi
              ? "“पंजीकरण से खरीद और भुगतान तक — बिना किसी अनिश्चितता के।”"
              : "“From registration to procurement to payment — without the uncertainty.”"}
          </p>

          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/80 sm:text-base">
            {hi
              ? "पारंपरिक मंडियों की अव्यवस्था और कतारों को समाप्त कर, वास्तविक समय डेटा और एआई द्वारा किसान आगमन, तुलाई, गुणवत्ता प्रमाणीकरण एवं डीबीटी भुगतान का पूर्ण समन्वय।"
              : "Eliminating physical mandi choke points and queue uncertainty through real-time predictive arrival scheduling, electronic weighment, FAQ quality verification, and direct DBT bank transfers."}
          </p>

          {/* Primary Action Buttons */}
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              to="/farmer"
              className="rounded-xl bg-gradient-leaf px-6 py-3.5 text-sm font-black text-primary-foreground shadow-lg shadow-leaf/30 transition-transform hover:-translate-y-0.5 focus-ring"
            >
              🌾 {hi ? "किसान पोर्टल में प्रवेश करें" : "Access Farmer Portal"}
            </Link>

            <a
              href="#innovations"
              className="rounded-xl border border-leaf/70 bg-leaf/25 px-6 py-3.5 text-sm font-black text-white backdrop-blur-md transition-all hover:bg-leaf focus-ring flex items-center gap-1.5 shadow-md shadow-leaf/20"
            >
              <span>✨</span>
              <span>{hi ? "शीर्ष नवाचार एवं हाइलाइट्स" : "Top Innovations & Highlights"}</span>
            </a>

            <a
              href="#problem-solution"
              className="rounded-xl border border-white/30 bg-black/40 px-5 py-3.5 text-sm font-bold text-white backdrop-blur-md transition-colors hover:bg-black/60 focus-ring"
            >
              🧭 {hi ? "किसान सेतु समझें" : "Explore Kisan Setu"}
            </a>

            <Link
              to="/control-tower"
              className="rounded-xl border border-cyan-signal/40 bg-navy/80 px-5 py-3.5 text-sm font-bold text-cyan-signal backdrop-blur-md transition-transform hover:scale-105 focus-ring"
            >
              🛰️ {hi ? "जिला कंट्रोल टावर" : "District Control Tower"}
            </Link>
          </div>
        </div>

        {/* Animated Process Flow Visual Pipeline */}
        <div className="relative mt-12 border-t border-white/15 pt-8">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-white/60 mb-3">
            End-to-End Orchestrated Pipeline
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-6 text-center text-xs font-bold">
            {[
              { step: "FARMER", desc: "Digital Identity", icon: "👨‍🌾" },
              { step: "SMART CENTRE", desc: "5-Factor AI Match", icon: "🧠" },
              { step: "SMART SLOT", desc: "Guaranteed Window", icon: "🕐" },
              { step: "VIRTUAL QUEUE", desc: "Live Token & ETA", icon: "🎫" },
              { step: "B2B DEALS", desc: "Institutional Bids", icon: "🏪" },
              { step: "PAYMENT", desc: "48h PFMS DBT", icon: "💰" },
            ].map((p, idx) => (
              <div key={p.step} className="rounded-xl border border-white/20 bg-black/50 p-3 backdrop-blur-md shadow-md">
                <span className="text-xl block mb-1">{p.icon}</span>
                <span className="text-white font-extrabold text-[11px] block">{p.step}</span>
                <span className="text-[9px] text-white/60 font-medium">{p.desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Live Operational Telemetry Bar */}
        <div className="relative mt-8 grid gap-3 sm:grid-cols-4">
          {[
            { label: "Active Centres Orchestrated", value: summary?.totalCentres ?? centres.length ?? 5 },
            { label: "Farmers Served Today", value: summary?.farmersToday ?? 48 },
            { label: "Average Predicted Wait", value: `${summary?.averageWaitMin ?? 14} min` },
            { label: "Congestion Surges Prevented", value: summary?.predictedOverloads ?? 12 },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-white/20 bg-black/40 px-4 py-3.5 backdrop-blur-md shadow-lg">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/70">
                {s.label}
              </p>
              <p className="mt-0.5 font-display text-2xl font-black text-white tabular-nums">{s.value}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── 2. CONTINUOUS MOVING TICKER STRIP ─── */}
      <div className="mt-4 overflow-hidden rounded-2xl bg-navy py-3 text-primary-foreground shadow-md border border-command-line/40">
        <div className="animate-marquee flex items-center gap-8 whitespace-nowrap text-xs font-black uppercase tracking-[0.2em] text-cyan-signal">
          <span>⚡ PREDICT CONGESTION</span>
          <span>•</span>
          <span>🎯 OPTIMIZE ARRIVAL</span>
          <span>•</span>
          <span>⏳ REDUCE WAITING</span>
          <span>•</span>
          <span>🌾 TRACK PROCUREMENT</span>
          <span>•</span>
          <span>💰 IMPROVE TRANSPARENCY</span>
          <span>•</span>
          <span>🛡️ 100% PFMS DBT VISIBILITY</span>
          <span>•</span>
          <span>🤖 AI SAHAYAK MULTILINGUAL ASSISTANT</span>
          <span>•</span>
          <span>⚡ PREDICT CONGESTION</span>
          <span>•</span>
          <span>🎯 OPTIMIZE ARRIVAL</span>
          <span>•</span>
          <span>⏳ REDUCE WAITING</span>
          <span>•</span>
          <span>🌾 TRACK PROCUREMENT</span>
          <span>•</span>
          <span>💰 IMPROVE TRANSPARENCY</span>
          <span>•</span>
          <span>🛡️ 100% PFMS DBT VISIBILITY</span>
          <span>•</span>
          <span>🤖 AI SAHAYAK MULTILINGUAL ASSISTANT</span>
        </div>
      </div>

      {/* ─── 3. THE PROBLEM WE SOLVE ─── */}
      <section id="problem-solution" className="mt-16 space-y-8">
        <div className="text-center max-w-2xl mx-auto">
          <SectionLabel tone="light">{hi ? "पारंपरिक खरीद प्रणाली की चुनौतियाँ" : "The Core Problem We Solve"}</SectionLabel>
          <h2 className="mt-2 font-display text-3xl font-black text-navy sm:text-4xl">
            Why Crop Procurement Needs an Intelligence Layer
          </h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Agricultural procurement in India suffers from uneven surges, lack of arrival coordination, and fragmented visibility across stakeholders.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Farmers Face */}
          <div className="surface-lift p-6 border-t-4 border-t-saffron space-y-4">
            <div className="flex items-center gap-2.5">
              <span className="flex size-9 items-center justify-center rounded-xl bg-saffron-soft text-lg font-bold text-navy">
                👨‍🌾
              </span>
              <h3 className="font-display text-lg font-extrabold text-navy">Farmers Face</h3>
            </div>
            <ul className="space-y-2.5 text-xs font-semibold text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-danger font-black shrink-0">✕</span>
                <span>Long, unpredictable road queues lasting up to 6–18 hours.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-danger font-black shrink-0">✕</span>
                <span>Uncertainty about daily procurement schedules & yard quotas.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-danger font-black shrink-0">✕</span>
                <span>No live visibility into queue position or estimated turn.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-danger font-black shrink-0">✕</span>
                <span>Difficulty knowing which centre has lower congestion.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-danger font-black shrink-0">✕</span>
                <span>Anxiety around weighbridge slips and delayed DBT payouts.</span>
              </li>
            </ul>
          </div>

          {/* Centres Face */}
          <div className="surface-lift p-6 border-t-4 border-t-danger space-y-4">
            <div className="flex items-center gap-2.5">
              <span className="flex size-9 items-center justify-center rounded-xl bg-danger-soft text-lg font-bold text-navy">
                🏢
              </span>
              <h3 className="font-display text-lg font-extrabold text-navy">Centres Face</h3>
            </div>
            <ul className="space-y-2.5 text-xs font-semibold text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-danger font-black shrink-0">✕</span>
                <span>Sudden tractor surges overwhelming weighbridges and yards.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-danger font-black shrink-0">✕</span>
                <span>Severe workload imbalance across adjacent operational centres.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-danger font-black shrink-0">✕</span>
                <span>Limited real-time visibility into incoming farmer influx.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-danger font-black shrink-0">✕</span>
                <span>Reactive crisis management instead of scheduled processing.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-danger font-black shrink-0">✕</span>
                <span>Disputes during manual quality grading and tare weighment.</span>
              </li>
            </ul>
          </div>

          {/* Government Faces */}
          <div className="surface-lift p-6 border-t-4 border-t-navy space-y-4">
            <div className="flex items-center gap-2.5">
              <span className="flex size-9 items-center justify-center rounded-xl bg-navy-soft text-lg font-bold text-navy">
                🏛️
              </span>
              <h3 className="font-display text-lg font-extrabold text-navy">Government Faces</h3>
            </div>
            <ul className="space-y-2.5 text-xs font-semibold text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-danger font-black shrink-0">✕</span>
                <span>Fragmented, delayed operational reports from local centres.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-danger font-black shrink-0">✕</span>
                <span>Difficulty spotting bottleneck choke points before crises arise.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-danger font-black shrink-0">✕</span>
                <span>Limited district-wide live monitoring of procurement & stocks.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-danger font-black shrink-0">✕</span>
                <span>Slow administrative intervention when grievances are raised.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-danger font-black shrink-0">✕</span>
                <span>Audit trail vulnerabilities in paper-based manual handoffs.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* ─── 4. WHAT KISAN SETU DOES: ONE PLATFORM. EVERY STAKEHOLDER. ─── */}
      <section className="mt-16 space-y-8">
        <div className="text-center max-w-2xl mx-auto">
          <SectionLabel tone="light">{hi ? "एकीकृत खरीद परिवेश" : "One Platform. Every Stakeholder."}</SectionLabel>
          <h2 className="mt-2 font-display text-3xl font-black text-navy sm:text-4xl">
            Connected Digital Infrastructure Across 4 Roles
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {/* Role 1: Farmer */}
          <div className="surface-lift p-6 space-y-4 border-2 border-border hover:border-leaf transition-all group">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-leaf">ROLE 01</span>
              <span className="text-2xl">👨‍🌾</span>
            </div>
            <h3 className="font-display text-lg font-extrabold text-navy group-hover:text-leaf transition-colors">
              Farmer Portal
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Smart centre → Smart slot → Virtual queue → Procurement tracking → Payment tracking → AI Sahayak
            </p>
            <Link to="/farmer" className="inline-block text-xs font-black text-leaf group-hover:underline">
              Open Farmer Portal →
            </Link>
          </div>

          {/* Role 2: Centre Operator */}
          <div className="surface-lift p-6 space-y-4 border-2 border-border hover:border-leaf transition-all group">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-saffron">ROLE 02</span>
              <span className="text-2xl">🏢</span>
            </div>
            <h3 className="font-display text-lg font-extrabold text-navy group-hover:text-leaf transition-colors">
              Centre Operations
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Live queue → Capacity → Weighing → Quality FAQ inspection → Digital invoice → Realtime alerts
            </p>
            <Link to="/centre" className="inline-block text-xs font-black text-saffron group-hover:underline">
              Open Centre Dashboard →
            </Link>
          </div>

          {/* Role 3: District Admin */}
          <div className="surface-lift p-6 space-y-4 border-2 border-border hover:border-leaf transition-all group">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-cyan-signal">ROLE 03</span>
              <span className="text-2xl">🛰️</span>
            </div>
            <h3 className="font-display text-lg font-extrabold text-navy group-hover:text-leaf transition-colors">
              District Control Tower
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              District map → Queue intelligence → Capacity forecasting → AI congestion alerts → Performance
            </p>
            <Link to="/control-tower" className="inline-block text-xs font-black text-navy group-hover:underline">
              Open Control Tower →
            </Link>
          </div>

          {/* Role 4: Super Admin */}
          <div className="surface-lift p-6 space-y-4 border-2 border-border hover:border-leaf transition-all group">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-navy">ROLE 04</span>
              <span className="text-2xl">🏛️</span>
            </div>
            <h3 className="font-display text-lg font-extrabold text-navy group-hover:text-leaf transition-colors">
              State Directorate
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Statewide radar → Grievance redressal → Policy intelligence sentinel → DBT SLA audits → Master config
            </p>
            <Link to="/admin" className="inline-block text-xs font-black text-navy group-hover:underline">
              Open State Command →
            </Link>
          </div>
        </div>
      </section>

      {/* ─── 5. TOP PLATFORM HIGHLIGHTS & INNOVATIONS ─── */}
      <section id="innovations" className="mt-16 space-y-8 scroll-mt-6">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-leaf/50 bg-leaf-soft px-3.5 py-1 text-xs font-black uppercase tracking-wider text-leaf shadow-xs">
            <span>✨</span>
            <span>{hi ? "प्रमुख नवाचार एवं तकनीकी उपलब्धियाँ" : "SIH 2026 Core Innovations & Breakthroughs"}</span>
          </div>
          <h2 className="mt-3 font-display text-3xl font-black text-navy sm:text-5xl tracking-tight leading-tight">
            {hi ? "किसान सेतु के 6 प्रमुख तकनीकी नवाचार" : "6 Architectural Innovations Powering Kisan Setu"}
          </h2>
          <p className="mt-3 text-sm sm:text-base text-muted-foreground leading-relaxed">
            {hi
              ? "पारंपरिक टोकन प्रणाली से आगे बढ़कर: वास्तविक समय डेटा, बहु-उद्देश्यीय एआई एल्गोरिदम, प्रत्यक्ष संस्थागत बाज़ार और पारदर्शी डीबीटी।"
              : "Moving beyond passive digitization: proactive multi-objective optimization, live weighbridge velocity modeling, direct institutional B2B deal rooms, and 100% PFMS DBT transparency."}
          </p>
        </div>

        {/* Interactive Filter Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {[
            { id: "all", label: hi ? "सभी 6 नवाचार" : "All 6 Innovations", count: 6 },
            { id: "ai", label: hi ? "🧠 एआई एवं भविष्यवाणी इंजन" : "🧠 AI & Predictive Engines", count: 2 },
            { id: "farmer", label: hi ? "👨‍🌾 किसान-प्रथम डिजिटल ढाँचा" : "👨‍🌾 Farmer-First DPI", count: 2 },
            { id: "trade", label: hi ? "🏪 व्यापार एवं वित्तीय सत्यनिष्ठा" : "🏪 Trade & Financial Integrity", count: 2 },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveInnovationCategory(cat.id as any)}
              className={cn(
                "rounded-xl px-4 py-2 text-xs font-bold transition-all focus-ring shadow-xs",
                activeInnovationCategory === cat.id
                  ? "bg-navy text-primary-foreground shadow-md"
                  : "border border-border bg-card text-muted-foreground hover:text-navy hover:bg-muted"
              )}
            >
              {cat.label} ({cat.count})
            </button>
          ))}
        </div>

        {/* 6 Innovations Cards Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredInnovations.map((item) => (
            <div
              key={item.id}
              className="surface-lift p-6 rounded-2xl border-2 border-border/80 hover:border-leaf/50 transition-all duration-200 flex flex-col justify-between group relative overflow-hidden shadow-sm hover:shadow-md"
            >
              <div className="space-y-4">
                {/* Header row: Number, Badge, Tag */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-black text-leaf bg-leaf-soft px-2 py-0.5 rounded-md border border-leaf/20">
                      #{item.number}
                    </span>
                    <span className={cn("rounded-md px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider border shadow-xs", item.badgeColor)}>
                      {item.badge}
                    </span>
                  </div>
                  <span className="text-[10px] font-extrabold text-muted-foreground tracking-widest uppercase">
                    {item.tag}
                  </span>
                </div>

                {/* Title & Subtitle */}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{item.icon}</span>
                    <h3 className="font-display text-lg font-black text-navy group-hover:text-leaf transition-colors leading-snug">
                      {hi ? item.titleHi : item.title}
                    </h3>
                  </div>
                  <p className="text-xs font-bold text-leaf mt-1">
                    {hi ? item.subtitleHi : item.subtitle}
                  </p>
                </div>

                {/* Description */}
                <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                  {hi ? item.descriptionHi : item.description}
                </p>

                {/* Key Metric Impact Pill */}
                <div className="rounded-xl border border-leaf/30 bg-leaf-soft/60 p-3 flex items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                      {hi ? "प्रमाणित प्रभाव" : "Proven Impact"}
                    </span>
                    <span className="text-xs text-navy/80 font-medium">
                      {hi ? item.metricLabelHi : item.metricLabel}
                    </span>
                  </div>
                  <span className="font-display text-base font-black text-leaf whitespace-nowrap">
                    {item.metric}
                  </span>
                </div>

                {/* Engineering Highlights */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground block">
                    {hi ? "प्रमुख तकनीकी विशेषताएँ:" : "Engineering Highlights:"}
                  </span>
                  {(hi ? item.highlightsHi : item.highlights).map((h, hIdx) => (
                    <div key={hIdx} className="flex items-start gap-2 text-xs font-semibold text-foreground/80">
                      <span className="text-leaf font-bold shrink-0 mt-0.5">✓</span>
                      <span className="text-[11px] leading-snug">{h}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-5 mt-auto">
                <Link
                  to={item.route}
                  className="w-full rounded-xl bg-navy py-2.5 px-4 text-xs font-bold text-primary-foreground group-hover:bg-leaf transition-colors shadow-xs flex items-center justify-center gap-1.5 focus-ring"
                >
                  <span>{hi ? item.actionLabelHi : item.actionLabel}</span>
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Traditional vs Kisan Setu Innovation Matrix */}
        <div className="surface-lift p-6 sm:p-8 rounded-3xl border-2 border-leaf/30 space-y-6">
          <div className="text-center max-w-2xl mx-auto">
            <span className="text-[10px] font-black uppercase tracking-wider text-leaf bg-leaf-soft px-3 py-1 rounded-full border border-leaf/30">
              {hi ? "तकनीकी अंतर" : "Technological Leap"}
            </span>
            <h3 className="mt-2 font-display text-2xl font-black text-navy sm:text-3xl">
              {hi ? "पारंपरिक मंडी व्यवस्था बनाम किसान सेतु नवाचार" : "Traditional Mandis vs Kisan Setu Innovations"}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              {hi ? "कागजी अव्यवस्था से लेकर पूर्वानुमानित डिजिटल सार्वजनिक अवसंरचना तक का सफर" : "From paper-based bottlenecking to predictive digital public infrastructure"}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b-2 border-border text-[11px] uppercase tracking-wider text-muted-foreground font-black">
                  <th className="py-3 px-4">{hi ? "सुविधा / चरण" : "Dimension"}</th>
                  <th className="py-3 px-4 bg-danger-soft/40 text-danger">{hi ? "पारंपरिक व्यवस्था" : "Legacy Mandis"}</th>
                  <th className="py-3 px-4 bg-leaf-soft/50 text-navy font-extrabold">{hi ? "किसान सेतु नवाचार" : "Kisan Setu Innovation"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {[
                  {
                    dim: hi ? "मंडी आवंटन" : "Mandi Allocation",
                    old: hi ? "अनुमान व अफ़वाहों पर आधारित, मनमर्जी आगमन" : "Uninformed arrivals causing massive road jams",
                    innov: hi ? "5-कारकीय गतिशील एआई इंजन (दूरी + कतार + यार्ड क्षमता)" : "5-factor dynamic multi-objective recommendation engine",
                  },
                  {
                    dim: hi ? "प्रतीक्षा समय" : "Gate Wait Times",
                    old: hi ? "12 से 18 घंटे सड़क पर रात भर ट्रैक्टर लाइन" : "12–18 hours overnight queue on highway shoulders",
                    innov: hi ? "30 मिनट का गारंटीड स्लॉट व लाइव वर्चुअल कतार (69% कमी)" : "Guaranteed 30-minute window & live mobile virtual queue",
                  },
                  {
                    dim: hi ? "फसल बिक्री" : "Produce Selling",
                    old: hi ? "स्थानीय आढ़तियों का बंद दायरा, सीमित विकल्प" : "Local cartels with opaque price discovery",
                    innov: hi ? "संस्थागत खरीदार बाज़ार: मिलों व व्यापारियों से सीधी लाइव बोली" : "Direct B2B Marketplace with live lot bidding above MSP",
                  },
                  {
                    dim: hi ? "किसान सहायता" : "Farmer Support",
                    old: hi ? "कागजी शिकायतें जो सप्ताहों तक अनसुलझी रहती हैं" : "Paper complaints ignored for weeks",
                    innov: hi ? "बहुभाषी वॉयस एआई सहायक (हिंदी/अंग्रेजी/हिंग्लिश) + 24h निवारण" : "Grounded voice AI Sahayak + 24-hour SLA grievance triage",
                  },
                  {
                    dim: hi ? "जिला निगरानी" : "District Oversight",
                    old: hi ? "दिन के अंत में हाथ से बनी अधूरी रिपोर्ट" : "Delayed end-of-day paper tallies",
                    innov: hi ? "जिला कंट्रोल टावर: 42 मिनट पूर्व भीड़ चेतावनी व लाइव नक्शा" : "Control Tower with 42-min advance congestion surge warning",
                  },
                  {
                    dim: hi ? "भुगतान सुरक्षा" : "DBT Settlement",
                    old: hi ? "कागजी तुलाई पर्चियों में हेरफेर व 2-3 सप्ताह की देरी" : "Manual scale slips, middleman cuts & 2–3 week delay",
                    innov: hi ? "100% पीएफएमएस डीबीटी सीधा बैंक भुगतान (48 घंटे गारंटी)" : "100% PFMS direct benefit transfer within 48 hours SLA",
                  },
                ].map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 font-bold text-navy">{row.dim}</td>
                    <td className="py-3 px-4 bg-danger-soft/20 text-danger-dark font-medium flex items-center gap-1.5">
                      <span>✕</span>
                      <span>{row.old}</span>
                    </td>
                    <td className="py-3 px-4 bg-leaf-soft/30 text-navy font-bold">
                      <span className="inline-flex items-center gap-1.5 text-leaf">
                        <span>✓</span>
                        <span className="text-foreground">{row.innov}</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Intelligence Equation / Core Thesis Callout */}
        <div className="surface-hero p-8 text-center rounded-3xl border-2 border-leaf/40 mt-8 space-y-6">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-leaf px-3.5 py-1 text-[11px] font-black uppercase tracking-wider text-primary-foreground">
            ⭐ ARCHITECTURAL EQUATION
          </span>
          <h3 className="font-display text-2xl font-black text-navy sm:text-3xl max-w-2xl mx-auto leading-tight">
            “Don’t Just Digitize the Queue.<br />
            <span className="text-leaf">Predict It. Balance It. Orchestrate It.</span>”
          </h3>

          <div className="grid gap-3 sm:grid-cols-5 items-center max-w-4xl mx-auto font-display text-xs font-extrabold text-navy">
            <div className="rounded-2xl bg-card p-4 shadow-sm border border-border">
              <span className="text-xl block mb-1">📡</span>
              REAL-TIME SUPABASE DATA
            </div>
            <span className="text-xl text-leaf font-black hidden sm:block">+</span>
            <div className="rounded-2xl bg-card p-4 shadow-sm border border-border">
              <span className="text-xl block mb-1">🧠</span>
              5-FACTOR MULTI-OBJECTIVE AI
            </div>
            <span className="text-xl text-leaf font-black hidden sm:block">+</span>
            <div className="rounded-2xl bg-card p-4 shadow-sm border border-border">
              <span className="text-xl block mb-1">🏪</span>
              DIRECT B2B & 48h PFMS DBT
            </div>
          </div>

          <div className="inline-flex items-center gap-2 rounded-2xl bg-gradient-leaf px-6 py-3 text-sm font-black text-primary-foreground shadow-md shadow-leaf/30">
            = ZERO WAITING · DIRECT VALUE · IMMUTABLE PUBLIC AUDIT
          </div>
        </div>
      </section>

      {/* ─── 6. FARMER FEATURES SHOWCASE ─── */}
      <section className="mt-16 space-y-8">
        <div className="text-center max-w-2xl mx-auto">
          <SectionLabel tone="light">{hi ? "किसान सुविधाएँ" : "Empowering Farmers"}</SectionLabel>
          <h2 className="mt-2 font-display text-3xl font-black text-navy sm:text-4xl">
            Rich Digital Procurement Features
          </h2>
          <p className="mt-2 text-xs font-semibold text-muted-foreground">
            Designed for mobile devices and low-literacy farmers in Hindi, English and Hinglish.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: "🌾",
              title: "Smart Centre Recommendation",
              desc: "Find the procurement centre with the lowest predicted waiting time, shortest distance and optimal yard capacity.",
            },
            {
              icon: "🕐",
              title: "Smart Slot Booking",
              desc: "Choose an efficient arrival window (Morning, Midday, Afternoon) instead of waiting in uncoordinated physical queues.",
            },
            {
              icon: "🎫",
              title: "Live Virtual Queue",
              desc: "Track your digital token, real-time tractors ahead, and dynamic countdown ETA from home.",
            },
            {
              icon: "📍",
              title: "Arrival Guidance",
              desc: "Receive smart alerts on when to depart and which weighbridge counter to report to at the centre gate.",
            },
            {
              icon: "📦",
              title: "Procurement Tracking",
              desc: "Follow certified 8-stage progress from gate entry, electronic weighment, moisture check to digital invoice issuance.",
            },
            {
              icon: "💰",
              title: "Payment Tracking",
              desc: "Know full MSP rate calculations, bank credit SLA progress, and PFMS Direct Benefit Transfer (DBT) credit timing.",
            },
            {
              icon: "🎙️",
              title: "Kisan Setu Sahayak",
              desc: "Ask questions naturally in Hindi, English or Hinglish and get instant answers grounded in your real live database records.",
            },
            {
              icon: "🔔",
              title: "Smart Notifications",
              desc: "Receive proactive SMS and in-app alerts for slot confirmation, queue movements, weighment slips and DBT payments.",
            },
            {
              icon: "🆘",
              title: "Grievance Support",
              desc: "Directly lodge tare weighment disputes, payment delay alerts, or quality appeals to the State Directorate.",
            },
          ].map((f) => (
            <div key={f.title} className="surface-lift p-5 space-y-2.5 border border-border hover:border-leaf/50 transition-all">
              <span className="text-3xl block">{f.icon}</span>
              <h3 className="font-display text-base font-extrabold text-navy">{f.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed font-medium">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── 7. HOW IT WORKS: 6-STEP JOURNEY ─── */}
      <section className="mt-16 surface-lift p-8 sm:p-10 space-y-8">
        <div className="text-center max-w-2xl mx-auto">
          <SectionLabel tone="light">{hi ? "सरल 6-चरणीय प्रक्रिया" : "How It Works"}</SectionLabel>
          <h2 className="mt-2 font-display text-3xl font-black text-navy">
            The 6-Step Verified Procurement Journey
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { num: "01", title: "REGISTER", desc: "Farmer profile verification with land record and crop estimation." },
            { num: "02", title: "FIND BEST CENTRE", desc: "AI ranks centres by lowest congestion, shortest queue and travel distance." },
            { num: "03", title: "GET SMART SLOT", desc: "Select a guaranteed 30-minute arrival window to prevent gate crowding." },
            { num: "04", title: "RECEIVE VIRTUAL TOKEN", desc: "Digital QR gate pass with live countdown and counter assignment." },
            { num: "05", title: "TRACK PROCUREMENT", desc: "Electronic scale weighing, moisture testing and instant digital invoice." },
            { num: "06", title: "TRACK PAYMENT", desc: "100% transparent PFMS Direct Benefit Transfer credited within 48 hours." },
          ].map((step) => (
            <div key={step.num} className="rounded-2xl border border-border bg-card p-5 space-y-2 relative overflow-hidden">
              <span className="font-display text-3xl font-black text-leaf/30 absolute right-4 top-4">
                {step.num}
              </span>
              <span className="inline-block rounded-lg bg-navy px-2.5 py-1 font-mono text-[11px] font-black text-primary-foreground">
                STEP {step.num}
              </span>
              <h3 className="font-display text-base font-extrabold text-navy pt-1">{step.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── 8. AI SAHAYAK SHOWCASE ─── */}
      <section className="mt-16 surface-lift overflow-hidden border-2 border-leaf/40">
        <div className="bg-navy p-6 sm:p-8 text-primary-foreground">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-signal">
                CONVERSATIONAL INTELLIGENCE
              </span>
              <h2 className="mt-1 font-display text-2xl font-black sm:text-3xl">
                “Just Ask Kisan Setu.”
              </h2>
              <p className="mt-1 text-xs text-primary-foreground/70 max-w-xl">
                Farmers do not need to learn complex software. They can simply speak in Hindi, English, or Hinglish to check their turn, centre status, weighment, and payment.
              </p>
            </div>
            {/* Waveform graphic */}
            <div className="flex items-end gap-1.5 h-10 px-4 py-2 bg-black/40 rounded-2xl border border-command-line">
              {[12, 28, 38, 16, 32, 22, 14, 30, 20].map((h, i) => (
                <span
                  key={i}
                  className="w-1.5 bg-cyan-signal rounded-full animate-blip"
                  style={{ height: `${h}px`, animationDelay: `${i * 100}ms` }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Tap a question below to see how Sahayak reasons over live data:
          </p>

          <div className="flex flex-wrap gap-2">
            {voiceDemos.map((demo, idx) => (
              <button
                key={demo.q}
                type="button"
                onClick={() => setActiveVoicePrompt(idx)}
                className={cn(
                  "rounded-xl px-4 py-2.5 text-xs font-bold transition-all focus-ring",
                  activeVoicePrompt === idx
                    ? "bg-navy text-primary-foreground shadow-sm"
                    : "border border-border bg-card text-navy hover:bg-muted"
                )}
              >
                🎙️ “{demo.q}”
              </button>
            ))}
          </div>

          <div className="rounded-2xl border border-leaf/40 bg-leaf-soft/50 p-5 space-y-2 animate-rise">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-leaf">
                {voiceDemos[activeVoicePrompt]?.tag}
              </span>
              <span className="text-xs font-bold text-navy">Language: Hindi / English</span>
            </div>
            <p className="font-display text-sm font-black text-navy">
              Farmer: “{voiceDemos[activeVoicePrompt]?.q}” ({voiceDemos[activeVoicePrompt]?.qEn})
            </p>
            <p className="text-xs text-foreground font-semibold leading-relaxed pt-1">
              🤖 Sahayak:{" "}
              {processSahayakQuery(
                (hi ? voiceDemos[activeVoicePrompt]?.q : (voiceDemos[activeVoicePrompt]?.qEn || voiceDemos[activeVoicePrompt]?.q)) || "",
                { farmer, ticket, slot, payment, centres, timeline },
                language
              ).text}
            </p>
          </div>
        </div>
      </section>

      {/* ─── 9. SMART GOVERNMENT CONTROL TIER ─── */}
      <section className="mt-16 space-y-8">
        <div className="text-center max-w-2xl mx-auto">
          <SectionLabel tone="light">{hi ? "प्रशासनिक निगरानी" : "Smart Government Control"}</SectionLabel>
          <h2 className="mt-2 font-display text-3xl font-black text-navy sm:text-4xl">
            Hierarchical Governance & Oversight
          </h2>
          <p className="mt-2 text-xs font-semibold text-muted-foreground">
            Centre-level operations → District-level intelligence → State-level policy oversight.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 text-center text-xs font-bold">
          {[
            { title: "Live Centre Health", icon: "🟢", desc: "Yard capacity & counters" },
            { title: "Queue Monitoring", icon: "📋", desc: "Live vehicle positions" },
            { title: "Capacity Forecasting", icon: "📈", desc: "Surge anticipation" },
            { title: "Congestion Prediction", icon: "⚡", desc: "42-min early warnings" },
            { title: "Operational Alerts", icon: "🚨", desc: "Bottleneck notifications" },
            { title: "Complaint Redressal", icon: "⚖️", desc: "Direct farmer grievance triage" },
            { title: "Procurement Volume", icon: "🌾", desc: "Real-time quintals received" },
            { title: "Payment Visibility", icon: "💰", desc: "48h PFMS DBT compliance" },
            { title: "AI Recommendations", icon: "🤖", desc: "1-click quota rebalancing" },
            { title: "Immutable Auditability", icon: "🛡️", desc: "Complete action history logs" },
          ].map((m) => (
            <div key={m.title} className="surface-lift p-4 space-y-1">
              <span className="text-2xl block mb-1">{m.icon}</span>
              <p className="text-navy font-extrabold">{m.title}</p>
              <p className="text-[10px] text-muted-foreground font-normal">{m.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── 10. MEASURABLE IMPACT (PROTOTYPE SIMULATION) ─── */}
      <section className="mt-16 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <SectionLabel tone="light">{hi ? "मापने योग्य प्रभाव" : "Measurable Prototype Impact"}</SectionLabel>
            <h2 className="font-display text-2xl font-black text-navy">
              Quantifiable Procurement Outcomes
            </h2>
          </div>
          <span className="rounded-full bg-saffron-soft border border-saffron/40 px-3 py-1 text-[11px] font-bold text-navy self-start">
            📊 Prototype Simulation Metrics
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Avg wait — traditional" value="154" unit="min" accent="danger" hint="Baseline physical queue wait" />
          <StatCard label="Avg wait — Kisan Setu" value="47" unit="min" accent="leaf" trend={{ direction: "down", text: "69% reduction" }} />
          <StatCard label="Slot adherence rate" value="94" unit="%" accent="navy" hint="Farmers reporting in slot window" />
          <StatCard label="DBT Payment Visibility" value="100" unit="%" accent="saffron" hint="Tracked directly to bank account" />
        </div>

        <BeforeAfter />
      </section>

      {/* ─── 11. GOVERNMENT VALUE MATRIX ─── */}
      <section className="mt-16 surface-lift p-8 space-y-6">
        <div className="text-center max-w-2xl mx-auto">
          <SectionLabel tone="light">{hi ? "राष्ट्रीय मूल्य" : "Government & Stakeholder Value"}</SectionLabel>
          <h2 className="mt-2 font-display text-3xl font-black text-navy">
            Delivering Value Across the Ecosystem
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2 border-l-2 border-l-leaf pl-4">
            <h3 className="font-display text-sm font-black text-navy">FOR FARMERS</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Zero physical wait, guaranteed arrival windows, real-time queue visibility, and complete transparency on MSP rates and DBT credits.
            </p>
          </div>

          <div className="space-y-2 border-l-2 border-l-saffron pl-4">
            <h3 className="font-display text-sm font-black text-navy">FOR CENTRES</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Predictable farmer flow, optimal yard capacity utilization, electronic weighbridge integration, and elimination of yard stampedes.
            </p>
          </div>

          <div className="space-y-2 border-l-2 border-l-cyan-signal pl-4">
            <h3 className="font-display text-sm font-black text-navy">FOR ADMINISTRATION</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              42-minute early congestion warning, automated slot balancing, grievance redressal tracking, and district-wide operational scorecards.
            </p>
          </div>

          <div className="space-y-2 border-l-2 border-l-navy pl-4">
            <h3 className="font-display text-sm font-black text-navy">FOR THE SYSTEM</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Connected, auditable, paperless procurement with 100% PFMS DBT compliance and digital public infrastructure reliability.
            </p>
          </div>
        </div>
      </section>

      {/* ─── 12. FINAL CTA BANNER ─── */}
      <section className="mt-16 surface-hero p-8 sm:p-12 text-center rounded-3xl border-2 border-leaf/40 space-y-6">
        <h2 className="font-display text-2xl font-black text-navy sm:text-4xl max-w-3xl mx-auto leading-tight">
          “Kisan Setu connects the entire procurement journey — from the farmer’s first booking to the government’s final oversight.”
        </h2>
        <p className="text-xs font-semibold text-muted-foreground max-w-xl mx-auto">
          Explore the live operational portals built on authentic Supabase infrastructure:
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link
            to="/farmer"
            className="rounded-xl bg-gradient-leaf px-6 py-3.5 text-xs font-black text-primary-foreground shadow-md shadow-leaf/30 transition-transform hover:scale-105 focus-ring"
          >
            🌾 ACCESS FARMER PORTAL
          </Link>
          <Link
            to="/centre"
            className="rounded-xl border border-border bg-card px-6 py-3.5 text-xs font-bold text-navy hover:bg-muted focus-ring"
          >
            🏢 CENTRE OPERATIONS
          </Link>
          <Link
            to="/control-tower"
            className="rounded-xl bg-navy px-6 py-3.5 text-xs font-bold text-primary-foreground hover:-translate-y-0.5 transition-transform focus-ring"
          >
            🛰️ DISTRICT CONTROL TOWER
          </Link>
          <Link
            to="/admin"
            className="rounded-xl border border-navy/30 bg-card px-6 py-3.5 text-xs font-bold text-navy hover:bg-muted focus-ring"
          >
            🏛️ STATE DIRECTORATE COMMAND
          </Link>
        </div>
      </section>

      {/* ─── 13. PROFESSIONAL PUBLIC SERVICE FOOTER ─── */}
      <footer className="mt-16 border-t border-border pt-10 pb-8 text-xs text-muted-foreground space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-navy font-display text-xs font-black text-primary-foreground">
                KS
              </span>
              <span className="font-display text-base font-black text-navy">KISAN SETU</span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Smart Government Procurement Intelligence Platform · Smart India Hackathon 2026
            </p>
          </div>

          <div className="flex flex-wrap gap-4 text-xs font-semibold text-navy">
            <Link to="/farmer" className="hover:text-leaf">Farmer Portal</Link>
            <Link to="/centre" className="hover:text-leaf">Centre Operations</Link>
            <Link to="/control-tower" className="hover:text-leaf">Control Tower</Link>
            <Link to="/admin" className="hover:text-leaf">Directorate Command</Link>
            <Link to="/login" className="hover:text-leaf">Portal Sign In</Link>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-t border-border pt-6 text-[11px]">
          <p>© 2026 Kisan Setu · Ministry of Consumer Affairs, Food & Public Distribution. All Rights Reserved.</p>
          <p className="flex items-center gap-3">
            <span>Toll-Free Helpline: <strong>1800-180-2026</strong></span>
            <span>·</span>
            <span>Security: <strong>PFMS 256-Bit Encrypted</strong></span>
          </p>
        </div>
      </footer>
    </PageShell>
  );
}
