/**
 * KISAN SETU SAHAYAK — Dynamic Question Discovery Engine
 * 
 * Generates personalized, contextual question suggestions dynamically from:
 * 1. Current Farmer State (Profile, Crop, Quantity)
 * 2. Active Procurement Stage (Scheduled, In Queue, Weighing, Accepted, Paid)
 * 3. Real Supabase Live Data (Ticket, Slot, Payment, Centres, Grievances)
 * 4. Active Page / Tab Context (Queue, Centres, Payments, Timeline, Grievances)
 * 5. Conversation Memory (Smart Next-Step Follow-Ups)
 */

import type {
  Farmer,
  Grievance,
  Language,
  PaymentStatus,
  ProcurementCentre,
  QueueTicket,
  SlotSuggestion,
  TimelineStep,
} from "../types";
import type { SahayakConversationState, SahayakResponse } from "../voice";

export interface SuggestedQuestion {
  id: string;
  category: "contextual" | "page_aware" | "follow_up" | "discovery";
  categoryLabelEn: string;
  categoryLabelHi: string;
  textEn: string;
  textHi: string;
  icon: string;
  tagEn?: string;
  tagHi?: string;
  targetTab?: "home" | "centres" | "queue" | "timeline" | "payments" | "grievances" | "help" | "profile";
}

export interface DynamicDiscoveryOptions {
  farmer?: Farmer | null;
  ticket?: QueueTicket | null;
  slot?: SlotSuggestion | null;
  payment?: PaymentStatus | null;
  centres?: ProcurementCentre[];
  timeline?: TimelineStep[];
  grievances?: Grievance[];
  currentTab?: string;
  sessionState?: SahayakConversationState;
  lastResponse?: SahayakResponse | null;
}

