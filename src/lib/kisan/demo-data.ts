import type {
  ActivityEvent,
  AiRecommendation,
  CentreAlert,
  Farmer,
  ForecastPoint,
  PaymentStatus,
  ProcurementCentre,
  QueueRow,
  QueueTicket,
  SlotSuggestion,
  ThroughputPoint,
  TimelineStep,
  WaitAnalyticsPoint,
} from "./types";

/** Prototype simulation data. Replace with API responses later. */

export const demoFarmer: Farmer = {
  id: "farmer-1",
  name: "Ramesh Kumar",
  nameHi: "रमेश कुमार",
  village: "Bahadurgarh",
  villageHi: "बहादुरगढ़",
  district: "Karnal",
  phone: "+91 98••• ••432",
  farmerId: "HR-KRN-2026-88214",
  crop: "Wheat",
  cropHi: "गेहूँ",
  quantityQuintals: 120,
};

export const demoCentres: ProcurementCentre[] = [
  {
    id: "centre-a",
    code: "A",
    name: "Mandi Centre A — Karnal City",
    nameHi: "मंडी केंद्र A — करनाल शहर",
    distanceKm: 7,
    queueLength: 42,
    predictedWaitMin: 126,
    capacityUsedPct: 91,
    dailyCapacityQuintals: 4200,
    procuredTodayQuintals: 3822,
    activeCounters: 4,
    totalCounters: 6,
    processingRatePerHour: 21,
    farmersToday: 138,
    map: { x: 34, y: 38 },
  },
  {
    id: "centre-b",
    code: "B",
    name: "Mandi Centre B — Nilokheri",
    nameHi: "मंडी केंद्र B — निलोखेड़ी",
    distanceKm: 12,
    queueLength: 13,
    predictedWaitMin: 41,
    capacityUsedPct: 54,
    dailyCapacityQuintals: 3800,
    procuredTodayQuintals: 2052,
    activeCounters: 5,
    totalCounters: 6,
    processingRatePerHour: 24,
    farmersToday: 84,
    map: { x: 62, y: 26 },
    recommended: true,
    recommendationReasons: [
      "Predicted wait 41 min vs 126 min at Centre A — 85 minutes saved",
      "Only 54% capacity used, so your 120 quintals fit today's window",
      "5 of 6 counters active — highest processing rate in the district (24 farmers/hr)",
      "Extra 5 km travel costs ~11 min, but saves 85 min of waiting",
    ],
    recommendationReasonsHi: [
      "अनुमानित प्रतीक्षा 41 मिनट, केंद्र A पर 126 मिनट — 85 मिनट की बचत",
      "केवल 54% क्षमता उपयोग — आपके 120 क्विंटल आज ही तुल जाएंगे",
      "6 में से 5 काउंटर चालू — जिले में सबसे तेज़ (24 किसान/घंटा)",
      "5 किमी अतिरिक्त यात्रा में ~11 मिनट, पर 85 मिनट प्रतीक्षा बचती है",
    ],
  },
  {
    id: "centre-c",
    code: "C",
    name: "Mandi Centre C — Indri",
    nameHi: "मंडी केंद्र C — इंद्री",
    distanceKm: 18,
    queueLength: 8,
    predictedWaitMin: 48,
    capacityUsedPct: 47,
    dailyCapacityQuintals: 2600,
    procuredTodayQuintals: 1222,
    activeCounters: 3,
    totalCounters: 5,
    processingRatePerHour: 16,
    farmersToday: 51,
    map: { x: 78, y: 62 },
  },
  {
    id: "centre-d",
    code: "D",
    name: "Mandi Centre D — Gharaunda",
    nameHi: "मंडी केंद्र D — घरौंडा",
    distanceKm: 22,
    queueLength: 19,
    predictedWaitMin: 63,
    capacityUsedPct: 68,
    dailyCapacityQuintals: 3100,
    procuredTodayQuintals: 2108,
    activeCounters: 4,
    totalCounters: 5,
    processingRatePerHour: 18,
    farmersToday: 73,
    map: { x: 22, y: 72 },
  },
  {
    id: "centre-e",
    code: "E",
    name: "Mandi Centre E — Assandh",
    nameHi: "मंडी केंद्र E — असंध",
    distanceKm: 31,
    queueLength: 27,
    predictedWaitMin: 84,
    capacityUsedPct: 79,
    dailyCapacityQuintals: 2900,
    procuredTodayQuintals: 2291,
    activeCounters: 3,
    totalCounters: 4,
    processingRatePerHour: 15,
    farmersToday: 66,
    map: { x: 50, y: 82 },
  },
];

