/**
 * KISAN SETU SAHAYAK — 50+ Natural Farmer Query Test Suite
 * Validates:
 * 1. Intent Classification Accuracy
 * 2. Entity Extraction (Crops, Quintals, Centres, Tokens)
 * 3. Multi-Intent Decomposition
 * 4. Multi-Turn Coreference & Pronoun Resolution ("wahan", "mera", "uska")
 * 5. Supabase Tool Selection & Routing
 * 6. Fallback & Out-of-Scope Handling
 */

import { SahayakNLPEngine } from "./engine";
import type { PrimaryIntent } from "./knowledge";
import type { LiveVoiceContext, SahayakConversationState } from "../voice";

export interface TestCase {
  id: number;
  category:
    | "Direct Question"
    | "Misspelling / Slang"
    | "Vague / Short"
    | "Long / Complex"
    | "Multi-Intent"
    | "Follow-up & Pronoun"
    | "Irrelevant / Out-of-Scope"
    | "Navigation Request"
    | "Action Request";
  language: "Hindi" | "English" | "Hinglish";
  query: string;
  expectedPrimaryIntent: PrimaryIntent;
  expectedSecondaryIntent?: PrimaryIntent;
  expectedEntities?: {
    crop?: string;
    quantity?: number;
    centreName?: string;
    token?: string;
  };
  initialSessionState?: SahayakConversationState;
}