export class SahayakQuestionGenerator {
  /**
   * Generates dynamic, highly relevant questions for the farmer's current real-time state.
   */
  static getDynamicSuggestions(opts: DynamicDiscoveryOptions, lang: Language): SuggestedQuestion[] {
    const { farmer, ticket, slot, payment, centres, timeline, grievances, currentTab } = opts;
    const suggestions: SuggestedQuestion[] = [];
    const addedTexts = new Set<string>();

    const addSuggestion = (s: SuggestedQuestion) => {
      if (!addedTexts.has(s.textHi)) {
        addedTexts.add(s.textHi);
        suggestions.push(s);
      }
    };

    const cropNameHi = farmer?.cropHi || farmer?.crop || "फसल";
    const cropNameEn = farmer?.crop || "crop";
    const hasActiveTicket = ticket && ticket.stage !== "done";
    const hasSlot = Boolean(slot && !slot.id.startsWith("mock"));
    const activeTimelineStep = timeline?.find((t) => t.state === "active");

    // ─── 1. ACTIVE COMPLAINT CONTEXT ───
    if (grievances && grievances.length > 0) {
      const activeGrievance = grievances.find((g) => g.status === "new" || g.status === "in_progress" || g.status === "pending");
      if (activeGrievance) {
        addSuggestion({
          id: "grv_status",
          category: "contextual",
          categoryLabelEn: "Active Grievance",
          categoryLabelHi: "सक्रिय शिकायत",
          textEn: "What is the status of my registered grievance?",
          textHi: "मेरी वाली शिकायत का क्या हुआ?",
          icon: "📢",
          tagEn: "Complaint Status",
          tagHi: "शिकायत स्थिति",
          targetTab: "grievances",
        });
      }
    }

    // ─── 2. ACTIVE QUEUE / IN-PROGRESS STAGE CONTEXT ───
    if (hasActiveTicket) {
      if (ticket.stage === "scheduled" || ticket.stage === "in_queue") {
        addSuggestion({
          id: "queue_eta",
          category: "contextual",
          categoryLabelEn: "Live Queue",
          categoryLabelHi: "लाइव कतार",
          textEn: `How many farmers are ahead of token ${ticket.token}?`,
          textHi: `मेरे टोकन ${ticket.token} के आगे कितने किसान हैं?`,
          icon: "⏳",
          tagEn: "Queue ETA",
          tagHi: "कतार प्रतीक्षा",
          targetTab: "queue",
        });

        addSuggestion({
          id: "late_arrival",
          category: "contextual",
          categoryLabelEn: "Arrival Policy",
          categoryLabelHi: "आगमन नियम",
          textEn: "What if I arrive late today due to transport delays?",
          textHi: "अगर मैं आज देर से पहुँचा तो क्या होगा?",
          icon: "🚜",
          tagEn: "Grace Period",
          tagHi: "ग्रेस समय",
          targetTab: "queue",
        });

        addSuggestion({
          id: "centre_crowd",
          category: "contextual",
          categoryLabelEn: "Centre Status",
          categoryLabelHi: "केंद्र स्थिति",
          textEn: "How crowded is my procurement centre right now?",
          textHi: "मेरे सेंटर पर अभी कितनी भीड़ है?",
          icon: "🏢",
          tagEn: "Live Crowd",
          tagHi: "केंद्र भीड़",
          targetTab: "centres",
        });
      } else if (ticket.stage === "weighing" || activeTimelineStep?.id === "step-4") {
        addSuggestion({
          id: "weighing_rules",
          category: "contextual",
          categoryLabelEn: "Weighing",
          categoryLabelHi: "धर्मकांटा तुलाई",
          textEn: "How is gross and tare weighing recorded?",
          textHi: "इलेक्ट्रॉनिक धर्मकांटे पर वजन कैसे होता है?",
          icon: "⚖️",
          tagEn: "Weighbridge",
          tagHi: "धर्मकांटा",
          targetTab: "timeline",
        });

        addSuggestion({
          id: "moisture_faq",
          category: "contextual",
          categoryLabelEn: "Quality Check",
          categoryLabelHi: "गुणवत्ता जाँच",
          textEn: `What is the allowed moisture limit for ${cropNameEn}?`,
          textHi: `${cropNameHi} में सरकारी मानक (FAQ) नमी कितनी मान्य है?`,
          icon: "🧪",
          tagEn: "FAQ Moisture",
          tagHi: "नमी मानक",
          targetTab: "timeline",
        });
      } else if (ticket.stage === "accepted" || ticket.stage === "done" || activeTimelineStep?.id === "step-6") {
        addSuggestion({
          id: "j_form_receipt",
          category: "contextual",
          categoryLabelEn: "J-Form Receipt",
          categoryLabelHi: "जे-फॉर्म रसीद",
          textEn: "Where can I download my digital J-Form invoice?",
          textHi: "मेरी डिजिटल खरीद रसीद (J-Form) कहाँ से डाउनलोड करूँ?",
          icon: "📄",
          tagEn: "Tax Invoice",
          tagHi: "खरीद रसीद",
          targetTab: "timeline",
        });

        addSuggestion({
          id: "payout_timeline",
          category: "contextual",
          categoryLabelEn: "DBT Payment",
          categoryLabelHi: "बैंक भुगतान",
          textEn: "When will the MSP payment credit to my bank account?",
          textHi: "मेरी payment कब तक बैंक खाते में आएगी?",
          icon: "💳",
          tagEn: "PFMS DBT",
          tagHi: "डीबीटी ट्रांसफर",
          targetTab: "payments",
        });
      }
    }

    // ─── 3. PAYMENT STATUS CONTEXT ───
    if (payment) {
      if (payment.stage === "pending_verification" || payment.stage === "pfms_processing") {
        addSuggestion({
          id: "payment_status",
          category: "contextual",
          categoryLabelEn: "Payment Tracking",
          categoryLabelHi: "भुगतान स्थिति",
          textEn: `What is the current stage of my ₹${payment.grossAmount.toLocaleString("en-IN")} MSP payout?`,
          textHi: `मेरी ₹${payment.grossAmount.toLocaleString("en-IN")} की payment अभी किस stage पर है?`,
          icon: "💰",
          tagEn: "Payout Stage",
          tagHi: "भुगतान चरण",
          targetTab: "payments",
        });

        addSuggestion({
          id: "payment_delay",
          category: "contextual",
          categoryLabelEn: "Payment Help",
          categoryLabelHi: "भुगतान जाँच",
          textEn: "Why is payment taking time? Check for bank issues.",
          textHi: "पैसे अभी तक नहीं आए, जरा देख के बताओ क्या दिक्कत है।",
          icon: "🔍",
          tagEn: "Bank Audit",
          tagHi: "बैंक ऑडिट",
          targetTab: "payments",
        });
      }
    }

    // ─── 4. NO ACTIVE BOOKING / ONBOARDING CONTEXT ───
    if (!hasActiveTicket && !hasSlot) {
      addSuggestion({
        id: "least_crowded_centre",
        category: "contextual",
        categoryLabelEn: "Optimal Centre",
        categoryLabelHi: "नजदीकी केंद्र",
        textEn: "Which centre is least crowded and closest to my village?",
        textHi: "सबसे कम भीड़ वाला खरीद केंद्र कौन सा है?",
        icon: "📍",
        tagEn: "Nearest Mandi",
        tagHi: "नजदीकी केंद्र",
        targetTab: "centres",
      });

      addSuggestion({
        id: "how_to_book",
        category: "contextual",
        categoryLabelEn: "Slot Booking",
        categoryLabelHi: "स्लॉट बुकिंग",
        textEn: `Book an arrival slot for my ${cropNameEn}`,
        textHi: `${cropNameHi} की तुलाई के लिए आज का स्लॉट बुक कर दो`,
        icon: "📅",
        tagEn: "Instant Slot",
        tagHi: "स्लॉट बुक",
        targetTab: "centres",
      });

      addSuggestion({
        id: "msp_rate_crop",
        category: "contextual",
        categoryLabelEn: "MSP Price",
        categoryLabelHi: "सरकारी भाव",
        textEn: `What is the current government MSP rate for ${cropNameEn}?`,
        textHi: `${cropNameHi} का न्यूनतम समर्थन मूल्य (MSP) क्या है?`,
        icon: "🌾",
        tagEn: "MSP Rate",
        tagHi: "एमएसपी भाव",
      });

      addSuggestion({
        id: "required_docs",
        category: "contextual",
        categoryLabelEn: "Checklist",
        categoryLabelHi: "दस्तावेज",
        textEn: "What documents must I carry to the procurement centre?",
        textHi: "खरीद केंद्र पर जाते समय कौन-कौन से कागज़ साथ ले जाने होंगे?",
        icon: "📑",
        tagEn: "Documents",
        tagHi: "कागजात",
        targetTab: "help",
      });
    }

    // ─── 5. PAGE-AWARE BOOST ───
    if (currentTab === "centres") {
      addSuggestion({
        id: "page_centres_compare",
        category: "page_aware",
        categoryLabelEn: "Current Page",
        categoryLabelHi: "वर्तमान पेज",
        textEn: "Compare crowd and wait times across all nearby centres",
        textHi: "मेरे सेंटर पर बहुत भीड़ है, कोई दूसरा अच्छा सेंटर है क्या?",
        icon: "🗺️",
        tagEn: "Centres Map",
        tagHi: "केंद्र तुलना",
      });
      addSuggestion({
        id: "page_centres_reschedule",
        category: "page_aware",
        categoryLabelEn: "Current Page",
        categoryLabelHi: "वर्तमान पेज",
        textEn: "What are the rules for rescheduling my slot booking?",
        textHi: "क्या मैं अपना स्लॉट बदल (reschedule) सकता हूँ?",
        icon: "🔄",
        tagEn: "Reschedule",
        tagHi: "समय बदलाव",
      });
    } else if (currentTab === "payments") {
      addSuggestion({
        id: "page_pay_bank",
        category: "page_aware",
        categoryLabelEn: "Current Page",
        categoryLabelHi: "वर्तमान पेज",
        textEn: "Is my bank account properly linked with Aadhaar NPCI for DBT?",
        textHi: "डीबीटी बैंक खाता भुगतान और पीएफएमएस के क्या नियम हैं?",
        icon: "🏦",
        tagEn: "DBT NPCI",
        tagHi: "डीबीटी सीडिंग",
      });
    } else if (currentTab === "queue") {
      addSuggestion({
        id: "page_queue_counter",
        category: "page_aware",
        categoryLabelEn: "Current Page",
        categoryLabelHi: "वर्तमान पेज",
        textEn: "How will I know when my counter is called?",
        textHi: "काउंटर पर बारी आने पर मुझे कैसे पता चलेगा?",
        icon: "🔔",
        tagEn: "Counter Alert",
        tagHi: "काउंटर बुलावा",
      });
    } else if (currentTab === "grievances") {
      addSuggestion({
        id: "page_grv_file",
        category: "page_aware",
        categoryLabelEn: "Current Page",
        categoryLabelHi: "वर्तमान पेज",
        textEn: "How do I report unfair grading or weighbridge dispute?",
        textHi: "तुलाई में गड़बड़ी की शिकायत दर्ज करो",
        icon: "✍️",
        tagEn: "File Grievance",
        tagHi: "शिकायत दर्ज",
      });
    }

    // ─── 6. FALLBACK TO BROAD ESSENTIALS IF FEWER THAN 4 ───
    if (suggestions.length < 4) {
      addSuggestion({
        id: "gen_turn",
        category: "discovery",
        categoryLabelEn: "General",
        categoryLabelHi: "सामान्य",
        textEn: "When is my turn?",
        textHi: "मेरी बारी कब आएगी?",
        icon: "🕒",
        tagEn: "Queue",
        tagHi: "कतार",
        targetTab: "queue",
      });
      addSuggestion({
        id: "gen_docs",
        category: "discovery",
        categoryLabelEn: "General",
        categoryLabelHi: "सामान्य",
        textEn: "What documents do I need to bring to the mandi?",
        textHi: "मंडी में कौन-कौन से दस्तावेज चाहिए?",
        icon: "📋",
        tagEn: "Checklist",
        tagHi: "चेकलिस्ट",
      });
      addSuggestion({
        id: "gen_payment",
        category: "discovery",
        categoryLabelEn: "General",
        categoryLabelHi: "सामान्य",
        textEn: "When will payment come?",
        textHi: "मेरी payment कब तक आएगी?",
        icon: "💵",
        tagEn: "Payment",
        tagHi: "भुगतान",
        targetTab: "payments",
      });
      addSuggestion({
        id: "gen_centre",
        category: "discovery",
        categoryLabelEn: "General",
        categoryLabelHi: "सामान्य",
        textEn: "Which centre is least crowded?",
        textHi: "सबसे कम भीड़ वाला केंद्र कौन सा है?",
        icon: "🏢",
        tagEn: "Centres",
        tagHi: "केंद्र",
        targetTab: "centres",
      });
    }

    return suggestions;
  }