export const demoSlot: SlotSuggestion = {
  id: "slot-1",
  centreId: "centre-b",
  window: "11:30 – 12:00",
  date: "Today",
  confidencePct: 93,
  reason: "Counter load dips after the 10:00 rush; arriving at 11:30 means near-zero idle waiting.",
  reasonHi: "10 बजे की भीड़ के बाद काउंटर खाली होते हैं; 11:30 पर पहुँचने से प्रतीक्षा लगभग शून्य।",
};

export const demoTicket: QueueTicket = {
  token: "KS-3842",
  centreId: "centre-b",
  slotWindow: "11:30 – 12:00",
  farmersAhead: 4,
  etaMinutes: 18,
  status: "in_queue",
};

export const demoTimeline: TimelineStep[] = [
  {
    id: "registration",
    label: "Registration verified",
    labelHi: "पंजीकरण सत्यापित",
    detail: "Farmer ID HR-KRN-2026-88214 · Wheat · 120 quintals",
    detailHi: "किसान आईडी HR-KRN-2026-88214 · गेहूँ · 120 क्विंटल",
    state: "done",
    timestamp: "08:12",
  },
  {
    id: "slot",
    label: "Smart slot allotted",
    labelHi: "स्मार्ट स्लॉट आवंटित",
    detail: "Centre B · 11:30 – 12:00 · 93% confidence",
    detailHi: "केंद्र B · 11:30 – 12:00 · 93% विश्वास",
    state: "done",
    timestamp: "08:14",
  },
  {
    id: "queue",
    label: "Virtual queue — token KS-3842",
    labelHi: "वर्चुअल कतार — टोकन KS-3842",
    detail: "4 farmers ahead · ETA 18 min",
    detailHi: "4 किसान आगे · अनुमानित 18 मिनट",
    state: "active",
    timestamp: "11:26",
  },
  {
    id: "grading",
    label: "Quality grading & weighing",
    labelHi: "गुणवत्ता जाँच और तुलाई",
    detail: "Counter 3 reserved for your token",
    detailHi: "आपके टोकन के लिए काउंटर 3 आरक्षित",
    state: "upcoming",
  },
  {
    id: "receipt",
    label: "Digital procurement receipt",
    labelHi: "डिजिटल खरीद रसीद",
    detail: "Auto-generated after weighing",
    detailHi: "तुलाई के बाद स्वतः बनेगी",
    state: "upcoming",
  },
  {
    id: "payment",
    label: "Payment credited to bank",
    labelHi: "भुगतान बैंक में जमा",
    detail: "Direct benefit transfer · expected in 48 hours",
    detailHi: "सीधा लाभ हस्तांतरण · 48 घंटे में अपेक्षित",
    state: "upcoming",
  },
];

export const demoPayment: PaymentStatus = {
  grossAmount: 291600,
  currency: "INR",
  ratePerQuintal: 2430,
  quintals: 120,
  stage: "approved",
  expectedCreditIn: "Credited within 48 hours of weighing",
  expectedCreditInHi: "तुलाई के 48 घंटे के भीतर जमा",
  bankMasked: "PNB ••••4417",
  progressPct: 55,
};

export const demoQueueRows: QueueRow[] = [
  { token: "KS-3838", farmerName: "Sukhbir Singh", village: "Nilokheri", crop: "Wheat", quantityQuintals: 85, slotWindow: "10:30 – 11:00", waitedMin: 34, status: "weighing" },
  { token: "KS-3839", farmerName: "Meena Devi", village: "Kohand", crop: "Wheat", quantityQuintals: 62, slotWindow: "11:00 – 11:30", waitedMin: 26, status: "grading" },
  { token: "KS-3840", farmerName: "Harpal Rana", village: "Bastara", crop: "Wheat", quantityQuintals: 140, slotWindow: "11:00 – 11:30", waitedMin: 21, status: "waiting" },
  { token: "KS-3841", farmerName: "Jaswant Lal", village: "Uchana", crop: "Wheat", quantityQuintals: 96, slotWindow: "11:30 – 12:00", waitedMin: 12, status: "waiting" },
  { token: "KS-3842", farmerName: "Ramesh Kumar", village: "Bahadurgarh", crop: "Wheat", quantityQuintals: 120, slotWindow: "11:30 – 12:00", waitedMin: 6, status: "waiting" },
  { token: "KS-3843", farmerName: "Pooja Sharma", village: "Munak", crop: "Wheat", quantityQuintals: 74, slotWindow: "12:00 – 12:30", waitedMin: 0, status: "waiting" },
  { token: "KS-3836", farmerName: "Amar Chand", village: "Nigdhu", crop: "Wheat", quantityQuintals: 110, slotWindow: "10:00 – 10:30", waitedMin: 48, status: "payment" },
  { token: "KS-3835", farmerName: "Balwan Singh", village: "Kachhwa", crop: "Wheat", quantityQuintals: 58, slotWindow: "09:30 – 10:00", waitedMin: 52, status: "done" },
];

