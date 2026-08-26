/**
 * KISAN SETU SAHAYAK — Comprehensive Domain Knowledge Layer
 * Covers 18 core agricultural procurement domains for government MSP mandis.
 * Provides semantic knowledge, rules, tolerances, MSP prices, and multilingual vocabulary.
 */

export type PrimaryIntent =
  | "GREETING"
  | "CHECK_QUEUE_ETA"
  | "LATE_ARRIVAL_RULES"
  | "CHECK_PAYMENT_DBT"
  | "PAYMENT_DELAY_TROUBLESHOOT"
  | "COMPARE_CENTRES"
  | "FIND_NEAREST_CENTRE"
  | "BOOK_SLOT"
  | "RESCHEDULE_SLOT"
  | "CANCEL_SLOT"
  | "CHECK_PROCUREMENT_STATUS"
  | "WEIGHING_PROCESS"
  | "QUALITY_FAQ_GRADING"
  | "REJECTION_RULES"
  | "J_FORM_BILLS"
  | "REQUIRED_DOCUMENTS"
  | "FILE_GRIEVANCE"
  | "CHECK_GRIEVANCE_STATUS"
  | "FARMER_REGISTRATION"
  | "MSP_RATES"
  | "PLATFORM_HELP"
  | "NAVIGATE_TAB"
  | "WEATHER_OR_GENERAL_FARMING"
  | "OUT_OF_SCOPE"
  | "UNKNOWN";

export interface DomainTopic {
  id: string;
  titleEn: string;
  titleHi: string;
  summaryEn: string;
  summaryHi: string;
  keyPointsEn: string[];
  keyPointsHi: string[];
  rules: Record<string, string>;
}