  /**
   * Returns dual-stream questions for smooth, continuous moving ticker animation
   */
  static getMovingQuestionStreams(opts: DynamicDiscoveryOptions, lang: Language): {
    row1: SuggestedQuestion[];
    row2: SuggestedQuestion[];
  } {
    const primary = this.getDynamicSuggestions(opts, lang);
    const catalog = this.getCategorizedKnowledgeCatalog(opts.farmer?.crop, opts.farmer?.cropHi);

    const pool: SuggestedQuestion[] = [...primary];
    const seen = new Set(primary.map((p) => p.textHi));

    // Fill pool with items from catalog
    for (const cat of catalog) {
      for (const q of cat.questions) {
        if (!seen.has(q.textHi)) {
          seen.add(q.textHi);
          pool.push({
            id: `cat_${pool.length}`,
            category: "discovery",
            categoryLabelEn: cat.categoryTitleEn,
            categoryLabelHi: cat.categoryTitleHi,
            textEn: q.textEn,
            textHi: q.textHi,
            icon: cat.icon,
            tagEn: cat.categoryTitleEn.split(" ")[0],
            tagHi: cat.categoryTitleHi.split(" ")[0],
          });
        }
      }
    }

    const row1: SuggestedQuestion[] = [];
    const row2: SuggestedQuestion[] = [];

    pool.forEach((item, idx) => {
      if (idx % 2 === 0) row1.push(item);
      else row2.push(item);
    });

    return { row1, row2 };
  }

