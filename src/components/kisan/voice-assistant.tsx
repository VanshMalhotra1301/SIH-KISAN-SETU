import { useCallback, useEffect, useRef, useState } from "react";
import { useKisan } from "@/lib/kisan/store";
import {
  getRecognition,
  processSahayakQuery,
  speak,
  stopSpeaking,
  type SahayakAction,
  type SahayakConversationState,
  type SahayakResponse,
} from "@/lib/kisan/voice";
import { cn } from "@/lib/utils";

type VoiceState = "idle" | "listening" | "thinking" | "speaking";

interface VoiceAssistantProps {
  onNavigateTab?: (tab: string) => void;
  onExecuteAction?: (action: SahayakAction) => Promise<void>;
}

export function VoiceAssistant({ onNavigateTab, onExecuteAction }: VoiceAssistantProps) {
  const { language, toggleLanguage, farmer, ticket, slot, payment, centres, timeline } = useKisan();
  const hi = language === "hi";

  const [state, setState] = useState<VoiceState>("idle");
  const [textInput, setTextInput] = useState("");
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState<SahayakResponse | null>(null);
  const [executingAction, setExecutingAction] = useState(false);

  // Session conversation memory state
  const sessionStateRef = useRef<SahayakConversationState>({});
  const recRef = useRef<ReturnType<typeof getRecognition>>(null);

  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, []);

  const handleQuery = useCallback(
    (queryText: string) => {
      if (!queryText.trim()) return;
      setTranscript(queryText);
      setTextInput("");
      setState("thinking");

      window.setTimeout(() => {
        const res = processSahayakQuery(
          queryText,
          { farmer, ticket, slot, payment, centres, timeline },
          language,
          sessionStateRef.current
        );

        setResponse(res);
        setState("speaking");

        // Speak natural voice response
        speak(res.speechText || res.text, language);

        // Optional navigation trigger
        if (res.navigationTarget && onNavigateTab) {
          onNavigateTab(res.navigationTarget);
        }
      }, 400);
    },
    [farmer, ticket, slot, payment, centres, timeline, language, onNavigateTab]
  );

  const startListening = useCallback(() => {
    stopSpeaking();
    const rec = getRecognition(language);
    if (!rec) {
      // Fallback for browsers without Web Speech API
      handleQuery(hi ? "मेरी बारी कब आएगी?" : "When is my turn?");
      return;
    }
    recRef.current = rec;
    setTranscript("");
    setResponse(null);
    setState("listening");

    rec.onresult = (e: any) => {
      const said = e.results[0]?.[0]?.transcript ?? "";
      handleQuery(said);
    };
    rec.onerror = () => setState("idle");
    rec.onend = () => setState((s) => (s === "listening" ? "idle" : s));
    rec.start();
  }, [hi, language, handleQuery]);

  const handleStop = useCallback(() => {
    recRef.current?.stop();
    stopSpeaking();
    setState("idle");
  }, []);

  const handleConfirmAction = async () => {
    if (!response?.action) return;
    setExecutingAction(true);
    try {
      if (onExecuteAction) {
        await onExecuteAction(response.action);
      }
      const successMsg = hi ? "कार्रवाई सफलतापूर्वक पूरी हुई।" : "Action confirmed and completed.";
      speak(successMsg, language);
      setResponse((prev) =>
        prev
          ? {
              ...prev,
              action: null,
              text: hi ? "✓ कार्रवाई सफलतापूर्वक पूरी हुई।" : "✓ Action successfully completed.",
            }
          : null
      );
    } catch (err: any) {
      alert(err.message || "Failed to execute action");
    } finally {
      setExecutingAction(false);
    }
  };

  const stateLabels: Record<VoiceState, { en: string; hi: string; subtitleEn: string; subtitleHi: string }> = {
    idle: {
      en: "Tap Microphone to Speak",
      hi: "बोलने के लिए माइक दबाएँ",
      subtitleEn: "Ask about your turn, nearest centre, weighment or DBT payment",
      subtitleHi: "अपनी बारी, खरीद केंद्र, तुलाई या बैंक भुगतान के बारे में पूछें",
    },
    listening: {
      en: "Listening to you…",
      hi: "सुन रहा हूँ, कृपया बोलिए…",
      subtitleEn: "Speak naturally in Hindi, Hinglish or English",
      subtitleHi: "अपनी भाषा में सहजता से बोलें",
    },
    thinking: {
      en: "Analyzing live data…",
      hi: "लाइव डेटाबेस से जानकारी देख रहा हूँ…",
      subtitleEn: "Retrieving your real-time procurement context",
      subtitleHi: "आपकी सक्रिय खरीद जानकारी जांची जा रही है",
    },
    speaking: {
      en: "Speaking response",
      hi: "सहायक जवाब दे रहा है",
      subtitleEn: "Kisan Setu AI Voice Response",
      subtitleHi: "किसान सेतु सहायक ऑडियो उत्तर",
    },
  };

  const defaultPrompts = [
    { en: "When is my turn?", hi: "मेरी बारी कब आएगी?" },
    { en: "Which centre is least crowded?", hi: "सबसे कम भीड़ वाला केंद्र कौन सा है?" },
    { en: "What time should I reach?", hi: "मुझे कितने बजे पहुँचना है?" },
    { en: "When will my payment come?", hi: "मेरी payment कब आएगी?" },
    { en: "How is weighing done?", hi: "तुलाई और नमी की जाँच कैसे होती है?" },
    { en: "How to register a complaint?", hi: "शिकायत कैसे दर्ज करें?" },
  ];

  return (
    <section className="surface-lift overflow-hidden border-2 border-leaf/40">
      {/* Sahayak Brand Header */}
      <div className="bg-hero p-5 text-primary-foreground sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-leaf/25 text-2xl backdrop-blur shadow-inner">
              🌾
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-leaf">
                  {hi ? "आधिकारिक किसान सहायक" : "Digital AI Companion"}
                </p>
                <span className="size-1.5 rounded-full bg-leaf animate-blip" />
              </div>
              <h2 className="font-display text-xl font-extrabold tracking-tight sm:text-2xl">
                {hi ? "किसान सेतु एआई सहायक" : "Kisan Setu AI Sahayak"}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={toggleLanguage}
            className="flex items-center gap-1 rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-3.5 py-1.5 text-xs font-bold backdrop-blur focus-ring transition-transform hover:scale-105"
          >
            🌐 {hi ? "हिं (Hindi)" : "EN (English)"}
          </button>
        </div>
      </div>

      <div className="flex flex-col items-center gap-5 p-6 sm:p-7">
        {/* Animated Microphone Button */}
        <button
          type="button"
          onClick={state === "idle" ? startListening : handleStop}
          aria-label={hi ? stateLabels[state].hi : stateLabels[state].en}
          className={cn(
            "relative flex size-28 items-center justify-center rounded-full transition-all duration-300 focus-ring active:scale-95 sm:size-32",
            state === "idle" && "bg-gradient-leaf shadow-xl shadow-leaf/30 hover:scale-105",
            state === "listening" && "bg-gradient-saffron shadow-xl shadow-saffron/40",
            state === "thinking" && "bg-navy animate-pulse",
            state === "speaking" && "bg-navy ring-4 ring-leaf shadow-xl shadow-leaf/30"
          )}
        >
          {state === "listening" ? (
            <>
              <span className="absolute inline-flex size-full rounded-full bg-saffron/40 animate-pulse-ring" />
              <span
                className="absolute inline-flex size-full rounded-full bg-saffron/30 animate-pulse-ring"
                style={{ animationDelay: "0.5s" }}
              />
            </>
          ) : null}

          {state === "speaking" ? (
            <span className="absolute inline-flex size-full rounded-full bg-leaf/20 animate-pulse-ring" />
          ) : null}

          <svg
            viewBox="0 0 24 24"
            className="relative size-12 text-primary-foreground transition-transform sm:size-14"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="9" y="3" width="6" height="11" rx="3" />
            <path d="M5 11a7 7 0 0 0 14 0M12 18v3M8.5 21h7" strokeLinecap="round" />
          </svg>
        </button>

        {/* State description */}
        <div className="text-center">
          <p className="font-display text-lg font-extrabold text-navy">
            {hi ? stateLabels[state].hi : stateLabels[state].en}
          </p>
          <p className="text-xs font-semibold text-muted-foreground mt-0.5">
            {hi ? stateLabels[state].subtitleHi : stateLabels[state].subtitleEn}
          </p>

          {/* Equalizer animation in listening / speaking mode */}
          {state === "listening" || state === "speaking" ? (
            <div className="mt-3 flex items-end justify-center gap-1.5" aria-hidden>
              {[14, 28, 42, 20, 34, 24, 14].map((h, i) => (
                <span
                  key={i}
                  className={cn(
                    "w-1.5 rounded-full animate-blip",
                    state === "listening" ? "bg-saffron" : "bg-leaf"
                  )}
                  style={{
                    height: `${h}px`,
                    animationDelay: `${i * 120}ms`,
                  }}
                />
              ))}
            </div>
          ) : null}
        </div>

        {/* Text Input / Type Question Fallback */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleQuery(textInput);
          }}
          className="flex w-full gap-2"
        >
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder={
              hi
                ? "यहाँ टाइप करें (उदा: मेरी बारी कब आएगी? या पेमेंट कब मिलेगी?)"
                : "Type here (e.g. When is my turn? or Show my payment)"
            }
            className="h-12 flex-1 rounded-xl border border-input bg-card px-4 text-xs font-semibold text-navy focus-ring"
          />
          <button
            type="submit"
            disabled={!textInput.trim()}
            className="h-12 rounded-xl bg-navy px-5 text-xs font-bold text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:opacity-50 focus-ring"
          >
            {hi ? "पूछें →" : "Ask →"}
          </button>
        </form>

        {/* Spoken Transcript Bubble */}
        {transcript ? (
          <div className="w-full animate-rise rounded-2xl bg-muted/80 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {hi ? "आपका प्रश्न" : "You Asked"}
            </p>
            <p className="mt-1 font-display text-sm font-extrabold text-navy">“{transcript}”</p>
          </div>
        ) : null}

        {/* Live Contextual Answer Card */}
        {response ? (
          <div className="w-full animate-rise rounded-2xl border-2 border-leaf/40 bg-leaf-soft p-5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-leaf">
                <span className="size-2 rounded-full bg-leaf animate-blip" />
                {hi ? "सहायक का उत्तर" : "Sahayak Verified Answer"}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => speak(response.speechText || response.text, language)}
                  className="inline-flex items-center gap-1 rounded-lg bg-navy px-2.5 py-1 text-xs font-bold text-primary-foreground focus-ring"
                >
                  🔊 {hi ? "दोबारा सुनें" : "Listen"}
                </button>
                <button
                  type="button"
                  onClick={stopSpeaking}
                  className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-bold text-navy focus-ring"
                >
                  ⏹ {hi ? "रोकें" : "Stop"}
                </button>
              </div>
            </div>

            <p className="mt-3 font-display text-base font-extrabold leading-relaxed text-navy whitespace-pre-line">
              {response.text}
            </p>

            {/* Context Facts Grid */}
            {response.facts && response.facts.length > 0 ? (
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                {response.facts.map((f) => (
                  <div key={f.label} className="rounded-xl bg-card p-3 shadow-xs">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                      {f.label}
                    </p>
                    <p className="mt-0.5 font-display text-sm font-extrabold text-navy">{f.value}</p>
                  </div>
                ))}
              </div>
            ) : null}

            {/* Guided Safe Action Confirmation Box */}
            {response.action ? (
              <div className="mt-4 rounded-xl border border-saffron/40 bg-saffron-soft p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-navy">
                  ⚡ {hi ? "सुझाई गई कार्रवाई (Action)" : "Suggested Action"}
                </p>
                <p className="mt-1 text-xs font-bold text-navy">
                  {hi ? response.action.labelHi : response.action.labelEn}
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    disabled={executingAction}
                    onClick={handleConfirmAction}
                    className="flex-1 rounded-xl bg-gradient-leaf py-2.5 text-xs font-bold text-primary-foreground shadow-sm hover:scale-[1.01] transition-transform focus-ring"
                  >
                    {executingAction ? (hi ? "प्रक्रिया जारी..." : "Executing...") : hi ? "✓ हाँ, अभी करें (Confirm)" : "✓ Confirm Action"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setResponse((prev) => (prev ? { ...prev, action: null } : null))}
                    className="rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-bold text-muted-foreground hover:text-navy focus-ring"
                  >
                    ✕ {hi ? "रद्द करें" : "Cancel"}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Quick Suggestion Chips */}
        <div className="w-full pt-1">
          <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {hi ? "💡 तुरंत पूछने के लिए टैप करें" : "💡 Tap to ask instantly"}
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {(response?.suggestedFollowUps
              ? response.suggestedFollowUps.map((p) => ({ en: p.textEn, hi: p.textHi }))
              : defaultPrompts
            ).map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleQuery(hi ? item.hi : item.en)}
                className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card p-3 text-left transition-all hover:border-leaf/50 hover:bg-leaf-soft focus-ring"
              >
                <span className="font-display text-xs font-bold text-navy">
                  {hi ? item.hi : item.en}
                </span>
                <span className="text-leaf text-sm font-bold" aria-hidden>
                  →
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