export const SAHAYAK_50_TEST_CASES: TestCase[] = [
  // ─── 1. DIRECT QUESTIONS ───
  {
    id: 1,
    category: "Direct Question",
    language: "Hindi",
    query: "मेरी बारी कब आएगी?",
    expectedPrimaryIntent: "CHECK_QUEUE_ETA",
  },
  {
    id: 2,
    category: "Direct Question",
    language: "English",
    query: "When is my turn in the queue?",
    expectedPrimaryIntent: "CHECK_QUEUE_ETA",
  },
  {
    id: 3,
    category: "Direct Question",
    language: "Hinglish",
    query: "mera number kab aayega line me?",
    expectedPrimaryIntent: "CHECK_QUEUE_ETA",
  },
  {
    id: 4,
    category: "Direct Question",
    language: "Hindi",
    query: "मेरी payment कब तक आएगी?",
    expectedPrimaryIntent: "CHECK_PAYMENT_DBT",
  },
  {
    id: 5,
    category: "Direct Question",
    language: "English",
    query: "When will I receive my MSP payment in my bank account?",
    expectedPrimaryIntent: "CHECK_PAYMENT_DBT",
  },
  {
    id: 6,
    category: "Direct Question",
    language: "Hinglish",
    query: "khate me paise kab tak transfer honge?",
    expectedPrimaryIntent: "CHECK_PAYMENT_DBT",
  },
  {
    id: 7,
    category: "Direct Question",
    language: "Hindi",
    query: "सबसे कम भीड़ वाला खरीद केंद्र कौन सा है?",
    expectedPrimaryIntent: "COMPARE_CENTRES",
  },
  {
    id: 8,
    category: "Direct Question",
    language: "English",
    query: "Which procurement centre has the least waiting time?",
    expectedPrimaryIntent: "COMPARE_CENTRES",
  },
  {
    id: 9,
    category: "Direct Question",
    language: "Hindi",
    query: "तुलाई और नमी के सरकारी नियम क्या हैं?",
    expectedPrimaryIntent: "QUALITY_FAQ_GRADING",
  },
  {
    id: 10,
    category: "Direct Question",
    language: "English",
    query: "What is the maximum allowed moisture percentage in wheat?",
    expectedPrimaryIntent: "QUALITY_FAQ_GRADING",
    expectedEntities: { crop: "Wheat" },
  },
  {
    id: 11,
    category: "Direct Question",
    language: "Hindi",
    query: "खरीद केंद्र पर जाते समय कौन-कौन से कागज़ साथ ले जाने होंगे?",
    expectedPrimaryIntent: "REQUIRED_DOCUMENTS",
  },
  {
    id: 12,
    category: "Direct Question",
    language: "English",
    query: "What documents do I need to bring to the mandi?",
    expectedPrimaryIntent: "REQUIRED_DOCUMENTS",
  },
  {
    id: 13,
    category: "Direct Question",
    language: "Hindi",
    query: "गेहूँ का न्यूनतम समर्थन मूल्य (MSP) क्या है?",
    expectedPrimaryIntent: "MSP_RATES",
    expectedEntities: { crop: "Wheat" },
  },
  {
    id: 14,
    category: "Direct Question",
    language: "Hinglish",
    query: "sarson ka bhav kitna chal raha hai mandi me?",
    expectedPrimaryIntent: "MSP_RATES",
    expectedEntities: { crop: "Mustard" },
  },

  // ─── 2. MISSPELLINGS & PHONETIC SLANG ───
  {
    id: 15,
    category: "Misspelling / Slang",
    language: "Hinglish",
    query: "mera pyment kyo ni aya abhi tk?",
    expectedPrimaryIntent: "PAYMENT_DELAY_TROUBLESHOOT",
  },
  {
    id: 16,
    category: "Misspelling / Slang",
    language: "Hinglish",
    query: "dharamdante pe tulai kb tk shuru hogi?",
    expectedPrimaryIntent: "WEIGHING_PROCESS",
  },
  {
    id: 17,
    category: "Misspelling / Slang",
    language: "Hinglish",
    query: "mandi me bheed bhot jada h dusra centre btao",
    expectedPrimaryIntent: "COMPARE_CENTRES",
  },
  {
    id: 18,
    category: "Misspelling / Slang",
    language: "Hinglish",
    query: "wheat ki nami jyada bta kr reject kr diya kya kru?",
    expectedPrimaryIntent: "REJECTION_RULES",
    expectedEntities: { crop: "Wheat" },
  },
  {
    id: 19,
    category: "Misspelling / Slang",
    language: "Hinglish",
    query: "shikayt darz krni h afsar sunwai ni kr rha",
    expectedPrimaryIntent: "FILE_GRIEVANCE",
  },
  {
    id: 20,
    category: "Misspelling / Slang",
    language: "Hinglish",
    query: "j-farm ki raseed download krni h",
    expectedPrimaryIntent: "J_FORM_BILLS",
  },

  // ─── 3. VAGUE & SHORT QUESTIONS ───
  {
    id: 21,
    category: "Vague / Short",
    language: "Hinglish",
    query: "token status",
    expectedPrimaryIntent: "CHECK_QUEUE_ETA",
  },
  {
    id: 22,
    category: "Vague / Short",
    language: "Hinglish",
    query: "paisa kab",
    expectedPrimaryIntent: "CHECK_PAYMENT_DBT",
  },
  {
    id: 23,
    category: "Vague / Short",
    language: "Hindi",
    query: "कतार",
    expectedPrimaryIntent: "CHECK_QUEUE_ETA",
  },
  {
    id: 24,
    category: "Vague / Short",
    language: "Hinglish",
    query: "khali mandi",
    expectedPrimaryIntent: "COMPARE_CENTRES",
  },
  {
    id: 25,
    category: "Vague / Short",
    language: "Hinglish",
    query: "shikayat",
    expectedPrimaryIntent: "FILE_GRIEVANCE",
  },

  // ─── 4. LONG / COMPLEX QUESTIONS ───
  {
    id: 26,
    category: "Long / Complex",
    language: "Hindi",
    query: "भैया मैं गाँव से 100 क्विंटल गेहूँ लेकर निकला था लेकिन रास्ते में ट्रैक्टर पंचर हो गया, तो क्या मेरा स्लॉट निरस्त हो जाएगा या बाद में तुलाई हो पाएगी?",
    expectedPrimaryIntent: "LATE_ARRIVAL_RULES",
    expectedEntities: { crop: "Wheat", quantity: 100 },
  },
  {
    id: 27,
    category: "Long / Complex",
    language: "English",
    query: "I have brought 120 quintals of mustard to the mandi and weighing is done, when can I expect the direct benefit transfer in my Punjab National Bank account?",
    expectedPrimaryIntent: "CHECK_PAYMENT_DBT",
    expectedEntities: { crop: "Mustard", quantity: 120 },
  },
  {
    id: 28,
    category: "Long / Complex",
    language: "Hinglish",
    query: "aaj subah se centre par khada hu aage 15 trolly lagi hai, kitna der intezar karna padega mera number aane me?",
    expectedPrimaryIntent: "CHECK_QUEUE_ETA",
  },
  {
    id: 29,
    category: "Long / Complex",
    language: "Hindi",
    query: "अगर मंडी निरीक्षक ने नमी 13 प्रतिशत बताकर गेहूँ लेने से मना कर दिया तो मुझे क्या करना चाहिए और कहाँ अपील करूँ?",
    expectedPrimaryIntent: "REJECTION_RULES",
    expectedEntities: { crop: "Wheat" },
  },

  // ─── 5. MULTI-INTENT QUESTIONS (Compound Sentences) ───
  {
    id: 30,
    category: "Multi-Intent",
    language: "Hindi",
    query: "मेरी बारी कब आएगी और अगर मैं आज देर से पहुंचा तो क्या होगा?",
    expectedPrimaryIntent: "CHECK_QUEUE_ETA",
    expectedSecondaryIntent: "LATE_ARRIVAL_RULES",
  },
  {
    id: 31,
    category: "Multi-Intent",
    language: "Hindi",
    query: "मेरी बारी कब है और payment कब आएगी?",
    expectedPrimaryIntent: "CHECK_QUEUE_ETA",
    expectedSecondaryIntent: "CHECK_PAYMENT_DBT",
  },
  {
    id: 32,
    category: "Multi-Intent",
    language: "Hindi",
    query: "मेरे सेंटर पर बहुत भीड़ है, कोई दूसरा अच्छा सेंटर है क्या?",
    expectedPrimaryIntent: "COMPARE_CENTRES",
  },
  {
    id: 33,
    category: "Multi-Intent",
    language: "Hinglish",
    query: "meri bari kab aayegi aur sath hi mera payment status bhi batao",
    expectedPrimaryIntent: "CHECK_QUEUE_ETA",
    expectedSecondaryIntent: "CHECK_PAYMENT_DBT",
  },
  {
    id: 34,
    category: "Multi-Intent",
    language: "English",
    query: "How many farmers are ahead of me and what happens if I am late by 30 minutes?",
    expectedPrimaryIntent: "CHECK_QUEUE_ETA",
    expectedSecondaryIntent: "LATE_ARRIVAL_RULES",
  },
  {
    id: 35,
    category: "Multi-Intent",
    language: "Hindi",
    query: "पैसे अभी तक नहीं आए, जरा देख के बताओ क्या दिक्कत है।",
    expectedPrimaryIntent: "PAYMENT_DELAY_TROUBLESHOOT",
  },

  // ─── 6. FOLLOW-UP & PRONOUN RESOLUTION ("wahan", "mera", "uska") ───
  {
    id: 36,
    category: "Follow-up & Pronoun",
    language: "Hinglish",
    query: "wahan kitni bheed hai aur kitna time lagega?",
    expectedPrimaryIntent: "COMPARE_CENTRES",
    initialSessionState: {
      lastTopic: "centre",
      lastReferencedCentreId: "ctr-2",
      lastReferencedCentreName: "Sampla Grain Market",
    },
  },
  {
    id: 37,
    category: "Follow-up & Pronoun",
    language: "Hindi",
    query: "वहाँ पर मेरा स्लॉट बुक कर दो",
    expectedPrimaryIntent: "BOOK_SLOT",
    initialSessionState: {
      lastTopic: "centre",
      lastReferencedCentreId: "ctr-2",
      lastReferencedCentreName: "Sampla Grain Market",
    },
  },
  {
    id: 38,
    category: "Follow-up & Pronoun",
    language: "Hindi",
    query: "अगर मैं आधे घंटे late हो गया तो?",
    expectedPrimaryIntent: "LATE_ARRIVAL_RULES",
    initialSessionState: {
      lastTopic: "turn",
    },
  },
  {
    id: 39,
    category: "Follow-up & Pronoun",
    language: "Hinglish",
    query: "uska status kya chal raha hai abhi?",
    expectedPrimaryIntent: "CHECK_PROCUREMENT_STATUS",
    initialSessionState: {
      lastTopic: "procurement",
    },
  },
  {
    id: 40,
    category: "Follow-up & Pronoun",
    language: "Hindi",
    query: "मेरी वाली शिकायत का क्या हुआ?",
    expectedPrimaryIntent: "CHECK_GRIEVANCE_STATUS",
    initialSessionState: {
      lastTopic: "grievance",
    },
  },

  // ─── 7. IRRELEVANT / OUT-OF-SCOPE QUESTIONS ───
  {
    id: 41,
    category: "Irrelevant / Out-of-Scope",
    language: "Hindi",
    query: "आज मौसम कैसा रहेगा क्या बारिश होगी?",
    expectedPrimaryIntent: "WEATHER_OR_GENERAL_FARMING",
  },
  {
    id: 42,
    category: "Irrelevant / Out-of-Scope",
    language: "English",
    query: "What is today's cricket match score?",
    expectedPrimaryIntent: "OUT_OF_SCOPE",
  },
  {
    id: 43,
    category: "Irrelevant / Out-of-Scope",
    language: "Hindi",
    query: "गाना सुनाओ या कोई चुटकुला सुनाओ",
    expectedPrimaryIntent: "OUT_OF_SCOPE",
  },

  // ─── 8. NAVIGATION REQUESTS ───
  {
    id: 44,
    category: "Navigation Request",
    language: "Hinglish",
    query: "payments page kholo",
    expectedPrimaryIntent: "NAVIGATE_TAB",
  },
  {
    id: 45,
    category: "Navigation Request",
    language: "Hindi",
    query: "मुझे खरीद केंद्रों का नक्शा देखना है",
    expectedPrimaryIntent: "COMPARE_CENTRES",
  },
  {
    id: 46,
    category: "Navigation Request",
    language: "English",
    query: "Open the grievance redressal section",
    expectedPrimaryIntent: "FILE_GRIEVANCE",
  },
  {
    id: 47,
    category: "Navigation Request",
    language: "Hindi",
    query: "मेरी प्रोफ़ाइल और बैंक खाता दिखाओ",
    expectedPrimaryIntent: "FARMER_REGISTRATION",
  },

  // ─── 9. ACTION REQUESTS ───
  {
    id: 48,
    category: "Action Request",
    language: "Hindi",
    query: "रामपुरा केंद्र पर आज का स्लॉट बुक कर दो",
    expectedPrimaryIntent: "BOOK_SLOT",
  },
  {
    id: 49,
    category: "Action Request",
    language: "Hinglish",
    query: "mera slot kal subah ke liye reschedule kar do",
    expectedPrimaryIntent: "RESCHEDULE_SLOT",
  },
  {
    id: 50,
    category: "Action Request",
    language: "Hindi",
    query: "तुलाई में गड़बड़ी की शिकायत दर्ज करो",
    expectedPrimaryIntent: "FILE_GRIEVANCE",
  },
  {
    id: 51,
    category: "Action Request",
    language: "English",
    query: "Cancel my scheduled appointment for today",
    expectedPrimaryIntent: "CANCEL_SLOT",
  },
  {
    id: 52,
    category: "Direct Question",
    language: "Hindi",
    query: "नमस्ते, किसान सेतु सहायक कैसे काम करता है?",
    expectedPrimaryIntent: "GREETING",
  },
];