// ─── 18 CORE PROCUREMENT DOMAINS ───
export const DOMAIN_KNOWLEDGE_BASE: Record<string, DomainTopic> = {
  REGISTRATION: {
    id: "registration",
    titleEn: "Farmer Registration & Land Verification",
    titleHi: "किसान पंजीकरण एवं भूमि सत्यापन",
    summaryEn: "Farmer registration is verified through PM-KISAN, State Agriculture Portals, and Land Revenue Records (Jamabandi/Girdawari).",
    summaryHi: "किसान पंजीकरण पीएम-किसान, राज्य कृषि पोर्टल एवं राजस्व रिकॉर्ड (जमाबंदी/गिरदावरी) द्वारा सत्यापित होता है।",
    keyPointsEn: [
      "Aadhaar linkage with bank account and active mobile number is mandatory.",
      "Land record (Khasra/Khatauni) verifies cultivable area and estimated crop yield.",
      "Crop sowing certificate (Girdawari) ensures genuine produce procurement.",
    ],
    keyPointsHi: [
      "आधार कार्ड, बैंक खाता और मोबाइल नंबर लिंक होना अनिवार्य है।",
      "खसरा/खतौनी द्वारा कृषि योग्य भूमि और फसल उपज का सत्यापन होता है।",
      "गिरदावरी द्वारा वास्तविक फसल उत्पादन की पुष्टि होती है।",
    ],
    rules: {
      maxQuantityPerAcreWheat: "18 to 22 Quintals per acre depending on state policy",
      maxQuantityPerAcrePaddy: "20 to 25 Quintals per acre",
    },
  },

  MSP_RATES: {
    id: "msp_rates",
    titleEn: "Minimum Support Price (MSP) Rates (2025-26 Season)",
    titleHi: "न्यूनतम समर्थन मूल्य (MSP) दरें (2025-26)",
    summaryEn: "Official government procurement prices per quintal fixed by CACP / Government of India.",
    summaryHi: "भारत सरकार द्वारा निर्धारित आधिकारिक न्यूनतम समर्थन मूल्य (प्रति क्विंटल)।",
    keyPointsEn: [
      "Wheat (गेहूँ): ₹2,430 / Quintal",
      "Paddy (धान - Common): ₹2,300 / Quintal (Grade A: ₹2,320 / Quintal)",
      "Mustard (सरसों): ₹5,650 / Quintal",
      "Gram (चना): ₹5,440 / Quintal",
      "Barley (जौ): ₹1,850 / Quintal",
    ],
    keyPointsHi: [
      "गेहूँ: ₹2,430 प्रति क्विंटल",
      "धान (सामान्य): ₹2,300 प्रति क्विंटल (ग्रेड ए: ₹2,320 प्रति क्विंटल)",
      "सरसों: ₹5,650 प्रति क्विंटल",
      "चना: ₹5,440 प्रति क्विंटल",
      "जौ: ₹1,850 प्रति क्विंटल",
    ],
    rules: {
      Wheat: "₹2,430/qtl",
      Paddy: "₹2,300/qtl",
      Mustard: "₹5,650/qtl",
      Gram: "₹5,440/qtl",
    },
  },

  CENTRE_SELECTION: {
    id: "centre_selection",
    titleEn: "Procurement Centre Selection & Traffic Intelligence",
    titleHi: "खरीद केंद्र चयन एवं भीड़ प्रबंधन",
    summaryEn: "Kisan Setu dynamically recommends centres based on distance, live queue length, active weighbridges, and processing throughput.",
    summaryHi: "किसान सेतु दूरी, लाइव कतार, सक्रिय धर्मकांटे एवं प्रोसेसिंग गति के आधार पर सबसे उपयुक्त केंद्र सुझाता है।",
    keyPointsEn: [
      "Centres with capacity utilization below 75% are highlighted for fastest processing.",
      "Dynamic diversion prevents tractor-trolley congestion on highways.",
      "Operating hours: 08:00 AM to 06:00 PM on all official procurement days.",
    ],
    keyPointsHi: [
      "75% से कम क्षमता वाले केंद्रों पर सबसे तेज काम होता है।",
      "भीड़ डायवर्जन से मुख्य मार्गों पर ट्रैक्टर-ट्रॉली का जाम नहीं लगता।",
      "कार्य समय: सुबह 08:00 बजे से शाम 06:00 बजे तक।",
    ],
    rules: {
      operatingHours: "08:00 AM - 06:00 PM",
      greenThresholdPct: "Below 75% capacity",
      redThresholdPct: "Above 90% capacity",
    },
  },

  SMART_SLOTS: {
    id: "smart_slots",
    titleEn: "Smart Slot Booking & Grace Time",
    titleHi: "स्मार्ट स्लॉट बुकिंग एवं समय सीमा",
    summaryEn: "Time-window booking guarantees weighbridge access with minimal wait time.",
    summaryHi: "समयबद्ध स्लॉट बुकिंग से धर्मकांटे पर बिना लम्बी कतार के तुरंत तुलाई सुनिश्चित होती है।",
    keyPointsEn: [
      "30-minute dedicated arrival windows (e.g. 10:00–10:30, 11:30–12:00).",
      "Farmers should arrive 10–15 minutes before the booked window.",
      "Slots can be rescheduled up to 2 hours prior without penalty.",
    ],
    keyPointsHi: [
      "30 मिनट का निश्चित आगमन स्लॉट (उदा. 10:00–10:30, 11:30–12:00)।",
      "स्लॉट समय से 10–15 मिनट पहले केंद्र पर पहुँचना उत्तम रहता है।",
      "स्लॉट समय से 2 घंटे पहले तक बिना किसी शुल्क के समय बदला जा सकता है।",
    ],
    rules: {
      rescheduleCutoffHours: "2 hours before slot",
      slotDurationMinutes: "30 minutes",
    },
  },

  QUEUE_AND_TOKEN: {
    id: "queue_and_token",
    titleEn: "Virtual Queue & Token ETA Engine",
    titleHi: "डिजिटल टोकन एवं लाइव कतार प्रणाली",
    summaryEn: "Virtual token tracks exact queue position, counter assignment, and predicted waiting time.",
    summaryHi: "डिजिटल टोकन से कतार में स्थान, आवंटित काउंटर और अनुमानित प्रतीक्षा समय का लाइव पता चलता है।",
    keyPointsEn: [
      "Token is assigned automatically upon slot confirmation (e.g., KS-1042).",
      "Real-time counter call displays on centre LED screens and sends SMS alert.",
      "ETA recalculates dynamically based on active counter speed.",
    ],
    keyPointsHi: [
      "स्लॉट बुक होते ही डिजिटल टोकन नंबर (जैसे KS-1042) जारी होता है।",
      "काउंटर पर बारी आने पर केंद्र के डिस्प्ले बोर्ड और एसएमएस पर सूचना मिलती है।",
      "सक्रिय काउंटरों की गति के अनुसार प्रतीक्षा समय स्वतः अपडेट होता है।",
    ],
    rules: {
      tokenFormat: "KS-XXXX",
      smsAlertDistance: "Sent when 3 farmers remain ahead",
    },
  },

  LATE_ARRIVAL: {
    id: "late_arrival",
    titleEn: "Late Arrival & Buffer Policy",
    titleHi: "देरी से पहुँचने (Late Arrival) पर नियम",
    summaryEn: "Clear protocol for farmers who arrive after their scheduled slot window due to vehicle breakdown or distance.",
    summaryHi: "वाहन खराबी या दूरी के कारण समय पर न पहुँच पाने वाले किसानों के लिए स्पष्ट नियम।",
    keyPointsEn: [
      "Grace Period: 15 minutes after slot window ends without any disruption.",
      "If more than 15 minutes late: Token is shifted to the 'Hourly Buffer Queue'.",
      "Your booking is NEVER cancelled on the same day; you will be accommodated between scheduled slots.",
      "If you cannot make it today: Use the 'Reschedule Slot' button to pick tomorrow or another day.",
    ],
    keyPointsHi: [
      "ग्रेस पीरियड: स्लॉट खत्म होने के 15 मिनट बाद तक बिना किसी परेशानी के प्रवेश मिलता है।",
      "15 मिनट से अधिक देरी पर: टोकन को निरस्त नहीं किया जाता, बल्कि 'बफर कतार' में डाल दिया जाता है।",
      "उसी दिन हर घंटे के खाली अंतराल में आपकी तुलाई करवा दी जाएगी।",
      "यदि आज पहुँचना संभव न हो, तो ऐप में 'स्लॉट बदलें' (Reschedule) द्वारा कल का समय चुन सकते हैं।",
    ],
    rules: {
      gracePeriodMin: "15 minutes",
      cancellationPolicy: "Never cancelled automatically on same day; placed in buffer queue",
    },
  },

  GATE_ENTRY: {
    id: "gate_entry",
    titleEn: "Gate Entry & Vehicle Verification",
    titleHi: "मुख्य द्वार प्रवेश एवं वाहन सत्यापन",
    summaryEn: "Initial check-in point at the procurement centre where token and vehicle details are scanned.",
    summaryHi: "खरीद केंद्र के मुख्य द्वार पर डिजिटल टोकन और वाहन संख्या की प्राथमिक जाँच।",
    keyPointsEn: [
      "Show your digital token SMS/QR code on your phone.",
      "Tractor/Trolley/Truck number is logged into the digital gate register.",
      "Security prints the Gate Pass barcode slip.",
    ],
    keyPointsHi: [
      "मोबाइल में डिजिटल टोकन का एसएमएस या स्क्रीन दिखाएँ।",
      "ट्रैक्टर/ट्रॉली की नंबर प्लेट गेट रजिस्टर में दर्ज होती है।",
      "गेट पास बारकोड पर्ची तुरंत जारी कर दी जाती है।",
    ],
    rules: {
      gatePassValidity: "Same day until 06:00 PM",
    },
  },

  WEIGHING_PROCESS: {
    id: "weighing_process",
    titleEn: "Electronic Weighbridge (Dharamkanta) & Weighment",
    titleHi: "इलेक्ट्रॉनिक धर्मकांटा तुलाई प्रक्रिया",
    summaryEn: "Tamper-proof calibrated digital weighbridge records gross weight and tare weight to calculate net grain quantity.",
    summaryHi: "पारदर्शी डिजिटल धर्मकांटे पर वाहन सहित कुल वजन (Gross) और खाली वाहन वजन (Tare) नापकर वास्तविक वजन निकलता है।",
    keyPointsEn: [
      "Step 1: Gross Weighment (Loaded vehicle on weighbridge).",
      "Step 2: Grain unloading at designated storage bay.",
      "Step 3: Tare Weighment (Empty vehicle re-weighed).",
      "Net Weight = Gross Weight − Empty Vehicle Weight.",
      "Automatic digital sync to state cloud; zero manual weight tampering.",
    ],
    keyPointsHi: [
      "चरण 1: सकल वजन (Gross Weight - भरी ट्रॉली सहित तुलाई)।",
      "चरण 2: निर्धारित शेड में अनाज खाली करना।",
      "चरण 3: खाली वाहन तुलाई (Tare Weight)।",
      "शुद्ध अनाज वजन = कुल वजन − खाली वाहन वजन।",
      "वजन सीधे डिजिटल सर्वर पर दर्ज होता है; किसी मानवीय छेड़छाड़ की गुंजाइश नहीं।",
    ],
    rules: {
      toleranceKgs: "± 0.1% as per Legal Metrology standards",
    },
  },

  QUALITY_AND_FAQ: {
    id: "quality_and_faq",
    titleEn: "Quality Check & FAQ (Fair Average Quality) Standards",
    titleHi: "गुणवत्ता जाँच एवं एफएक्यू (FAQ) मानक",
    summaryEn: "Government procurement guidelines require grain to meet Fair Average Quality parameters.",
    summaryHi: "सरकारी खरीद के लिए अनाज का एफएक्यू (Fair Average Quality) मानकों पर खरा उतरना आवश्यक है।",
    keyPointsEn: [
      "Moisture Content (नमी): Maximum 12.0% allowed (up to 14.0% with standard deduction).",
      "Foreign Matter / Dirt (कचरा/मिट्टी): Max 0.75%.",
      "Shrivelled / Broken Grains (सिकुड़े/टूटे दाने): Max 6.0%.",
      "Slightly Damaged Grains: Max 4.0%.",
      "Weevilled / Insect Damaged: Max 1.0%.",
    ],
    keyPointsHi: [
      "नमी की मात्रा: अधिकतम 12.0% मान्य (14.0% तक मानक कटौती के साथ स्वीकार्य)।",
      "विजातीय तत्व / मिट्टी: अधिकतम 0.75%।",
      "सिकुड़े एवं टूटे दाने: अधिकतम 6.0%।",
      "हल्के क्षतिग्रस्त दाने: अधिकतम 4.0%।",
      "कीट प्रभावित दाने: अधिकतम 1.0%।",
    ],
    rules: {
      maxMoisturePct: "12.0% standard, up to 14.0% with deduction",
      maxForeignMatterPct: "0.75%",
      maxBrokenPct: "6.0%",
    },
  },

  REJECTION_AND_DISPUTE: {
    id: "rejection_and_dispute",
    titleEn: "Rejection Protocol & Grain Re-Cleaning",
    titleHi: "अस्वीकृति नियम एवं री-क्लीनिंग सुविधा",
    summaryEn: "Rules protecting farmers if moisture or foreign matter exceeds the permitted FAQ threshold.",
    summaryHi: "यदि फसल में नमी या कचरा अधिक हो, तो किसानों के हितों की रक्षा हेतु नियम।",
    keyPointsEn: [
      "If moisture is between 12.1% and 14%, grain can be sun-dried in the mandi yard for 2–3 hours and re-tested.",
      "If foreign matter is high: Mandi grain-cleaning sieves (छलना) are available free/nominal charge to clean and re-weigh.",
      "No procurement officer can reject produce without issuing a digital Rejection Reason Slip.",
      "Farmers can appeal any rejection to the District Quality Supervisor immediately through Kisan Setu.",
    ],
    keyPointsHi: [
      "यदि नमी 12.1% से 14% के बीच है, तो मंडी परिसर में 2-3 घंटे सुखाकर दोबारा जाँच करवाई जा सकती है।",
      "यदि कचरा अधिक है, तो मंडी के छलना/सफाई यंत्र में साफ करके तुरंत तुलाई करवाई जा सकती है।",
      "कोई भी अधिकारी बिना डिजिटल रिजेक्शन पर्ची दिए फसल अस्वीकार नहीं कर सकता।",
      "अस्वीकृति पर किसान तुरंत किसान सेतु ऐप से जिला गुणवत्ता पर्यवेक्षक को अपील कर सकते हैं।",
    ],
    rules: {
      mandatorySlip: "Digital rejection slip required for any non-acceptance",
      appealWindowHours: "Within 24 hours of rejection",
    },
  },

  J_FORM_AND_INVOICE: {
    id: "j_form_and_invoice",
    titleEn: "Digital J-Form & Procurement Tax Invoice",
    titleHi: "डिजिटल जे-फॉर्म एवं खरीद रसीद",
    summaryEn: "Official government receipt confirming accepted quantity, quality grade, and sanctioned payout amount.",
    summaryHi: "स्वीकृत वजन, गुणवत्ता ग्रेड और स्वीकृत भुगतान राशि का आधिकारिक सरकारी प्रमाणपत्र (J-Form)।",
    keyPointsEn: [
      "J-Form is generated automatically within 10 minutes of electronic weighing.",
      "Available for download as PDF in the farmer portal.",
      "Acts as official legal proof of sale at government MSP.",
    ],
    keyPointsHi: [
      "तुलाई पूरी होते ही 10 मिनट के भीतर डिजिटल जे-फॉर्म जारी हो जाता है।",
      "किसान इसे ऐप से सीधे पीडीएफ के रूप में डाउनलोड कर सकते हैं।",
      "यह एमएसपी पर सरकारी बिक्री का पक्का कानूनी प्रमाण है।",
    ],
    rules: {
      generationTimeMin: "10 minutes post weighment",
    },
  },

  PAYMENTS_AND_DBT: {
    id: "payments_and_dbt",
    titleEn: "Direct Benefit Transfer (DBT) Payouts & PFMS",
    titleHi: "डीबीटी बैंक खाता भुगतान एवं पीएफएमएस",
    summaryEn: "100% of the procurement amount is transferred directly to the farmer's Aadhaar-linked bank account.",
    summaryHi: "खरीद की शत-प्रतिशत राशि सीधे किसान के आधार-लिंक्ड बैंक खाते में ट्रांसफर होती है।",
    keyPointsEn: [
      "Timeline: Payment is credited within 48 to 72 hours of weighing completion.",
      "Payment route: PFMS (Public Financial Management System) / NPCI Aadhaar Bridge.",
      "No middleman commissions, arhtiya deductions, or cash transactions.",
      "SMS confirmation is sent immediately upon bank credit.",
    ],
    keyPointsHi: [
      "समय सीमा: तुलाई पूरी होने के 48 से 72 घंटे के भीतर खाते में भुगतान आ जाता है।",
      "भुगतान माध्यम: पीएफएमएस (PFMS) एवं एनपीसीआई आधार पेमेंट ब्रिज।",
      "कोई आढ़ती कटौती या बिचौलियों का कमीशन नहीं कटता।",
      "खाते में पैसे जमा होते ही बैंक का एसएमएस प्राप्त होता है।",
    ],
    rules: {
      payoutHours: "48 to 72 hours",
      mode: "Direct Benefit Transfer (DBT)",
    },
  },

  PAYMENT_TROUBLESHOOTING: {
    id: "payment_troubleshooting",
    titleEn: "Payment Delay Troubleshooting",
    titleHi: "भुगतान में देरी के कारण एवं समाधान",
    summaryEn: "Assistance and diagnosis if payment is not received within the standard 48–72 hour window.",
    summaryHi: "यदि 48-72 घंटे में पैसे न आएँ तो कारणों की जाँच एवं समाधान।",
    keyPointsEn: [
      "Reason 1: Bank Account NPCI / Aadhaar Seeding inactive (DBT mapping issue).",
      "Reason 2: Name mismatch between Aadhaar and Bank Passbook.",
      "Reason 3: Banking holiday or treasury clearing cycle.",
      "Action: Check payment stage in app. If status shows 'PFMS Processing', it will clear in 24 hours. If 'Failed', update bank IFSC in profile.",
    ],
    keyPointsHi: [
      "कारण 1: बैंक खाते में आधार / एनपीसीआई (NPCI) डीबीटी मैपिंग सक्रिय न होना।",
      "कारण 2: आधार कार्ड और बैंक पासबुक में नाम की स्पेलिंग में अंतर।",
      "कारण 3: बैंक अवकाश या ट्रेजरी क्लीयरेंस चक्र।",
      "समाधान: ऐप में स्टेटस देखें। यदि 'PFMS Processing' है, तो 24 घंटे में आ जाएगा। यदि 'Failed' है, तो बैंक विवरण अपडेट करें।",
    ],
    rules: {
      escalateIfDelayedDays: "3 working days",
    },
  },

  DOCUMENTS_CHECKLIST: {
    id: "documents_checklist",
    titleEn: "Required Documents Checklist at Mandi",
    titleHi: "खरीद केंद्र पर आवश्यक दस्तावेजों की सूची",
    summaryEn: "Checklist of documents a farmer must have when arriving for crop procurement.",
    summaryHi: "मंडी में फसल लाते समय किसान के पास आवश्यक दस्तावेजों की चेकलिस्ट।",
    keyPointsEn: [
      "1. Original Aadhaar Card (मूल आधार कार्ड).",
      "2. Bank Passbook photocopy / Cancelled Cheque with clear IFSC (बैंक पासबुक).",
      "3. Land Record Copy (जमाबंदी / खसरा-खतौनी / गिरदावरी की प्रति).",
      "4. Digital Token Number / SMS on phone (टोकन नंबर / एसएमएस).",
    ],
    keyPointsHi: [
      "1. मूल आधार कार्ड (Original Aadhaar Card)।",
      "2. बैंक पासबुक की कॉपी जिसमें खाता नंबर और IFSC साफ दिखे।",
      "3. भूमि रिकॉर्ड (जमाबंदी / खतौनी / गिरदावरी पर्ची)।",
      "4. मोबाइल में किसान सेतु टोकन नंबर या एसएमएस।",
    ],
    rules: {
      physicalMandatory: "Aadhaar + Land Record + Bank Passbook",
    },
  },

  GRIEVANCE_REDRESSAL: {
    id: "grievance_redressal",
    titleEn: "Grievance Redressal & State Quality Directorate",
    titleHi: "शिकायत निवारण एवं राज्य गुणवत्ता निदेशालय",
    summaryEn: "Direct grievance registration channel for weighing disputes, bribery, quality grading unfairness, or payment delays.",
    summaryHi: "तुलाई विवाद, घूसखोरी, गलत ग्रेडिंग या भुगतान देरी के लिए सीधी शिकायत व्यवस्था।",
    keyPointsEn: [
      "Grievances are tracked with unique Ticket IDs (e.g. GRV-8821).",
      "Mandatory resolution SLA: 48 hours for centre issues, 24 hours for weighing disputes.",
      "Escalates automatically to the District Collector and State Vigilance Directorate if unresolved.",
      "Toll-free Kisan Helpline: 1800-180-1551.",
    ],
    keyPointsHi: [
      "हर शिकायत का यूनिक टिकट नंबर (जैसे GRV-8821) मिलता है।",
      "समाधान समय: केंद्र की समस्याओं के लिए 48 घंटे, तुलाई विवाद के लिए 24 घंटे।",
      "समय पर हल न होने पर शिकायत स्वतः जिला कलेक्टर एवं राज्य सतर्कता निदेशालय को अग्रेषित होती है।",
      "टोल-फ्री किसान हेल्पलाइन: 1800-180-1551।",
    ],
    rules: {
      resolutionSlaHours: "48 hours standard, 24 hours critical",
      helpline: "1800-180-1551",
    },
  },

  RESCHEDULING_RULES: {
    id: "rescheduling_rules",
    titleEn: "Slot Rescheduling & Cancellation Policy",
    titleHi: "स्लॉट बदलने (Reschedule) एवं रद्द करने के नियम",
    summaryEn: "Flexible slot management allowing farmers to adjust dates due to weather, transport, or harvest delays.",
    summaryHi: "मौसम, परिवहन या कटाई में देरी होने पर स्लॉट तिथि/समय बदलने की सरल सुविधा।",
    keyPointsEn: [
      "Free rescheduling up to 2 hours before the allocated slot window.",
      "You can change the centre or time without losing your procurement quota.",
      "A farmer can reschedule up to 3 times per procurement season.",
    ],
    keyPointsHi: [
      "स्लॉट समय से 2 घंटे पहले तक मुफ्त में समय बदला जा सकता है।",
      "कोटा खत्म हुए बिना आप केंद्र या तारीख बदल सकते हैं।",
      "एक सीजन में अधिकतम 3 बार स्लॉट बदला जा सकता है।",
    ],
    rules: {
      maxReschedules: "3 times per season",
      advanceNoticeHours: "2 hours",
    },
  },

  NOTIFICATIONS_AND_ALERTS: {
    id: "notifications_and_alerts",
    titleEn: "SMS Alerts & Push Notifications",
    titleHi: "एसएमएस एवं सूचनाएं",
    summaryEn: "Real-time communication keeps farmers informed at every milestone.",
    summaryHi: "हर चरण पर किसान को एसएमएस एवं ऐप नोटिफिकेशन द्वारा तुरंत सूचना मिलती है।",
    keyPointsEn: [
      "Milestone 1: Slot booking confirmation & token issue.",
      "Milestone 2: 30-minute arrival reminder.",
      "Milestone 3: Counter call alert (when 3 farmers remain ahead).",
      "Milestone 4: Weighment receipt & J-Form ready.",
      "Milestone 5: Bank DBT payout credit alert.",
    ],
    keyPointsHi: [
      "सूचना 1: स्लॉट बुकिंग पुष्टि एवं टोकन नंबर।",
      "सूचना 2: स्लॉट से 30 मिनट पहले आगमन अलर्ट।",
      "सूचना 3: तुलाई काउंटर पर बारी आने की सूचना (3 किसान पहले)।",
      "सूचना 4: तुलाई पर्ची एवं जे-फॉर्म जारी होने का संदेश।",
      "सूचना 5: बैंक खाते में डीबीटी राशि जमा होने का एसएमएस।",
    ],
    rules: {
      smsDeliveryTime: "Within 60 seconds of trigger",
    },
  },

  PLATFORM_NAVIGATION: {
    id: "platform_navigation",
    titleEn: "Kisan Setu Portal Navigation & Accessibility",
    titleHi: "किसान सेतु पोर्टल नेविगेशन एवं सहायता",
    summaryEn: "Sahayak can directly navigate farmers to any section of the app.",
    summaryHi: "सहायक किसान को सीधे ऐप के किसी भी पेज या टैब पर ले जा सकता है।",
    keyPointsEn: [
      "Centres (खरीद केंद्र): View nearest centres, live crowd density, and map.",
      "Queue (लाइव कतार): View your token number, ETA, and farmers ahead.",
      "Timeline (खरीद स्थिति): Track 8-stage procurement progress.",
      "Payments (भुगतान): Check MSP calculation and DBT transfer stage.",
      "Grievances (शिकायत निवारण): File and track complaints.",
      "Profile (किसान प्रोफ़ाइल): Update crop, quantity, village, and bank details.",
    ],
    keyPointsHi: [
      "Centres (खरीद केंद्र): नजदीकी केंद्र, लाइव भीड़ और नक्शा देखें।",
      "Queue (लाइव कतार): अपना टोकन नंबर, अनुमानित समय और कतार देखें।",
      "Timeline (खरीद स्थिति): 8 चरणों की प्रगति ट्रैक करें।",
      "Payments (भुगतान): एमएसपी गणना और बैंक भुगतान स्थिति देखें।",
      "Grievances (शिकायत निवारण): नई शिकायत दर्ज करें या पुरानी ट्रैक करें।",
      "Profile (किसान प्रोफ़ाइल): फसल, मात्रा, गाँव और बैंक विवरण अपडेट करें।",
    ],
    rules: {},
  },
};