  /**
   * Generates dynamic follow-ups based on the assistant's previous answer topic.
   */
  static getSmartFollowUps(lastTopic: string | null | undefined, lang: Language): Array<{ textEn: string; textHi: string; icon: string }> {
    switch (lastTopic) {
      case "turn":
        return [
          { textEn: "What if I arrive late today?", textHi: "अगर मैं आज देर से पहुँचा तो क्या होगा?", icon: "🚜" },
          { textEn: "How crowded is my centre right now?", textHi: "मेरे सेंटर पर अभी कितनी भीड़ है?", icon: "🏢" },
          { textEn: "What documents do I show at the gate?", textHi: "गेट पर क्या-क्या दस्तावेज दिखाने होंगे?", icon: "📑" },
        ];

      case "payment":
        return [
          { textEn: "Where can I download my digital J-Form receipt?", textHi: "मेरी डिजिटल खरीद रसीद (J-Form) कहाँ से मिलेगी?", icon: "📄" },
          { textEn: "Why is my payment pending? Check for issues.", textHi: "पैसे अभी तक नहीं आए, जरा देख के बताओ क्या दिक्कत है।", icon: "🔍" },
          { textEn: "Show my registered bank account and profile", textHi: "मेरी प्रोफ़ाइल और बैंक खाता दिखाओ", icon: "🏦" },
        ];

      case "centre":
        return [
          { textEn: "Book an arrival slot at this centre", textHi: "वहाँ पर मेरा स्लॉट बुक कर दो", icon: "📅" },
          { textEn: "What happens if I need to reschedule?", textHi: "क्या मैं अपना स्लॉट बदल (reschedule) सकता हूँ?", icon: "🔄" },
          { textEn: "What are the allowed moisture FAQ rules?", textHi: "तुलाई और नमी के सरकारी नियम क्या हैं?", icon: "🧪" },
        ];

      case "slot":
        return [
          { textEn: "What time should I reach the centre?", textHi: "मुझे कितने बजे मुख्य गेट पर पहुँचना है?", icon: "⏰" },
          { textEn: "What documents must I carry?", textHi: "मंडी में कौन-कौन से दस्तावेज ले जाने होंगे?", icon: "📋" },
          { textEn: "What if my tractor breaks down on the way?", textHi: "अगर रास्ते में गाड़ी खराब हो गई तो क्या होगा?", icon: "🚜" },
        ];

      case "weighing":
        return [
          { textEn: "What if my grain moisture exceeds 12%?", textHi: "अगर नमी 12% से ज्यादा हो तो क्या रिजेक्ट होगा?", icon: "🌾" },
          { textEn: "Can I use mandi sieves to clean and re-test?", textHi: "क्या रिजेक्ट होने पर छलना में सफाई करवा सकते हैं?", icon: "⚖️" },
          { textEn: "When is the digital J-Form generated?", textHi: "तुलाई के बाद जे-फॉर्म कब जारी होगा?", icon: "📄" },
        ];

      case "grievance":
        return [
          { textEn: "What is the Kisan Helpline phone number?", textHi: "किसान हेल्पलाइन का टोल-फ्री नंबर क्या है?", icon: "📞" },
          { textEn: "How are weighing disputes escalated to District Admin?", textHi: "तुलाई विवाद की शिकायत जिला नियंत्रक को कैसे जाती है?", icon: "🏛️" },
          { textEn: "Check my grievance resolution status", textHi: "मेरी वाली शिकायत का स्टेटस चेक करो", icon: "📢" },
        ];

      default:
        return [
          { textEn: "When is my turn in queue?", textHi: "मेरी बारी कब आएगी?", icon: "⏳" },
          { textEn: "Which centre is least crowded?", textHi: "सबसे कम भीड़ वाला केंद्र कौन सा है?", icon: "🏢" },
          { textEn: "When will my payment credit?", textHi: "मेरी payment कब तक आएगी?", icon: "💳" },
        ];
    }
  }