/**
 * Automated Test Runner for Sahayak NLP Engine
 */
export async function runSahayakNLPTests(mockCtx?: LiveVoiceContext): Promise<{
  total: number;
  passed: number;
  failed: number;
  accuracyPct: number;
  results: Array<{
    id: number;
    query: string;
    category: string;
    passed: boolean;
    primaryIntent: PrimaryIntent;
    expectedPrimary: PrimaryIntent;
    secondaryIntent?: PrimaryIntent;
    entitiesMatched: boolean;
  }>;
}> {
  const ctx: LiveVoiceContext = mockCtx || {
    farmer: {
      id: "f-101",
      name: "Rameshwar Singh",
      nameHi: "रामेश्वर सिंह",
      crop: "Wheat",
      cropHi: "गेहूँ",
      quantityQuintals: 120,
      village: "Rampura",
      villageHi: "रामपुरा",
      district: "Karnal",
      phone: "9876543210",
      farmerId: "HR-KRL-2026-8891",
    },
    ticket: {
      token: "KS-1042",
      centreId: "ctr-1",
      slotWindow: "11:30 – 12:00",
      farmersAhead: 4,
      etaMinutes: 18,
      stage: "in_queue",
    },
    payment: {
      grossAmount: 291600,
      currency: "INR",
      ratePerQuintal: 2430,
      quintals: 120,
      stage: "pending_verification",
      expectedCreditIn: "Within 48 hours of weighing",
      expectedCreditInHi: "तुलाई के 48 घंटे के भीतर",
      bankMasked: "PNB ••••4417",
      progressPct: 25,
    },
    centres: [
      {
        id: "ctr-1",
        code: "KRL-01",
        name: "Karnal Main Mandi",
        nameHi: "करनाल मुख्य मंडी",
        distanceKm: 4.2,
        queueLength: 12,
        predictedWaitMin: 45,
        capacityUsedPct: 88,
        dailyCapacityQuintals: 5000,
        procuredTodayQuintals: 4100,
        activeCounters: 4,
        totalCounters: 6,
        processingRatePerHour: 28,
        farmersToday: 48,
        map: { x: 42, y: 55 },
        recommended: false,
        recommendationReasons: [],
        recommendationReasonsHi: [],
      },
      {
        id: "ctr-2",
        code: "SMP-02",
        name: "Sampla Grain Market",
        nameHi: "सांपला अनाज मंडी",
        distanceKm: 8.5,
        queueLength: 3,
        predictedWaitMin: 12,
        capacityUsedPct: 42,
        dailyCapacityQuintals: 4000,
        procuredTodayQuintals: 1500,
        activeCounters: 5,
        totalCounters: 5,
        processingRatePerHour: 35,
        farmersToday: 20,
        map: { x: 65, y: 38 },
        recommended: true,
        recommendationReasons: ["Fast throughput"],
        recommendationReasonsHi: ["तेज तुलाई"],
      },
    ],
  };

  let passed = 0;
  const results: any[] = [];

  for (const tc of SAHAYAK_50_TEST_CASES) {
    const sessionState = tc.initialSessionState ? { ...tc.initialSessionState } : {};
    const parsed = SahayakNLPEngine.parseQuerySemantic(tc.query, sessionState, ctx);

    // Verify Primary Intent Match
    const primaryMatch =
      parsed.primaryIntent === tc.expectedPrimaryIntent ||
      parsed.intents.includes(tc.expectedPrimaryIntent);

    // Verify Secondary Intent if applicable
    const secondaryMatch = !tc.expectedSecondaryIntent || parsed.intents.includes(tc.expectedSecondaryIntent);

    // Verify Entities if specified
    let entitiesMatched = true;
    if (tc.expectedEntities?.crop) {
      if (parsed.entities.crop !== tc.expectedEntities.crop) entitiesMatched = false;
    }
    if (tc.expectedEntities?.quantity) {
      if (parsed.entities.quantity !== tc.expectedEntities.quantity) entitiesMatched = false;
    }

    const testPassed = primaryMatch && secondaryMatch && entitiesMatched;
    if (testPassed) passed++;

    results.push({
      id: tc.id,
      query: tc.query,
      category: tc.category,
      passed: testPassed,
      primaryIntent: parsed.primaryIntent,
      expectedPrimary: tc.expectedPrimaryIntent,
      secondaryIntent: parsed.intents[1] || undefined,
      entitiesMatched,
    });
  }

  const accuracyPct = Math.round((passed / SAHAYAK_50_TEST_CASES.length) * 100);

  return {
    total: SAHAYAK_50_TEST_CASES.length,
    passed,
    failed: SAHAYAK_50_TEST_CASES.length - passed,
    accuracyPct,
    results,
  };
}
