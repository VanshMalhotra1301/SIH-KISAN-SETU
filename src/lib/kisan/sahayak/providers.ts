/**
 * KISAN SETU SAHAYAK — Modular AI Provider Architecture
 * Supports pluggable AI models (Gemini / OpenAI) with an intelligent built-in semantic reasoner.
 * Allows easy switching or upgrading of the underlying LLM provider.
 */

import type { PrimaryIntent } from "./knowledge";
import type { LiveVoiceContext, SahayakConversationState, SahayakResponse } from "../voice";

export interface AIAnalysisResult {
  intents: PrimaryIntent[];
  primaryIntent: PrimaryIntent;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  entities: {
    crop?: string;
    quantity?: number;
    centreName?: string;
    centreId?: string;
    timeOrSlot?: string;
    token?: string;
    actionType?: string;
    grievanceCategory?: string;
    targetTab?: string;
  };
  toolsNeeded: string[];
  isMultiIntent: boolean;
  requiresClarification: boolean;
  clarificationQuestionEn?: string;
  clarificationQuestionHi?: string;
  isOutOfScope: boolean;
}

export interface SahayakAIProvider {
  name: string;
  isAvailable(): boolean;
  analyzeQuery(
    rawQuery: string,
    context: LiveVoiceContext,
    sessionState: SahayakConversationState,
    lang: "hi" | "en"
  ): Promise<AIAnalysisResult>;
}

/**
 * Gemini / External LLM Provider (Activated if API key is provided)
 */
export class GeminiAIProvider implements SahayakAIProvider {
  name = "Gemini AI";
  private apiKey: string | null = null;

  constructor() {
    // Check for vite environment variable if configured
    this.apiKey = (typeof import.meta !== "undefined" && import.meta.env?.VITE_GEMINI_API_KEY) || null;
  }

  isAvailable(): boolean {
    return Boolean(this.apiKey);
  }

  async analyzeQuery(
    rawQuery: string,
    context: LiveVoiceContext,
    sessionState: SahayakConversationState,
    lang: "hi" | "en"
  ): Promise<AIAnalysisResult> {
    if (!this.apiKey) {
      throw new Error("Gemini API key not configured");
    }

    try {
      const prompt = `You are the NLU parser for Kisan Setu Sahayak (Indian government agricultural procurement platform).
The farmer query is: "${rawQuery}"
Current language: ${lang}
Last conversation topic: ${sessionState.lastTopic || "none"}
Last referenced centre: ${sessionState.lastReferencedCentreName || "none"}

Classify into one or more of these intents:
GREETING, CHECK_QUEUE_ETA, LATE_ARRIVAL_RULES, CHECK_PAYMENT_DBT, PAYMENT_DELAY_TROUBLESHOOT, COMPARE_CENTRES, FIND_NEAREST_CENTRE, BOOK_SLOT, RESCHEDULE_SLOT, CANCEL_SLOT, CHECK_PROCUREMENT_STATUS, WEIGHING_PROCESS, QUALITY_FAQ_GRADING, REJECTION_RULES, J_FORM_BILLS, REQUIRED_DOCUMENTS, FILE_GRIEVANCE, CHECK_GRIEVANCE_STATUS, FARMER_REGISTRATION, MSP_RATES, PLATFORM_HELP, NAVIGATE_TAB, WEATHER_OR_GENERAL_FARMING, OUT_OF_SCOPE, UNKNOWN.

Return JSON with:
{
  "intents": ["PRIMARY_INTENT", "OPTIONAL_SECONDARY_INTENT"],
  "primaryIntent": "PRIMARY_INTENT",
  "confidence": "HIGH" | "MEDIUM" | "LOW",
  "entities": {
    "crop": string | null,
    "quantity": number | null,
    "centreName": string | null,
    "timeOrSlot": string | null,
    "token": string | null
  },
  "toolsNeeded": ["getQueueStatus", "getPaymentStatus", etc.],
  "isMultiIntent": boolean,
  "requiresClarification": boolean,
  "isOutOfScope": boolean
}`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json" },
          }),
        }
      );

      const json = await response.json();
      const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("Empty Gemini response");

      return JSON.parse(text) as AIAnalysisResult;
    } catch (e) {
      console.warn("Gemini API parsing failed, falling back to local Semantic Reasoner:", e);
      throw e;
    }
  }
}

/**
 * Provider Registry - Resolves active AI provider
 */
export class AIProviderRegistry {
  private static geminiProvider = new GeminiAIProvider();

  static getActiveProvider(): SahayakAIProvider | null {
    if (this.geminiProvider.isAvailable()) {
      return this.geminiProvider;
    }
    return null;
  }
}