  /**
   * Returns complete categorized question catalog across all 18 Kisan Setu domains for discovery.
   */
  static getCategorizedKnowledgeCatalog(farmerCrop?: string, farmerCropHi?: string): Array<{
    id: string;
    categoryTitleEn: string;
    categoryTitleHi: string;
    icon: string;
    questions: Array<{ textEn: string; textHi: string }>;
  }> {
    const crop = farmerCrop || "Wheat";
    const cropHi = farmerCropHi || "गेहूँ";

    return [
      {
        id: "queue",
        categoryTitleEn: "Virtual Queue & Arrival Rules",
        categoryTitleHi: "लाइव कतार एवं आगमन नियम",
        icon: "⏳",
        questions: [
          { textEn: "When is my turn in the queue?", textHi: "मेरी बारी कब आएगी?" },
          { textEn: "What happens if I arrive late today?", textHi: "अगर मैं आज देर से पहुँचा तो क्या होगा?" },
          { textEn: "How will I know when my counter is called?", textHi: "काउंटर पर बारी आने पर मुझे कैसे पता चलेगा?" },
          { textEn: "What is the gate entry procedure at the centre?", textHi: "मुख्य द्वार पर प्रवेश की क्या प्रक्रिया है?" },
        ],
      },
      {
        id: "centres",
        categoryTitleEn: "Centres & Slot Booking",
        categoryTitleHi: "खरीद केंद्र एवं स्लॉट बुकिंग",
        icon: "🏢",
        questions: [
          { textEn: "Which procurement centre has the least waiting time?", textHi: "सबसे कम भीड़ वाला खरीद केंद्र कौन सा है?" },
          { textEn: "My centre is crowded, is there a better alternative?", textHi: "मेरे सेंटर पर बहुत भीड़ है, कोई दूसरा अच्छा सेंटर है क्या?" },
          { textEn: `Book a slot for my ${crop}`, textHi: `${cropHi} के लिए आज का स्लॉट बुक कर दो` },
          { textEn: "Can I reschedule my appointment for tomorrow?", textHi: "मेरा स्लॉट कल सुबह के लिए reschedule कर दो" },
        ],
      },
      {
        id: "weighing",
        categoryTitleEn: "Electronic Weighing & Quality (FAQ)",
        categoryTitleHi: "धर्मकांटा तुलाई एवं गुणवत्ता (FAQ)",
        icon: "⚖️",
        questions: [
          { textEn: "How is gross and tare weighing conducted?", textHi: "इलेक्ट्रॉनिक धर्मकांटे पर तुलाई कैसे होती है?" },
          { textEn: "What are the government FAQ moisture standards?", textHi: "तुलाई और नमी के सरकारी नियम क्या हैं?" },
          { textEn: "What to do if grain is rejected due to high moisture?", textHi: "नमी ज्यादा होने पर रिजेक्ट कर दिया तो क्या करें?" },
          { textEn: "Can I use mandi sieves to clean and re-test grain?", textHi: "क्या मंडी में छलना से सफाई करवा के दोबारा तुलाई हो सकती है?" },
        ],
      },
      {
        id: "payment",
        categoryTitleEn: "MSP Payouts & DBT Banking",
        categoryTitleHi: "एमएसपी भुगतान एवं डीबीटी बैंक",
        icon: "💳",
        questions: [
          { textEn: `What is the current government MSP rate for ${crop}?`, textHi: `${cropHi} का न्यूनतम समर्थन मूल्य (MSP) क्या है?` },
          { textEn: "When will the payment credit to my bank account?", textHi: "मेरी payment कब तक आएगी?" },
          { textEn: "Why is my payment pending? Check for issues.", textHi: "पैसे अभी तक नहीं आए, जरा देख के बताओ क्या दिक्कत है।" },
          { textEn: "Where can I download my digital J-Form invoice?", textHi: "मेरी डिजिटल खरीद रसीद (J-Form) कहाँ से मिलेगी?" },
        ],
      },
      {
        id: "grievance",
        categoryTitleEn: "Grievances, Documents & Profile",
        categoryTitleHi: "शिकायत, दस्तावेज एवं प्रोफ़ाइल",
        icon: "📋",
        questions: [
          { textEn: "What documents do I need to bring to the mandi?", textHi: "खरीद केंद्र पर जाते समय कौन-कौन से कागज़ साथ ले जाने होंगे?" },
          { textEn: "How do I lodge a grievance with the District Officer?", textHi: "तुलाई में गड़बड़ी की शिकायत दर्ज करो" },
          { textEn: "What is the status of my registered grievance?", textHi: "मेरी वाली शिकायत का क्या हुआ?" },
          { textEn: "Show my registered farmer profile and bank details", textHi: "मेरी प्रोफ़ाइल और बैंक खाता दिखाओ" },
        ],
      },
    ];
  }
}
