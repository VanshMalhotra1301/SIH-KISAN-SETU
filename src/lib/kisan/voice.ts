/**
 * KISAN SETU SAHAYAK — Context-Aware Farmer Digital Assistant
 * Natural Language understanding for Hindi, Hinglish & English with live Supabase data integration,
 * session memory, navigation triggers, and safe action confirmation.
 */
import type {
  Farmer,
  Language,
  PaymentStatus,
  ProcurementCentre,
  QueueTicket,
  SlotSuggestion,
  TimelineStep,
} from "./types";

export interface LiveVoiceContext {
  farmer?: Farmer | null;
  ticket?: QueueTicket | null;
  slot?: SlotSuggestion | null;
  payment?: PaymentStatus | null;
  centres?: ProcurementCentre[];
  timeline?: TimelineStep[];
  notifications?: Array<{ id: string; title: string; body: string; isRead: boolean }>;
}

export interface SahayakConversationState {
  lastTopic?: "turn" | "procurement" | "centre" | "payment" | "slot" | "notification" | null;
  lastReferencedCentreId?: string | null;
  pendingAction?: {
    type: "book_slot" | "switch_language" | "read_notifications";
    payload?: any;
    description: string;
    descriptionHi: string;
  } | null;
}

export interface SahayakResponse {
  text: string;
  speechText: string;
  facts?: Array<{ label: string; value: string }>;
  navigationTarget?: "home" | "centres" | "queue" | "timeline" | "payments" | "profile" | null;
  pendingAction?: SahayakConversationState["pendingAction"] | null;
  suggestedFollowUps?: Array<{ textEn: string; textHi: string }>;
}

/**
 * Intelligent Intent Classifier & Natural Language Processor for Kisan Setu Sahayak
 */
