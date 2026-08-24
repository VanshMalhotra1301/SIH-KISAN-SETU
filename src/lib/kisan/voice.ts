import type { Language } from "./types";

/**
 * Voice layer — API ready.
 * `matchIntent` is a local keyword resolver over demo answers. To go live,
 * replace its body with a call to an NLU/LLM endpoint returning the same shape.
 */

export interface VoiceIntent {
  id: string;
  keywords: string[];
  question: { hi: string; en: string };
  answer: { hi: string; en: string };
  facts?: Array<{ label: string; value: string }>;
}

export const voiceIntents: VoiceIntent[] = [
  {
    id: "turn",
    keywords: ["बारी", "कतार", "turn", "queue", "number", "token", "कब आएगी"],
    question: { hi: "मेरी बारी कब आएगी?", en: "When is my turn?" },
    answer: {
      hi: "आपका टोकन KS-3842 है। आपसे आगे 4 किसान हैं। अनुमानित समय 18 मिनट। केंद्र B, काउंटर 3।",
      en: "Your token is KS-3842. There are 4 farmers ahead of you. Estimated time 18 minutes at Centre B, counter 3.",
    },
    facts: [
      { label: "Token", value: "KS-3842" },
      { label: "Ahead", value: "4 farmers" },
      { label: "ETA", value: "18 min" },
    ],
  },
  {
    id: "centre",
    keywords: ["सेंटर", "केंद्र", "centre", "center", "अच्छा", "कहाँ", "which", "best"],
    question: { hi: "कौन सा सेंटर मेरे लिए अच्छा है?", en: "Which centre is best for me?" },
    answer: {
      hi: "केंद्र B सबसे अच्छा है। 12 किलोमीटर दूर, कतार में 13 किसान, प्रतीक्षा केवल 41 मिनट। केंद्र A पास है पर वहाँ 126 मिनट लगेंगे।",
      en: "Centre B is best. 12 km away, 13 farmers in queue, only 41 minutes wait. Centre A is closer but would take 126 minutes.",
    },
    facts: [
      { label: "Recommended", value: "Centre B · 12 km" },
      { label: "Wait", value: "41 min vs 126 min" },
      { label: "Capacity", value: "54% used" },
    ],
  },
  {
    id: "when",
    keywords: ["आज", "जाना", "कब जाना", "slot", "समय", "time", "go", "today"],
    question: { hi: "आज मुझे कब जाना चाहिए?", en: "When should I go today?" },
    answer: {
      hi: "आपका स्मार्ट स्लॉट 11:30 से 12:00 है। घर से 11:10 पर निकलें। इस समय काउंटर खाली रहते हैं, इंतज़ार लगभग शून्य।",
      en: "Your smart slot is 11:30 to 12:00. Leave home by 11:10. Counters are free at that time, so waiting is close to zero.",
    },
    facts: [
      { label: "Smart slot", value: "11:30 – 12:00" },
      { label: "Leave home", value: "11:10" },
      { label: "Confidence", value: "93%" },
    ],
  },
  {
    id: "payment",
    keywords: ["payment", "पैसा", "भुगतान", "पेमेंट", "बैंक", "money", "rupee"],
    question: { hi: "मेरी payment कब आएगी?", en: "When will my payment arrive?" },
    answer: {
      hi: "आपकी राशि ₹2,91,600 स्वीकृत हो चुकी है। तुलाई के 48 घंटे के भीतर PNB खाते ••••4417 में जमा होगी।",
      en: "Your amount of ₹2,91,600 is approved. It will be credited to PNB account ••••4417 within 48 hours of weighing.",
    },
    facts: [
      { label: "Amount", value: "₹2,91,600" },
      { label: "Rate", value: "₹2,430 / quintal" },
      { label: "Status", value: "Approved · in transfer" },
    ],
  },
];

export const fallbackAnswer: Record<Language, string> = {
  hi: "मैं आपकी बारी, सेंटर, स्लॉट और payment के बारे में बता सकता हूँ। नीचे दिए सवालों में से कोई चुनें।",
  en: "I can help with your turn, centre choice, slot timing and payment. Pick one of the questions below.",
};

export function matchIntent(transcript: string): VoiceIntent | null {
  const text = transcript.toLowerCase();
  let best: { intent: VoiceIntent; score: number } | null = null;
  for (const intent of voiceIntents) {
    const score = intent.keywords.reduce((n, k) => (text.includes(k.toLowerCase()) ? n + 1 : n), 0);
    if (score > 0 && (!best || score > best.score)) best = { intent, score };
  }
  return best?.intent ?? null;
}

export function speak(text: string, language: Language) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = language === "hi" ? "hi-IN" : "en-IN";
  utterance.rate = 0.95;
  window.speechSynthesis.speak(utterance);
}

type RecognitionCtor = new () => {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
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