// ─── EXTENSIVE VOCABULARY & INTENT PATTERNS ───
export interface IntentPattern {
  intent: PrimaryIntent;
  keywords: string[];
  phrases: string[];
  requiresTool?: string[];
  navigationTarget?: "home" | "centres" | "queue" | "timeline" | "payments" | "grievances" | "help" | "profile";
}

export const INTENT_PATTERNS: IntentPattern[] = [
  {
    intent: "GREETING",
    keywords: [
      "नमस्ते", "प्रणाम", "राम राम", "नमस्कार", "हेलो", "सुनों", "सूनो",
      "hello", "hi", "namaste", "pranam", "kaise ho", "kya haal", "ram ram", "hey", "suno", "sahayak", "kisan setu"
    ],
    phrases: [
      "नमस्ते किसान सेतु", "नमस्ते सहायक", "राम राम", "हेलो सहायक", "सहायक कैसे काम करता है",
      "namaste sahayak", "hello kisan setu", "ram ram bhai", "kaise ho aap", "kya haal chaal"
    ],
  },
  {
    intent: "CHECK_QUEUE_ETA",
    keywords: [
      "कतार", "बारी", "लाइन", "भीड़", "टोकन", "नंबर", "प्रतीक्षा", "इंतजार", "कितना समय", "आगे कितने", "टोकन नंबर", "कतार स्थिति",
      "queue", "katar", "line", "bheed", "turn", "bari", "mera number", "kab aayega", "wait", "intezaar",
      "kitna time", "eta", "token", "meri bari", "kab tak", "aage kitne", "ahead", "waiting time", "kitni der",
      "turn kab aayegi", "number kab aayega", "line status", "token status"
    ],
    phrases: [
      "मेरी बारी कब आएगी", "मेरा नंबर कब आएगा", "आगे कितने किसान हैं", "कितना समय लगेगा",
      "टोकन का क्या स्टेटस है", "कतार में कितना समय बाकी है",
      "meri bari kab aayegi", "mera number kab aayega", "aage kitne kisan hai", "kitna time lagega",
      "token number kya hai", "when is my turn", "how long is the wait", "what is my token status",
      "line me kitna time bacha hai", "meri bari aane me kitni der hai", "how many farmers are ahead",
      "kitna der intezar karna padega"
    ],
    requiresTool: ["getQueueStatus", "getActiveBooking"],
    navigationTarget: "queue",
  },
  {
    intent: "LATE_ARRIVAL_RULES",
    keywords: [
      "देर", "देरी", "लेट", "पहुंचा", "पहुँचने", "पंचर", "खराब", "निरस्त", "देर से", "समय निकल गया", "अगर लेट", "देर हुई",
      "late", "der", "deri", "pohcha", "pahucha", "pahuncha", "pahuchenge", "traffic", "gadbadi", "breakdown",
      "kharab", "der se", "time nikal gaya", "agar late", "agar der", "missed slot", "late arrival", "panchar"
    ],
    phrases: [
      "अगर मैं देर से पहुँचा तो क्या होगा", "अगर लेट हो गया तो क्या होगा", "रास्ते में ट्रैक्टर खराब हो गया",
      "अगर मैं आज देर से पहुंचा तो क्या होगा", "अगर मैं आधे घंटे late हो गया तो", "क्या मेरा स्लॉट निरस्त हो जाएगा",
      "agar main late ho gaya to kya hoga", "der se pahuncha to kya hoga", "agar time nikal jaye to kya hoga",
      "tractor kharab ho gaya late ho gaya", "aadha ghanta late ho gaya to kya hoga",
      "what if i arrive late", "what happens if i miss my slot", "late arrival rules",
      "what happens if i am late"
    ],
    requiresTool: ["getActiveBooking", "getQueueStatus"],
    navigationTarget: "queue",
  },
  {
    intent: "CHECK_PAYMENT_DBT",
    keywords: [
      "भुगतान", "पैसा", "पैसे", "रुपये", "खाता", "खाते", "डीबीटी", "किस्त", "बैंक", "एमएसपी", "जमा", "राशि",
      "payment", "paisa", "paise", "rupee", "bank", "account", "khata", "khate", "dbt", "bhugtan",
      "kisht", "amount", "msp", "kab aayenge", "kab aayega", "kab milega", "kitna paisa", "kitne rupaye",
      "payout", "pfms", "credit", "jama", "khate me"
    ],
    phrases: [
      "मेरी payment कब तक आएगी", "पैसे कब मिलेंगे", "खाते में पैसे कब आएंगे", "कितना पैसा बनेगा",
      "भुगतान स्थिति क्या है", "बैंक खाते में पैसे कब तक ट्रांसफर होंगे",
      "mera payment kab aayega", "paise kab milenge", "khate me paise kab aayenge", "kitna paisa banega",
      "payment status kya hai", "when will i get my payment", "how much is my msp payout",
      "tulai ke baad paise kab aate hai", "bank account me kab aayega", "when will i receive my msp payment"
    ],
    requiresTool: ["getPaymentStatus", "getFarmerProfile"],
    navigationTarget: "payments",
  },
  {
    intent: "PAYMENT_DELAY_TROUBLESHOOT",
    keywords: [
      "पैसे नहीं आए", "भुगतान रुका", "दिक्कत", "अटक", "देरी", "जाँच", "देख के बताओ", "अभी तक नहीं आए", "रुपये नहीं मिले",
      "paisa nahi aaya", "paise nahi aaye", "payment ruka", "payment atak gaya", "dikat", "dikkat", "delay",
      "nahi mila", "ab tak nahi aaya", "payment delayed", "troubleshoot payment", "kyun nahi aaya", "dekh ke batao",
      "kyo ni aya", "paise abhi tak nahi aaye"
    ],
    phrases: [
      "पैसे अभी तक नहीं आए जरा देख के बताओ क्या दिक्कत है", "मेरा भुगतान क्यों रुका हुआ है", "खाते में पैसे अभी तक नहीं पहुंचे",
      "paise abhi tak nahi aaye jara dekh ke batao", "mera payment kyun ruka hua hai", "payment abhi tak credit nahi hua",
      "why has my payment not come yet", "check why my payment is delayed", "mera pyment kyo ni aya abhi tk"
    ],
    requiresTool: ["getPaymentStatus", "getFarmerProfile"],
    navigationTarget: "payments",
  },
  {
    intent: "COMPARE_CENTRES",
    keywords: [
      "खरीद केंद्र", "मंडी", "नक्शा", "कम भीड़", "खाली", "दूसरा", "नजदीकी", "भीड़", "अन्य केंद्र", "खाली मंडी",
      "centre", "mandi", "nearest", "paas", "sabse paas", "best", "achha", "kam bheed", "khali", "dusra",
      "alternative", "kahan jau", "wahan", "dur", "distance", "km", "konsa", "dusra centre", "other centre",
      "crowd", "traffic", "bheed kam", "dusra achha centre", "khali mandi", "naksha"
    ],
    phrases: [
      "सबसे कम भीड़ वाला खरीद केंद्र कौन सा है", "मेरे सेंटर पर बहुत भीड़ है कोई दूसरा अच्छा सेंटर है क्या",
      "कहाँ जाऊँ जहाँ जल्दी काम हो", "मुझे खरीद केंद्रों का नक्शा देखना है",
      "mere centre par bahut bheed hai koi dusra achha centre hai kya", "sabse kam bheed wala centre konsa hai",
      "kahan jau jahan jaldi kaam ho", "which centre is least crowded", "find alternative centres",
      "compare centres near me", "paas me konsi mandi achhi hai", "which procurement centre has the least waiting time",
      "mandi me bheed bhot jada h dusra centre btao"
    ],
    requiresTool: ["findAlternativeCentres", "getCentreStatus"],
    navigationTarget: "centres",
  },
  {
    intent: "RESCHEDULE_SLOT",
    keywords: [
      "स्लॉट बदलें", "समय बदलें", "तारीख बदलें", "रीशेड्यूल", "बदलना", "बदलो", "कल का स्लॉट", "परसों",
      "reschedule", "badalna", "badlo", "change", "tarikh badlo", "date change", "samay badlo", "time change",
      "dusra din", "kal kar do", "parso kar do", "reschedule slot", "slot reschedule"
    ],
    phrases: [
      "मेरा स्लॉट reschedule कर दो", "आज नहीं आ पाऊंगा कल का स्लॉट कर दो", "समय बदल दो",
      "mera slot reschedule kar do", "aaj nahi aa paunga kal ka slot kar do", "time change kar do",
      "reschedule my slot to tomorrow", "can i change my booking date", "mera slot kal subah ke liye reschedule kar do"
    ],
    requiresTool: ["getActiveBooking", "getAvailableSlots"],
    navigationTarget: "centres",
  },
  {
    intent: "CANCEL_SLOT",
    keywords: [
      "रद्द", "निरस्त", "कैंसिल", "हटाओ", "नहीं जाना", "बुकिंग रद्द",
      "cancel", "radd", "radh", "hata do", "cancel slot", "nahi jana", "booking cancel", "cancel my scheduled"
    ],
    phrases: [
      "मेरा स्लॉट cancel कर दो", "मुझे बुकिंग रद्द करनी है", "cancel my slot booking",
      "cancel my scheduled appointment for today"
    ],
    requiresTool: ["getActiveBooking"],
    navigationTarget: "centres",
  },
  {
    intent: "BOOK_SLOT",
    keywords: [
      "स्लॉट बुक", "बुकिंग", "समय आरक्षित", "नया स्लॉट", "बुक कर दो", "बुक करना",
      "book", "booking", "slot", "appointment", "date", "tarikh", "samay", "fix", "kal ka", "aaj ka",
      "slot book", "book slot", "time book", "slot chahiye"
    ],
    phrases: [
      "स्लॉट बुक कर दो", "आज के लिए स्लॉट बुक करो", "कल के लिए स्लॉट बुक करना है", "रामपुरा केंद्र पर आज का स्लॉट बुक कर दो",
      "वहाँ पर मेरा स्लॉट बुक कर दो",
      "slot book kar do", "aaj ke liye slot book karo", "kal ke liye slot book karna hai",
      "book a slot for me", "i want to book a slot", "mujhe slot chahiye"
    ],
    requiresTool: ["getAvailableSlots", "getFarmerProfile"],
    navigationTarget: "centres",
  },
  {
    intent: "CHECK_PROCUREMENT_STATUS",
    keywords: [
      "खरीद स्थिति", "प्रगति", "चरण", "स्वीकृत", "स्टेटस", "टाइमलाइन",
      "procurement", "kharid", "status", "timeline", "stage", "kahan tak", "pragati", "progress",
      "kya hua", "kahan tak pahuncha", "procurement status", "uska status"
    ],
    phrases: [
      "मेरी खरीद कहाँ तक पहुँची", "procurement status क्या है", "मेरी फसल स्वीकार हुई या नहीं",
      "meri kharid kahan tak pahunchi", "procurement status kya hai", "meri fasal accept hui ya nahi",
      "what is my procurement stage", "check procurement progress", "uska status kya chal raha hai abhi"
    ],
    requiresTool: ["getProcurementStatus", "getActiveBooking"],
    navigationTarget: "timeline",
  },
  {
    intent: "WEIGHING_PROCESS",
    keywords: [
      "तुलाई", "तोलाई", "धर्मकांटा", "कांटा", "वजन", "सकल वजन", "खाली वजन", "धर्मकांटे",
      "weighing", "tulai", "tolai", "dharamkanta", "kanta", "weight", "vajan", "gross", "tare",
      "dharmakanta", "dharamdante"
    ],
    phrases: [
      "तुलाई कैसे होती है", "इलेक्ट्रॉनिक धर्मकांटे पर वजन कैसे होता है",
      "tulai kaise hoti hai", "electronic dharmakanta par vajan kaise hota hai", "how is weighing done",
      "gross weight aur tare weight kya hota hai", "dharamdante pe tulai kb tk shuru hogi"
    ],
    navigationTarget: "help",
  },
  {
    intent: "REJECTION_RULES",
    keywords: [
      "अस्वीकृत", "रिजेक्ट", "मना कर दिया", "अपील", "छलना", "फसल वापस", "सुखाकर", "नमी ज्यादा बता कर",
      "reject", "reject kar diya", "asveekar", "mana kar diya", "fasal wapas", "fasal fail", "dispute",
      "re-cleaning", "chalna", "dry", "sukha", "nami jyada bta kr"
    ],
    phrases: [
      "अगर फसल reject हो जाए तो क्या करें", "नमी ज्यादा होने पर रिजेक्ट कर दिया क्या करें",
      "अगर मंडी निरीक्षक ने नमी 13 प्रतिशत बताकर गेहूँ लेने से मना कर दिया तो मुझे क्या करना चाहिए",
      "wheat ki nami jyada bta kr reject kr diya kya kru",
      "what to do if crop is rejected", "can i clean and re-test my wheat"
    ],
    navigationTarget: "grievances",
  },
  {
    intent: "QUALITY_FAQ_GRADING",
    keywords: [
      "गुणवत्ता", "नमी", "एफएक्यू", "ग्रेडिंग", "कचरा", "विजातीय", "मानक", "जाँच", "नमी प्रतिशत",
      "quality", "grade", "grading", "faq", "nammi", "moisture", "nami", "kachra", "dirt", "foreign matter",
      "shrivelled", "tuta dana", "cut", "manak", "test", "testing"
    ],
    phrases: [
      "तुलाई और नमी के सरकारी नियम क्या हैं", "नमी कितनी होनी चाहिए", "गुणवत्ता जाँच के नियम क्या हैं",
      "nami kitni honi chahiye", "quality check ke kya niyam hai", "what are the faq moisture standards",
      "what is the maximum allowed moisture percentage in wheat"
    ],
    navigationTarget: "help",
  },
  {
    intent: "J_FORM_BILLS",
    keywords: [
      "जे-फॉर्म", "जे फॉर्म", "रसीद", "बिल", "पर्ची", "इनवॉयस", "वाउचर", "जे फार्म",
      "j form", "j-form", "jform", "j-farm", "bill", "invoice", "receipt", "parchi", "rasid", "voucher", "slip"
    ],
    phrases: [
      "j form कैसे मिलेगा", "खरीद रसीद कहाँ से डाउनलोड करें", "तुलाई की पर्ची कहाँ है",
      "j form kaise milega", "procurement receipt kahan se download kare", "where can i get my digital invoice",
      "j-farm ki raseed download krni h"
    ],
    requiresTool: ["getProcurementStatus", "getFarmerProfile"],
    navigationTarget: "timeline",
  },
  {
    intent: "REQUIRED_DOCUMENTS",
    keywords: [
      "दस्तावेज", "कागज़", "कागज", "दस्तावेज़", "आधार", "पासबुक", "गिरदावरी", "जमाबंदी", "खतौनी", "कागजात",
      "document", "documents", "kagaz", "kaagaz", "dastavej", "dastavez", "aadhaar", "passbook", "girdawari",
      "kya le jana hai", "kya sath rakhna hai", "required papers"
    ],
    phrases: [
      "खरीद केंद्र पर जाते समय कौन-कौन से कागज़ साथ ले जाने होंगे", "मंडी में क्या documents चाहिए",
      "centre par kya kagaz le jane honge", "mandi me kya documents chahiye", "what documents are required at centre",
      "what documents do i need to bring to the mandi"
    ],
    navigationTarget: "help",
  },
  {
    intent: "CHECK_GRIEVANCE_STATUS",
    keywords: [
      "शिकायत का क्या हुआ", "शिकायत स्टेटस", "शिकायत की स्थिति", "शिकायत ट्रैक",
      "grievance status", "shikayat ka kya hua", "complaint status", "shikayat track", "ticket status", "meri wali shikayat"
    ],
    phrases: [
      "मेरी वाली शिकायत का क्या हुआ", "शिकायत की स्थिति क्या है", "grievance status check karo", "track my complaint"
    ],
    requiresTool: ["getComplaintStatus"],
    navigationTarget: "grievances",
  },
  {
    intent: "FILE_GRIEVANCE",
    keywords: [
      "शिकायत", "समस्या", "परेशानी", "अधिकारी", "घूस", "गड़बड़ी", "शिकायत दर्ज", "अफसर", "धांधली",
      "complaint", "shikayat", "shikayt", "grievance", "pareshani", "problem", "issue", "officer", "adhikari", "bribe",
      "ghoos", "daat", "naraj", "dispute", "report", "shikayat darj", "dhandhli"
    ],
    phrases: [
      "मुझे शिकायत करनी है", "अधिकारी सुनवाई नहीं कर रहा", "तुलाई में गड़बड़ी की शिकायत दर्ज करो",
      "mujhe shikayat karni hai", "adhikari sunwai nahi kar raha", "how to file a grievance",
      "register a complaint against centre", "shikayt darz krni h afsar sunwai ni kr rha",
      "open the grievance redressal section"
    ],
    requiresTool: ["createComplaint", "getFarmerProfile"],
    navigationTarget: "grievances",
  },
  {
    intent: "FARMER_REGISTRATION",
    keywords: [
      "पंजीकरण", "प्रोफ़ाइल", "खाता विवरण", "रजिस्ट्रेशन", "खसरा", "खतौनी", "प्रोफाइल",
      "registration", "panjikaran", "profile", "pm kisan", "portal", "khasra", "khatauni", "crop register"
    ],
    phrases: [
      "मेरी प्रोफ़ाइल और बैंक खाता दिखाओ", "किसान पंजीकरण कैसे चेक करें",
      "kisan panjikaran kaise check kare", "registration details update karni hai", "show my profile"
    ],
    requiresTool: ["getFarmerProfile"],
    navigationTarget: "profile",
  },
  {
    intent: "MSP_RATES",
    keywords: [
      "एमएसपी", "समर्थन मूल्य", "भाव", "दर", "कीमत", "सरकारी भाव", "गेहूँ का भाव", "सरसों का भाव",
      "msp", "rate", "bhav", "gehu ka bhav", "dhan ka bhav", "gehun ka rate", "mustard price", "sarson bhav", "kimat",
      "procurement price"
    ],
    phrases: [
      "गेहूँ का न्यूनतम समर्थन मूल्य क्या है", "सरसों का भाव कितना चल रहा है मंडी में", "वर्तमान सत्र के एमएसपी रेट क्या हैं",
      "gehu ka msp rate kya hai", "sarson ka bhav kya chal raha hai", "current msp prices", "what is wheat procurement price"
    ],
  },
  {
    intent: "NAVIGATE_TAB",
    keywords: [
      "पेज खोलो", "टैब खोलो", "दिखाओ", "ले चलो", "ओपन करो",
      "page", "tab", "kholo", "dikhao", "le chalo", "open", "navigate", "show me"
    ],
    phrases: ["payments page kholo", "queue tab dikhao", "profile page open karo"],
  },
  {
    intent: "WEATHER_OR_GENERAL_FARMING",
    keywords: [
      "मौसम", "बारिश", "खाद", "कीटनाशक", "खेती",
      "mausam", "weather", "barish", "rain", "kheti", "fertilizer", "khad", "keet", "pest"
    ],
    phrases: ["आज मौसम कैसा रहेगा क्या बारिश होगी", "aaj mausam kaisa hai", "kya barish hogi"],
  },
  {
    intent: "OUT_OF_SCOPE",
    keywords: [
      "क्रिकेट", "मैच", "गाना", "चुटकुला", "फिल्म", "राजनीति", "मोदी",
      "cricket", "match", "movie", "song", "joke", "chutkula", "gaana", "gana", "politics", "president"
    ],
    phrases: ["गाना सुनाओ या कोई चुटकुला सुनाओ", "what is today's cricket match score"],
  },
];