export function processSahayakQuery(
  rawQuery: string,
  ctx: LiveVoiceContext,
  lang: Language,
  sessionState: SahayakConversationState = {}
): SahayakResponse {
  const query = rawQuery.trim().toLowerCase();
  const hi = lang === "hi";

  // Farmer context variables
  const farmerName = ctx.farmer?.name || "किसान भाई";
  const crop = ctx.farmer?.crop || "Wheat";
  const cropHi = ctx.farmer?.cropHi || "गेहूँ";
  const quantity = ctx.farmer?.quantityQuintals || 100;
  const ticket = ctx.ticket;
  const payment = ctx.payment;
  const timeline = ctx.timeline || [];
  const centres = ctx.centres || [];

  const recommendedCentre: ProcurementCentre | undefined = centres.find((c) => c.recommended) || centres[0];
  const assignedCentre: ProcurementCentre | undefined = centres.find((c) => c.id === ticket?.centreId) || recommendedCentre;

  const hasAny = (keywords: string[]) => keywords.some((k) => query.includes(k));

  // ─── 1. NAVIGATION COMMANDS ───
  if (hasAny(["queue", "कतार", "टोकन खोलो", "open queue", "show queue", "live queue", "q kholo"])) {
    sessionState.lastTopic = "turn";
    if (ticket) {
      return {
        text: hi
          ? `बिल्कुल ${farmerName} जी। आपकी लाइव कतार खोल रहा हूँ। आपका टोकन ${ticket.token} है और आपसे आगे ${ticket.farmersAhead} किसान हैं।`
          : `Sure ${farmerName}. Opening your live virtual queue. Your token is ${ticket.token} with ${ticket.farmersAhead} farmers ahead.`,
        speechText: hi
          ? `आपकी लाइव कतार खोल रहा हूँ। टोकन ${ticket.token}, आगे ${ticket.farmersAhead} किसान।`
          : `Opening your live queue. Token ${ticket.token}, ${ticket.farmersAhead} farmers ahead.`,
        navigationTarget: "queue",
        facts: [
          { label: hi ? "टोकन" : "Token", value: ticket.token },
          { label: hi ? "आगे किसान" : "Farmers Ahead", value: `${ticket.farmersAhead}` },
          { label: hi ? "ईटीए" : "ETA", value: `${ticket.etaMinutes} min` },
        ],
      };
    } else {
      return {
        text: hi
          ? `आपके पास अभी कोई सक्रिय टोकन नहीं है। क्या आप मंडी स्लॉट बुक करना चाहते हैं?`
          : `You don't have an active queue ticket yet. Would you like to explore available mandi slots?`,
        speechText: hi
          ? `आपके पास कोई सक्रिय टोकन नहीं है। यदि आप आज ${cropHi} बेचना चाहते हैं, तो कृपया मंडी का स्लॉट बुक करें।`
          : `You don't have an active token. Would you like to book a slot for your ${crop}?`,
        navigationTarget: "centres",
      };
    }
  }

  if (hasAny(["payment", "पेमेंट", "पैसा", "भुगतान", "dbt", "rupee", "show payment", "paisa", "paise"])) {
    sessionState.lastTopic = "payment";
    const amt = payment?.grossAmount ? `₹${payment.grossAmount.toLocaleString("en-IN")}` : `₹${(quantity * 2430).toLocaleString("en-IN")}`;
    const bank = payment?.bankMasked || "PNB ••••4417";
    const creditTime = hi ? (payment?.expectedCreditInHi || "तुलाई के 48 घंटे के भीतर") : (payment?.expectedCreditIn || "within 48 hours of weighing");

    return {
      text: hi
        ? `आपकी कुल देय राशि ${amt} स्वीकृत है। यह राशि सीधे बैंक खाते ${bank} में ${creditTime} जमा की जाएगी। बैंक भुगतान विवरण खोल रहा हूँ।`
        : `Your gross payable MSP amount is ${amt}. It will be credited to bank account ${bank} ${creditTime} via DBT. Opening payments dashboard.`,
      speechText: hi
        ? `कुल राशि ${amt} स्वीकृत है। भुगतान पृष्ठ खोल रहा हूँ।`
        : `Approved amount is ${amt}. Opening payment dashboard.`,
      navigationTarget: "payments",
      facts: [
        { label: hi ? "देय राशि" : "Gross Amount", value: amt },
        { label: hi ? "बैंक खाता" : "Bank Account", value: bank },
        { label: hi ? "स्थिति" : "Status", value: hi ? "स्वीकृत · हस्तांतरण जारी" : "Approved · In Transfer" },
      ],
      suggestedFollowUps: [
        { textEn: "Download J-Form receipt", textHi: "जे-फॉर्म रसीद कैसे मिलेगी?" },
        { textEn: "When is my turn?", textHi: "मेरी बारी कब आएगी?" },
      ],
    };
  }

  if (hasAny(["timeline", "stage", "progress", "status", "कहाँ तक", "kahan tak", "खरीद चरण", "प्रगति", "procurement"])) {
    sessionState.lastTopic = "procurement";
    const activeStep = timeline.find((s) => s.state === "active") || timeline[1];
    const stepName = (hi ? activeStep?.labelHi : activeStep?.label) || (hi ? "मंडी आगमन" : "Mandi Arrival");

    return {
      text: hi
        ? `आपकी खरीद वर्तमान में चरण '${stepName}' पर है। विस्तृत 8-चरणीय टाइमलाइन खोल रहा हूँ।`
        : `Your procurement is currently at stage '${stepName}'. Opening detailed procurement timeline.`,
      speechText: hi
        ? `वर्तमान चरण: ${stepName}। टाइमलाइन खोल रहा हूँ।`
        : `Current stage: ${stepName}. Opening timeline.`,
      navigationTarget: "timeline",
      facts: [
        { label: hi ? "वर्तमान चरण" : "Active Stage", value: stepName },
        { label: hi ? "फसल" : "Crop", value: `${quantity} qtl ${hi ? cropHi : crop}` },
      ],
    };
  }

  if (hasAny(["profile", "account", "प्रोफ़ाइल", "खाता", "kisan card", "farmer id"])) {
    return {
      text: hi ? "आपकी किसान प्रोफ़ाइल विवरण खोल रहा हूँ।" : "Opening your farmer profile details.",
      speechText: hi ? "प्रोफ़ाइल खोल रहा हूँ।" : "Opening profile.",
      navigationTarget: "profile",
    };
  }

  // ─── ACTION: BOOK SLOT ───
  if (hasAny(["book", "स्लॉट", "booking", "book slot", "slot book", "number lagao"])) {
    sessionState.lastTopic = "slot";
    
    if (!recommendedCentre) {
      return {
        text: hi
          ? "क्षमा करें, अभी कोई मंडी केंद्र उपलब्ध नहीं है। कृपया बाद में प्रयास करें।"
          : "Sorry, no mandi centres are currently available. Please try again later.",
        speechText: hi
          ? "क्षमा करें, अभी कोई मंडी केंद्र उपलब्ध नहीं है। कृपया बाद में प्रयास करें।"
          : "Sorry, no mandi centres are currently available. Please try again later.",
      };
    }

    const slotWindow = "11:30 – 12:00";
    return {
      text: hi
        ? `${recommendedCentre.nameHi} पर समय ${slotWindow} का स्मार्ट स्लॉट उपलब्ध है। न्यूनतम प्रतीक्षा और 5/6 काउंटर चालू हैं। क्या मैं इसे आपके लिए बुक कर दूँ?`
        : `A smart slot for ${slotWindow} is available at ${recommendedCentre.name} with minimal wait and 5 active counters. Shall I confirm and book this slot for you?`,
      speechText: hi
        ? `${recommendedCentre.nameHi} पर ${slotWindow} का स्लॉट उपलब्ध है। क्या मैं इसे बुक कर दूँ?`
        : `Slot ${slotWindow} is available at ${recommendedCentre.name}. Should I confirm the booking?`,
      pendingAction: {
        type: "book_slot",
        payload: { centreId: recommendedCentre.id, slotWindow },
        description: `Confirm slot at ${recommendedCentre.name} (${slotWindow})`,
        descriptionHi: `${recommendedCentre.nameHi} पर ${slotWindow} का स्लॉट आरक्षित करें`,
      },
    };
  }

  // ─── TIMING & ARRIVAL SCHEDULE ───
  if (hasAny(["time", "समय", "कितने बजे", "kitne baje", "कब जाना", "kab jaana", "reach", "arrival", "schedule", "timing", "baje jaana"])) {
    sessionState.lastTopic = "slot";
    const slotWindow = ticket?.slotWindow || ctx.slot?.window || "11:30 – 12:00";

    return {
      text: hi
        ? `आपका निर्धारित खरीद स्लॉट ${slotWindow} है। आपको समय से 10 मिनट पहले (लगभग 11:20 बजे) ${assignedCentre?.nameHi || "मंडी"} के मुख्य द्वार पर पहुँचना चाहिए ताकि तुलाई समय पर शुरू हो सके।`
        : `Your assigned slot window is ${slotWindow}. You should arrive 10 minutes prior (around 11:20 AM) at ${assignedCentre?.name || "mandi"} main gate for smooth weighing.`,
      speechText: hi
        ? `आपका स्लॉट ${slotWindow} है। 10 मिनट पहले मुख्य द्वार पर पहुँचें।`
        : `Your slot is ${slotWindow}. Please arrive 10 minutes before your window.`,
      facts: assignedCentre ? [
        { label: hi ? "मंडी केंद्र" : "Mandi Centre", value: hi ? assignedCentre.nameHi : assignedCentre.name },
        { label: hi ? "अनुमानित प्रतीक्षा" : "Estimated Wait", value: `${assignedCentre.predictedWaitMin} ${hi ? "मिनट" : "min"}` },
      ] : [],
      suggestedFollowUps: [
        { textEn: "When is my turn?", textHi: "मेरी बारी कब आएगी?" },
        { textEn: "Where is my payment?", textHi: "मेरी payment कब आएगी?" },
      ],
    };
  }

  // ─── CENTRE / MANDI INQUIRIES ───
  if (hasAny(["centre", "center", "सेंटर", "mandi", "मंडी", "केंद्र", "kendr", "nearest", "kidhar", "kahan", "अच्छा रहेगा", "accha rahega", "kon sa"])) {
    sessionState.lastTopic = "centre";
    const best = recommendedCentre;
    const bestName = hi ? best.nameHi : best.name;

    return {
      text: hi
        ? `आपके लिए सबसे अच्छा खरीद केंद्र ${bestName} है। यह ${best.distanceKm} किमी दूर है और वर्तमान में केवल ${best.predictedWaitMin} मिनट की प्रतीक्षा है (${best.queueLength} किसान कतार में हैं)।`
        : `The optimal procurement mandi for you is ${bestName} (${best.distanceKm} km away). Current predicted wait is only ${best.predictedWaitMin} minutes with ${best.queueLength} farmers in queue.`,
      speechText: hi
        ? `सबसे अच्छा केंद्र ${bestName} है, प्रतीक्षा केवल ${best.predictedWaitMin} मिनट।`
        : `Best mandi is ${bestName}, wait is ${best.predictedWaitMin} minutes.`,
      navigationTarget: "centres",
      facts: [
        { label: hi ? "अनुशंसित मंडी" : "Optimal Mandi", value: bestName },
        { label: hi ? "दूरी" : "Distance", value: `${best.distanceKm} km` },
        { label: hi ? "प्रतीक्षा समय" : "Est. Wait", value: `${best.predictedWaitMin} min` },
      ],
      suggestedFollowUps: [
        { textEn: "Book slot at this mandi", textHi: "इस मंडी में स्लॉट बुक करें" },
        { textEn: "When should I reach?", textHi: "मुझे कितने बजे जाना है?" },
      ],
    };
  }

  // ─── QUEUE & TURN INQUIRIES ───
  if (hasAny(["बारी", "baari", "turn", "number", "ahead", "waiting", "wait", "kab aayegi", "kitne kisan", "kitne log"])) {
    sessionState.lastTopic = "turn";
    if (ticket) {
      return {
        text: hi
          ? `नमस्ते ${farmerName} जी। आपका टोकन ${ticket.token} है। आपसे आगे अभी ${ticket.farmersAhead} किसान हैं। आपका अनुमानित प्रवेश समय लगभग ${ticket.etaMinutes} मिनट में है (${assignedCentre.nameHi})।`
          : `Hello ${farmerName}. Your token is ${ticket.token}. There are currently ${ticket.farmersAhead} farmers ahead of you. Estimated wait is ${ticket.etaMinutes} minutes at ${assignedCentre.name}.`,
        speechText: hi
          ? `टोकन ${ticket.token}, आपसे आगे ${ticket.farmersAhead} किसान, अनुमानित समय ${ticket.etaMinutes} मिनट।`
          : `Token ${ticket.token}, ${ticket.farmersAhead} farmers ahead, estimated wait ${ticket.etaMinutes} minutes.`,
        facts: [
          { label: hi ? "टोकन संख्या" : "Token No", value: ticket.token },
          { label: hi ? "आगे किसान" : "Farmers Ahead", value: `${ticket.farmersAhead}` },
          { label: hi ? "लाइव ईटीए" : "Live ETA", value: `${ticket.etaMinutes} min` },
          { label: hi ? "मंडी केंद्र" : "Mandi Centre", value: hi ? assignedCentre.nameHi : assignedCentre.name },
        ],
        suggestedFollowUps: [
          { textEn: "Show my live queue", textHi: "मेरा लाइव कतार टोकन दिखाओ" },
          { textEn: "Directions to mandi", textHi: "मंडी पहुँचने का रास्ता" },
        ],
      };
    } else {
      return {
        text: hi
          ? `नमस्ते ${farmerName} जी। आपके पास अभी कोई सक्रिय टोकन नहीं है। आप तुरंत 1-क्लिक से ${recommendedCentre.nameHi} पर स्लॉट बुक कर सकते हैं।`
          : `Hello ${farmerName}. You do not have an active queue ticket yet. Would you like to book a slot at ${recommendedCentre.name}?`,
        speechText: hi
          ? `कोई सक्रिय टोकन नहीं है। क्या मैं ${recommendedCentre.nameHi} पर स्लॉट बुक कर दूँ?`
          : `No active ticket. Would you like to book at ${recommendedCentre.name}?`,
        pendingAction: {
          type: "book_slot",
          payload: { centreId: recommendedCentre.id, slotWindow: "11:30 – 12:00" },
          description: `Book smart slot at ${recommendedCentre.name} (11:30 – 12:00)`,
          descriptionHi: `${recommendedCentre.nameHi} पर समय 11:30 – 12:00 का स्मार्ट स्लॉट आरक्षित करें`,
        },
      };
    }
  }

  // ─── 5. FOLLOW-UP CONTEXT RESOLUTION ───
  if (sessionState.lastTopic && (query.includes("और") || query.includes("aur") || query.includes("wahan") || query.includes("वहाँ") || query.includes("kitna samay"))) {
    if (sessionState.lastTopic === "turn" || sessionState.lastTopic === "centre") {
      const c = assignedCentre;
      return {
        text: hi
          ? `आपके गाँव ${ctx.farmer?.village || "गाँव"} से ${c.nameHi} की दूरी ${c.distanceKm} किमी है। ट्रैक्टर या वाहन से पहुँचने में लगभग 20–25 मिनट लगेंगे।`
          : `The distance from your village to ${c.name} is ${c.distanceKm} km. It will take approx 20–25 minutes by tractor/vehicle.`,
        speechText: hi
          ? `मंडी की दूरी ${c.distanceKm} किमी है, लगभग 20 से 25 मिनट लगेंगे।`
          : `Mandi distance is ${c.distanceKm} km, taking around 20 to 25 minutes.`,
        facts: [
          { label: hi ? "दूरी" : "Distance", value: `${c.distanceKm} km` },
          { label: hi ? "यातायात समय" : "Travel Time", value: "20–25 min" },
        ],
      };
    }
  }

  // ─── 6. PROFESSIONAL SCOPE BOUNDARY / FALLBACK FOR INVALID QUESTIONS ───
  return {
    text: hi
      ? `क्षमा करें ${farmerName} जी, मैं किसान सेतु का आधिकारिक खरीद सहायक हूँ और केवल कृषि उपज खरीद, मंडी आवंटन, स्लॉट बुकिंग, कतार टोकन एवं डीबीटी भुगतान से संबंधित प्रश्नों में सहायता के लिए अधिकृत हूँ। मैं अन्य असंबंधित विषयों पर उत्तर देने के लिए उपलब्ध नहीं हूँ।\n\nआप अपनी खरीद से संबंधित निम्नलिखित प्रश्न पूछ सकते हैं:\n• मेरी बारी कब आएगी?\n• मेरा खरीद केंद्र कौन सा है?\n• आज मुझे कितने बजे जाना है?\n• मेरी payment कहाँ तक पहुँची?\n• मेरा लाइव कतार टोकन खोलो`
      : `I apologize, ${farmerName}. I am the official Kisan Setu Procurement Assistant, dedicated exclusively to crop procurement, mandi allocation, slot booking, virtual queue tokens, and MSP payment tracking. I am not programmed to answer queries outside this domain.\n\nPlease ask an authorized procurement question such as:\n• When is my turn?\n• Which mandi centre is best for me?\n• What time should I reach today?\n• Where is my payment?\n• Open my live queue`,
    speechText: hi
      ? `क्षमा करें ${farmerName} जी, मैं केवल कृषि उपज खरीद, मंडी स्लॉट, कतार और भुगतान से संबंधित प्रश्नों में सहायता के लिए अधिकृत हूँ। कृपया खरीद से संबंधित प्रश्न पूछें।`
      : `I apologize ${farmerName}, I am only authorized to assist with crop procurement, mandi slots, queue tokens, and MSP payments. Please ask a procurement-related question.`,
    facts: [
      { label: hi ? "सहायक का दायरा" : "Assistant Scope", value: hi ? "कृषि खरीद एवं मंडी सेवाएँ" : "Agri Procurement & Mandi" },
      { label: hi ? "अधिकार क्षेत्र" : "Domain", value: hi ? "स्लॉट, कतार, भुगतान, केंद्र" : "Slots, Queue, Payments, Centres" },
    ],
    suggestedFollowUps: [
      { textEn: "When is my turn?", textHi: "मेरी बारी कब आएगी?" },
      { textEn: "Which centre is best for me?", textHi: "कौन सा सेंटर अच्छा है?" },
      { textEn: "When will my payment arrive?", textHi: "मेरी payment कब आएगी?" },
      { textEn: "Show my virtual queue", textHi: "मेरा queue खोलो" },
    ],
  };
}

// ─── Speech Synthesis Helper ───

export function speak(text: string, language: Language = "hi"): SpeechSynthesisUtterance | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;

  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = language === "hi" ? "hi-IN" : "en-IN";
  utter.rate = 0.95;
  utter.pitch = 1.0;

  const voices = window.speechSynthesis.getVoices();
  const targetLang = language === "hi" ? "hi" : "en";
  const match = voices.find((v) => v.lang.toLowerCase().startsWith(targetLang));
  if (match) utter.voice = match;

  window.speechSynthesis.speak(utter);
  return utter;
}

export function stopSpeaking() {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}

// ─── Speech Recognition Helper ───

type RecognitionCtor = new () => {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: any) => void) | null;
  onerror: ((e: any) => void) | null;
  onend: (() => void) | null;
};

export function getRecognition(language: Language) {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  if (!Ctor) return null;
  const rec = new Ctor();
  rec.lang = language === "hi" ? "hi-IN" : "en-IN";
  rec.interimResults = false;
  rec.continuous = false;
  return rec;
}