export const demoAlerts: CentreAlert[] = [
  {
    id: "alert-1",
    severity: "critical",
    title: "Centre A predicted to exceed safe capacity in 42 minutes",
    detail: "Arrival rate 31/hr vs processing rate 21/hr. Projected queue 68 by 13:10.",
    atMinutes: 42,
  },
  {
    id: "alert-2",
    severity: "warning",
    title: "Counter 5 & 6 idle — staff reassigned to gunny bag loading",
    detail: "Reactivating both counters lifts processing rate to 28/hr.",
  },
  {
    id: "alert-3",
    severity: "info",
    title: "Moisture rejections up 4% since 09:00",
    detail: "Advise farmers to sun-dry before arrival; grading time up 1.4 min per lot.",
  },
];

export const demoRecommendation: AiRecommendation = {
  id: "rec-1",
  headline: "Shift 18 future appointments → Centre B",
  rationale:
    "Centre A crosses 95% safe capacity in 42 minutes. Centre B holds 46% headroom and 5 active counters within a 12 km radius of the affected farmers.",
  impact: "Average wait at Centre A drops 126 → 58 min · 0 farmers turned away · 4 vehicles saved from overnight halt",
  confidencePct: 89,
  action: { shiftAppointments: 18, fromCentreId: "centre-a", toCentreId: "centre-b" },
  status: "pending",
};

export const demoForecast: ForecastPoint[] = [
  { label: "08:00", queue: 12, predicted: 12, capacityLine: 55 },
  { label: "09:00", queue: 21, predicted: 21, capacityLine: 55 },
  { label: "10:00", queue: 33, predicted: 33, capacityLine: 55 },
  { label: "11:00", queue: 42, predicted: 42, capacityLine: 55 },
  { label: "12:00", queue: 42, predicted: 54, capacityLine: 55 },
  { label: "13:00", queue: 42, predicted: 68, capacityLine: 55 },
  { label: "14:00", queue: 42, predicted: 74, capacityLine: 55 },
  { label: "15:00", queue: 42, predicted: 61, capacityLine: 55 },
];

export const demoWaitAnalytics: WaitAnalyticsPoint[] = [
  { label: "Mon", beforeMin: 148, afterMin: 62 },
  { label: "Tue", beforeMin: 132, afterMin: 54 },
  { label: "Wed", beforeMin: 165, afterMin: 58 },
  { label: "Thu", beforeMin: 154, afterMin: 47 },
  { label: "Fri", beforeMin: 171, afterMin: 51 },
  { label: "Sat", beforeMin: 139, afterMin: 44 },
];

export const demoThroughput: ThroughputPoint[] = [
  { label: "08", quintals: 620 },
  { label: "09", quintals: 980 },
  { label: "10", quintals: 1420 },
  { label: "11", quintals: 1710 },
  { label: "12", quintals: 1560 },
  { label: "13", quintals: 1240 },
  { label: "14", quintals: 1380 },
  { label: "15", quintals: 900 },
];

export const demoActivity: ActivityEvent[] = [
  { id: "e1", at: "11:26", kind: "queue", message: "Token KS-3842 entered virtual queue at Centre B · 4 ahead" },
  { id: "e2", at: "11:24", kind: "ai", message: "Congestion model flagged Centre A: 95% safe capacity in 42 min" },
  { id: "e3", at: "11:21", kind: "payment", message: "₹2.14 L released to 9 farmers · Centre D batch #221" },
  { id: "e4", at: "11:19", kind: "centre", message: "Centre C opened counter 4 — processing rate 16 → 20/hr" },
  { id: "e5", at: "11:16", kind: "queue", message: "Centre E queue crossed 25 · yellow health status" },
  { id: "e6", at: "11:12", kind: "admin", message: "District officer viewed Centre A capacity forecast" },
];
