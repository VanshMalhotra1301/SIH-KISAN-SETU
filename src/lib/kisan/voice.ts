/**
 * KISAN SETU SAHAYAK — Voice Processing & Audio Management Tier
 * Handles continuous microphone streaming, speech buffering, silence detection (VAD),
 * manual done triggers, and Hindi/English speech synthesis.
 */

import type {
  Farmer,
  Grievance,
  Language,
  PaymentStatus,
  ProcurementCentre,
  QueueRow,
  QueueTicket,
  SlotSuggestion,
  TimelineStep,
} from "./types";
import { SahayakNLPEngine } from "./sahayak/engine";

export interface LiveVoiceContext {
  farmer?: Farmer | null;
  ticket?: QueueTicket | null;
  queueRow?: QueueRow | null;
  slot?: SlotSuggestion | null;
  payment?: PaymentStatus | null;
  centres?: ProcurementCentre[];
  timeline?: TimelineStep[];
  grievances?: Grievance[];
  notifications?: Array<{ id: string; title: string; body: string; isRead: boolean }>;
}

export interface SahayakAction {
  type: "book_slot" | "reschedule_slot" | "navigate" | "file_complaint" | "open_modal";
  labelEn: string;
  labelHi: string;
  payload?: any;
  requiresConfirmation?: boolean;
}

export interface SahayakConversationState {
  lastTopic?: "turn" | "procurement" | "centre" | "payment" | "slot" | "weighing" | "grievance" | "help" | null;
  lastReferencedCentreId?: string | null;
  lastReferencedCentreName?: string | null;
  pendingAction?: SahayakAction | null;
}

export interface SahayakResponse {
  text: string;
  speechText: string;
  confidence?: "HIGH" | "MEDIUM" | "LOW";
  facts?: Array<{ label: string; value: string }>;
  navigationTarget?: "home" | "centres" | "queue" | "timeline" | "payments" | "grievances" | "help" | "profile" | null;
  action?: SahayakAction | null;
  suggestedFollowUps?: Array<{ textEn: string; textHi: string }>;
}

/**
 * Async query processor leveraging live Supabase tools & deep NLP
 */
export async function processSahayakQueryAsync(
  rawQuery: string,
  ctx: LiveVoiceContext,
  lang: Language,
  sessionState: SahayakConversationState = {}
): Promise<SahayakResponse> {
  const hi = lang === "hi";
  return await SahayakNLPEngine.processQueryAsync(rawQuery, ctx, hi, sessionState);
}

/**
 * Synchronous query processor for immediate local responses
 */
export function processSahayakQuery(
  rawQuery: string,
  ctx: LiveVoiceContext,
  lang: Language,
  sessionState: SahayakConversationState = {}
): SahayakResponse {
  const hi = lang === "hi";
  return SahayakNLPEngine.processQuerySync(rawQuery, ctx, hi, sessionState);
}

/**
 * Voice Capture Engine: Continuous Speech Recognition with Silence Timer & Buffering
 */
export interface VoiceCaptureCallbacks {
  onInterimText: (interim: string) => void;
  onFinalSpeech: (finalTranscript: string) => void;
  onError: (err: any) => void;
  onStateChange: (state: "listening" | "processing" | "idle") => void;
}

export class VoiceCaptureSession {
  private recognition: any = null;
  private accumulatedFinal = "";
  private currentInterim = "";
  private silenceTimer: any = null;
  private isExplicitlyStopped = false;
  private lang: Language = "hi";
  private callbacks: VoiceCaptureCallbacks;

  // 2.0 second natural pause threshold before finalizing speech
  private readonly SILENCE_TIMEOUT_MS = 2000;

  constructor(lang: Language, callbacks: VoiceCaptureCallbacks) {
    this.lang = lang;
    this.callbacks = callbacks;
  }

  start() {
    if (typeof window === "undefined") return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      this.callbacks.onError(new Error("Speech recognition not supported in this browser"));
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.lang = this.lang === "hi" ? "hi-IN" : "en-IN";
    this.recognition.continuous = true; // Never cut off early
    this.recognition.interimResults = true; // Show live interim preview
    this.recognition.maxAlternatives = 1;

    this.accumulatedFinal = "";
    this.currentInterim = "";
    this.isExplicitlyStopped = false;

    this.recognition.onstart = () => {
      this.callbacks.onStateChange("listening");
    };

    this.recognition.onresult = (event: any) => {
      this.clearSilenceTimer();

      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const item = event.results[i];
        if (item.isFinal) {
          this.accumulatedFinal += " " + item[0].transcript;
        } else {
          interim += item[0].transcript;
        }
      }

      this.currentInterim = interim.trim();
      const previewText = (this.accumulatedFinal + " " + this.currentInterim).trim();
      this.callbacks.onInterimText(previewText);

      // Start silence debounce timer: fires once farmer stops speaking for 2.0s
      this.silenceTimer = setTimeout(() => {
        this.finalizeAndSubmit();
      }, this.SILENCE_TIMEOUT_MS);
    };

    this.recognition.onerror = (e: any) => {
      if (e.error === "no-speech") {
        // Ignore benign no-speech events during pauses
        return;
      }
      this.clearSilenceTimer();
      this.callbacks.onError(e);
    };

    this.recognition.onend = () => {
      this.clearSilenceTimer();
      if (!this.isExplicitlyStopped && (this.accumulatedFinal || this.currentInterim)) {
        // Auto-restart if browser prematurely ends continuous session
        try {
          this.recognition.start();
        } catch {
          this.finalizeAndSubmit();
        }
      } else {
        this.callbacks.onStateChange("idle");
      }
    };

    try {
      this.recognition.start();
    } catch (err) {
      this.callbacks.onError(err);
    }
  }

  /**
   * Manual 'Done' fallback button: immediately stops listening and submits current full speech
   */
  finishManual() {
    this.isExplicitlyStopped = true;
    this.clearSilenceTimer();
    this.finalizeAndSubmit();
  }

  /**
   * Stop completely without submitting
   */
  cancel() {
    this.isExplicitlyStopped = true;
    this.clearSilenceTimer();
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        // ignore
      }
    }
    this.callbacks.onStateChange("idle");
  }

  private clearSilenceTimer() {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
  }

  private finalizeAndSubmit() {
    this.isExplicitlyStopped = true;
    this.clearSilenceTimer();
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        // ignore
      }
    }

    const fullTranscript = (this.accumulatedFinal + " " + this.currentInterim).trim();
    this.accumulatedFinal = "";
    this.currentInterim = "";

    if (fullTranscript.length > 0) {
      this.callbacks.onStateChange("processing");
      this.callbacks.onFinalSpeech(fullTranscript);
    } else {
      this.callbacks.onStateChange("idle");
    }
  }
}

/**
 * Speech synthesis speaker with Hindi / Indian English voice prioritization
 */
export function speak(text: string, lang: Language, onEnd?: () => void) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();

  // Strip Markdown symbols from speech
  const cleanSpeech = text
    .replace(/[#*_`~]/g, "")
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const utterance = new SpeechSynthesisUtterance(cleanSpeech);
  utterance.lang = lang === "hi" ? "hi-IN" : "en-IN";
  utterance.rate = 0.95;
  utterance.pitch = 1.0;

  const voices = window.speechSynthesis.getVoices();
  const targetVoice =
    lang === "hi"
      ? voices.find((v) => v.lang.includes("hi") || v.name.includes("Hindi"))
      : voices.find((v) => v.lang.includes("en-IN") || v.name.includes("India"));

  if (targetVoice) utterance.voice = targetVoice;
  if (onEnd) utterance.onend = onEnd;

  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking() {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}
