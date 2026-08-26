import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useKisan } from "@/lib/kisan/store";
import {
  processSahayakQueryAsync,
  speak,
  stopSpeaking,
  VoiceCaptureSession,
  type SahayakAction,
  type SahayakConversationState,
  type SahayakResponse,
} from "@/lib/kisan/voice";
import {
  SahayakQuestionGenerator,
  type SuggestedQuestion,
} from "@/lib/kisan/sahayak/question-generator";
import { cn } from "@/lib/utils";

type VoiceState = "idle" | "listening" | "thinking" | "speaking";
type ViewMode = "moving" | "grid";

interface VoiceAssistantProps {
  currentTab?: string;
  onNavigateTab?: (tab: string) => void;
  onExecuteAction?: (action: SahayakAction) => Promise<void>;
}

export function VoiceAssistant({ currentTab = "home", onNavigateTab, onExecuteAction }: VoiceAssistantProps) {
  const { language, toggleLanguage, farmer, ticket, slot, payment, centres, timeline, grievances, notifications } = useKisan();
  const hi = language === "hi";

  const [state, setState] = useState<VoiceState>("idle");
  const [textInput, setTextInput] = useState("");
  const [liveInterim, setLiveInterim] = useState("");
  const [finalTranscript, setFinalTranscript] = useState("");
  const [response, setResponse] = useState<SahayakResponse | null>(null);
  const [executingAction, setExecutingAction] = useState(false);
  const [showKnowledgeCatalog, setShowKnowledgeCatalog] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isAnimationPaused, setIsAnimationPaused] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("moving");

  // Session conversation memory state
  const sessionStateRef = useRef<SahayakConversationState>({});
  const voiceSessionRef = useRef<VoiceCaptureSession | null>(null);

  useEffect(() => {
    return () => {
      stopSpeaking();
      voiceSessionRef.current?.cancel();
    };
  }, []);

  const handleQuery = useCallback(
    async (queryText: string) => {
      if (!queryText.trim()) return;
      setFinalTranscript(queryText);
      setLiveInterim("");
      setTextInput("");
      setState("thinking");

      try {
        const res = await processSahayakQueryAsync(
          queryText,
          { farmer, ticket, slot, payment, centres, timeline, grievances, notifications },
          language,
          sessionStateRef.current
        );

        setResponse(res);
        setState("speaking");

        // Speak natural voice response
        speak(res.speechText || res.text, language, () => {
          setState("idle");
        });

        // Optional navigation trigger
        if (res.navigationTarget && onNavigateTab) {
          onNavigateTab(res.navigationTarget);
        }
      } catch (err) {
        console.error("Sahayak Query Processing Failed:", err);
        setState("idle");
      }
    },
    [farmer, ticket, slot, payment, centres, timeline, grievances, notifications, language, onNavigateTab]
  );

  const startListening = useCallback(() => {
    stopSpeaking();
    setLiveInterim("");
    setFinalTranscript("");
    setResponse(null);

    const session = new VoiceCaptureSession(language, {
      onInterimText: (interim) => {
        setLiveInterim(interim);
      },
      onFinalSpeech: (finalText) => {
        handleQuery(finalText);
      },
      onError: (err) => {
        console.warn("Speech session error:", err);
        setState("idle");
      },
      onStateChange: (st) => {
        if (st === "listening") setState("listening");
        else if (st === "processing") setState("thinking");
        else if (st === "idle") setState((prev) => (prev === "listening" ? "idle" : prev));
      },
    });

    voiceSessionRef.current = session;
    session.start();
  }, [language, handleQuery]);

  const handleDoneSpeaking = useCallback(() => {
    if (voiceSessionRef.current) {
      voiceSessionRef.current.finishManual();
    }
  }, []);

  const handleCancelListening = useCallback(() => {
    voiceSessionRef.current?.cancel();
    stopSpeaking();
    setState("idle");
    setLiveInterim("");
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

  // ─── DYNAMIC CONTEXTUAL QUESTION DISCOVERY ───
  const discoveryOpts = useMemo(() => ({
    farmer,
    ticket,
    slot,
    payment,
    centres,
    timeline,
    grievances,
    currentTab,
    sessionState: sessionStateRef.current,
    lastResponse: response,
  }), [farmer, ticket, slot, payment, centres, timeline, grievances, currentTab, response]);

  const dynamicSuggestions = useMemo(() => {
    return SahayakQuestionGenerator.getDynamicSuggestions(discoveryOpts, language);
  }, [discoveryOpts, language]);

  // Dual moving ticker question streams
  const movingStreams = useMemo(() => {
    return SahayakQuestionGenerator.getMovingQuestionStreams(discoveryOpts, language);
  }, [discoveryOpts, language]);

  // Dynamic follow-ups based on last topic
  const smartFollowUps = useMemo(() => {
    return SahayakQuestionGenerator.getSmartFollowUps(sessionStateRef.current.lastTopic, language);
  }, [response, language]);

  // Full categorized knowledge catalog
  const knowledgeCatalog = useMemo(() => {
    return SahayakQuestionGenerator.getCategorizedKnowledgeCatalog(farmer?.crop, farmer?.cropHi);
  }, [farmer?.crop, farmer?.cropHi]);

  // Category filter tabs
  const categoryTabs = useMemo(() => [
    { id: "all", labelEn: "🌟 Recommended for You", labelHi: "🌟 आपके लिए विशेष", icon: "✨" },
    { id: "queue", labelEn: "Queue & Token", labelHi: "कतार व टोकन", icon: "⏳" },
    { id: "centres", labelEn: "Centres & Slots", labelHi: "केंद्र व स्लॉट", icon: "🏢" },
    { id: "weighing", labelEn: "Weighing & FAQ", labelHi: "तुलाई व नमी", icon: "⚖️" },
    { id: "payment", labelEn: "MSP & Bank DBT", labelHi: "एमएसपी व भुगतान", icon: "💳" },
    { id: "grievance", labelEn: "Help & Grievance", labelHi: "शिकायत व मदद", icon: "📢" },
  ], []);

  // Filtered list when a specific tab is selected
  const activeCategoryQuestions = useMemo(() => {
    if (selectedCategory === "all") return dynamicSuggestions;
    const found = knowledgeCatalog.find((c) => c.id === selectedCategory);
    if (!found) return dynamicSuggestions;
    return found.questions.map((q, idx) => ({
      id: `${selectedCategory}_${idx}`,
      category: "discovery" as const,
      categoryLabelEn: found.categoryTitleEn,
      categoryLabelHi: found.categoryTitleHi,
      textEn: q.textEn,
      textHi: q.textHi,
      icon: found.icon,
      tagEn: found.categoryTitleEn.split(" ")[0],
      tagHi: found.categoryTitleHi.split(" ")[0],
    }));
  }, [selectedCategory, dynamicSuggestions, knowledgeCatalog]);

  const stateLabels: Record<VoiceState, { en: string; hi: string; subtitleEn: string; subtitleHi: string }> = {
    idle: {
      en: "Tap Microphone to Speak",
      hi: "बोलने के लिए माइक दबाएँ",
      subtitleEn: "Ask about your turn, queue ETA, DBT payment, weighing, or slot booking",
      subtitleHi: "अपनी बारी, टोकन, बैंक भुगतान, तुलाई या स्लॉट बुकिंग के बारे में पूछें",
    },
    listening: {
      en: "Listening to your complete question…",
      hi: "पूरा वाक्य सुन रहा हूँ, कृपया बोलिए…",
      subtitleEn: "Speak naturally with pauses — tap 'Done' when finished",
      subtitleHi: "सहजता से अपनी पूरी बात कहें — बोलने के बाद 'हो गया' दबाएं",
    },
    thinking: {
      en: "Reasoning over live Supabase data…",
      hi: "लाइव डेटाबेस से जानकारी जांची जा रही है…",
      subtitleEn: "Retrieving real-time procurement & queue intelligence",
      subtitleHi: "आपकी वास्तविक खरीद स्थिति का विश्लेषण हो रहा है",
    },
    speaking: {
      en: "Sahayak is responding",
      hi: "सहायक जवाब दे रहा है",
      subtitleEn: "Kisan Setu Intelligent Voice Output",
      subtitleHi: "किसान सेतु आधिकारिक ऑडियो उत्तर",
    },
  };

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
                  {hi ? "आधिकारिक किसान सहायक (NLP 2.0)" : "Advanced Procurement AI (NLP 2.0)"}
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

      <div className="flex flex-col items-center gap-5 p-5 sm:p-7">
        {/* Main Microphone Interaction Circle */}
        <div className="relative flex flex-col items-center">
          <button
            type="button"
            onClick={state === "idle" ? startListening : handleCancelListening}
            aria-label={hi ? stateLabels[state].hi : stateLabels[state].en}
            className={cn(
              "relative flex size-28 items-center justify-center rounded-full transition-all duration-300 focus-ring active:scale-95 sm:size-32",
              state === "idle" && "bg-gradient-leaf shadow-xl shadow-leaf/30 hover:scale-105",
              state === "listening" && "bg-gradient-saffron shadow-xl shadow-saffron/40 ring-4 ring-saffron/50",
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

          {/* Manual Done Speaking & Cancel controls when listening */}
          {state === "listening" ? (
            <div className="mt-4 flex items-center gap-2 animate-rise">
              <button
                type="button"
                onClick={handleDoneSpeaking}
                className="flex items-center gap-1.5 rounded-full bg-navy px-5 py-2 text-xs font-black text-primary-foreground shadow-md transition-transform hover:scale-105 focus-ring"
              >
                <span>✓</span>
                <span>{hi ? "हो गया (Done)" : "Done Speaking"}</span>
              </button>
              <button
                type="button"
                onClick={handleCancelListening}
                className="rounded-full border border-border bg-card px-4 py-2 text-xs font-bold text-muted-foreground hover:text-navy focus-ring"
              >
                ✕ {hi ? "रद्द करें" : "Cancel"}
              </button>
            </div>
          ) : null}
        </div>

        {/* State description */}
        <div className="text-center">
          <p className="font-display text-lg font-extrabold text-navy">
            {hi ? stateLabels[state].hi : stateLabels[state].en}
          </p>
          <p className="text-xs font-semibold text-muted-foreground mt-0.5 max-w-md">
            {hi ? stateLabels[state].subtitleHi : stateLabels[state].subtitleEn}
          </p>

          {/* Equalizer animation in listening / speaking mode */}
          {state === "listening" || state === "speaking" ? (
            <div className="mt-3 flex items-end justify-center gap-1.5" aria-hidden>
              {[14, 28, 42, 20, 34, 24, 14, 30, 18].map((h, i) => (
                <span
                  key={i}
                  className={cn(
                    "w-1.5 rounded-full animate-blip",
                    state === "listening" ? "bg-saffron" : "bg-leaf"
                  )}
                  style={{
                    height: `${h}px`,
                    animationDelay: `${i * 100}ms`,
                  }}
                />
              ))}
            </div>
          ) : null}
        </div>

        {/* Live Speaking Preview (Interim Transcript Stream) */}
        {state === "listening" && liveInterim ? (
          <div className="w-full animate-rise rounded-2xl border border-saffron/30 bg-saffron-soft/60 p-4">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-saffron animate-pulse" />
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-saffron">
                {hi ? "आप बोल रहे हैं (लाइव कैप्चर)..." : "Listening in real-time..."}
              </p>
            </div>
            <p className="mt-1.5 font-display text-sm font-bold text-navy italic">
              “{liveInterim}”
            </p>
          </div>
        ) : null}

        {/* Spoken Final Transcript Bubble */}
        {finalTranscript && state !== "listening" ? (
          <div className="w-full animate-rise rounded-2xl bg-muted/80 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {hi ? "आपका प्रश्न" : "You Asked"}
            </p>
            <p className="mt-1 font-display text-sm font-extrabold text-navy">“{finalTranscript}”</p>
          </div>
        ) : null}

        {/* Live Contextual Answer Card */}
        {response ? (
          <div className="w-full animate-rise rounded-2xl border-2 border-leaf/40 bg-leaf-soft p-5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-leaf">
                <span className="size-2 rounded-full bg-leaf animate-blip" />
                {hi ? "सहायक का प्रामाणिक उत्तर (Live Data)" : "Sahayak Verified Answer (Live DB)"}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => speak(response.speechText || response.text, language)}
                  className="inline-flex items-center gap-1 rounded-lg bg-navy px-2.5 py-1 text-xs font-bold text-primary-foreground focus-ring hover:opacity-90"
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
                {response.facts.map((f, i) => (
                  <div key={i} className="rounded-xl bg-card p-3 shadow-xs border border-border/50">
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
                  ⚡ {hi ? "सुझाई गई कार्रवाई (Action Confirmation)" : "Action Confirmation Required"}
                </p>
                <p className="mt-1 text-xs font-bold text-navy">
                  {hi ? response.action.labelHi : response.action.labelEn}
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    disabled={executingAction}
                    onClick={handleConfirmAction}
                    className="flex-1 rounded-xl bg-gradient-leaf py-2.5 text-xs font-black text-primary-foreground shadow-sm hover:scale-[1.01] transition-transform focus-ring"
                  >
                    {executingAction ? (hi ? "प्रक्रिया जारी..." : "Executing...") : hi ? "✓ हाँ, अभी कन्फर्म करें" : "✓ Confirm & Execute"}
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

            {/* Smart Contextual Follow-Up Suggestions */}
            <div className="mt-5 border-t border-leaf/20 pt-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-leaf">
                {hi ? "🎯 संबंधित अगले प्रश्न (Next Follow-Ups)" : "🎯 Recommended Next Steps"}
              </p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {smartFollowUps.map((fu, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleQuery(hi ? fu.textHi : fu.textEn)}
                    className="flex items-center gap-1.5 rounded-xl border border-leaf/40 bg-card px-3.5 py-2 text-xs font-bold text-navy shadow-xs transition-all hover:bg-leaf-soft hover:border-leaf focus-ring"
                  >
                    <span>{fu.icon}</span>
                    <span>{hi ? fu.textHi : fu.textEn}</span>
                    <span className="text-leaf ml-0.5">→</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {/* Text Input / Type Question Fallback */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleQuery(textInput);
          }}
          className="flex w-full gap-2 pt-1"
        >
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder={
              hi
                ? "यहाँ लिखें (उदा: मेरी बारी कब है और payment कब आएगी?)"
                : "Type here (e.g. When is my turn and when will payment come?)"
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

        {/* ─── DYNAMIC MOVING QUESTION DISCOVERY SYSTEM ─── */}
        <div className="w-full pt-2">
          {/* Header Bar with Controls */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 mb-3">
            <div className="flex items-center gap-2">
              <span className="flex size-2.5 rounded-full bg-leaf animate-pulse" />
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-navy">
                  {hi ? "आप किसान सेतु से पूछ सकते हैं" : "YOU CAN ASK KISAN SETU"}
                </p>
                <p className="text-[9px] font-bold text-muted-foreground">
                  {hi ? "सहजता से पूछने के लिए किसी भी चलते हुए प्रश्न पर टैप करें" : "Tap any moving question chip to ask instantly"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Animation Play/Pause Toggle */}
              {viewMode === "moving" && selectedCategory === "all" ? (
                <button
                  type="button"
                  onClick={() => setIsAnimationPaused((prev) => !prev)}
                  title={isAnimationPaused ? "Resume Animation" : "Pause Animation"}
                  className="flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1 text-[10px] font-bold text-navy hover:bg-muted focus-ring transition-colors"
                >
                  <span>{isAnimationPaused ? "▶" : "⏸"}</span>
                  <span className="hidden sm:inline">{isAnimationPaused ? (hi ? "चलाएं" : "Play") : (hi ? "रोकें" : "Pause")}</span>
                </button>
              ) : null}

              {/* View Switcher: Moving Stream vs Grid View */}
              <div className="flex rounded-lg border border-border bg-card p-0.5 text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => {
                    setViewMode("moving");
                    setSelectedCategory("all");
                  }}
                  className={cn(
                    "rounded-md px-2.5 py-1 transition-colors",
                    viewMode === "moving" && selectedCategory === "all"
                      ? "bg-navy text-primary-foreground"
                      : "text-muted-foreground hover:text-navy"
                  )}
                >
                  🌊 {hi ? "चलता हुआ" : "Stream"}
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={cn(
                    "rounded-md px-2.5 py-1 transition-colors",
                    viewMode === "grid" || selectedCategory !== "all"
                      ? "bg-navy text-primary-foreground"
                      : "text-muted-foreground hover:text-navy"
                  )}
                >
                  📋 {hi ? "ग्रिड सूची" : "Grid"}
                </button>
              </div>
            </div>
          </div>

          {/* Quick Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
            {categoryTabs.map((cat) => {
              const active = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    if (cat.id !== "all") setViewMode("grid");
                  }}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold transition-all focus-ring",
                    active
                      ? "bg-navy text-primary-foreground shadow-xs"
                      : "border border-border/80 bg-card text-muted-foreground hover:border-leaf/60 hover:text-navy"
                  )}
                >
                  <span className="text-xs">{cat.icon}</span>
                  <span>{hi ? cat.labelHi : cat.labelEn}</span>
                </button>
              );
            })}
          </div>

          {/* ─── MOVING STREAM ANIMATION VIEW (Dual Moving Tickers) ─── */}
          {viewMode === "moving" && selectedCategory === "all" ? (
            <div className="mt-2 space-y-2.5 overflow-hidden rounded-2xl border border-border/60 bg-muted/20 p-2.5 marquee-mask">
              {/* Row 1: Smooth Leftward Moving Questions */}
              <div
                className="overflow-hidden"
                style={{ animationPlayState: isAnimationPaused ? "paused" : "running" }}
              >
                <div
                  className="animate-marquee flex gap-2.5 items-center hover:[animation-play-state:paused]"
                  style={{ animationPlayState: isAnimationPaused ? "paused" : undefined }}
                >
                  {/* Repeated for seamless infinite loop */}
                  {[...movingStreams.row1, ...movingStreams.row1].map((item, idx) => (
                    <button
                      key={`row1_${idx}`}
                      type="button"
                      onClick={() => handleQuery(hi ? item.textHi : item.textEn)}
                      className="group flex shrink-0 items-center gap-2.5 rounded-2xl border border-border/90 bg-card/95 px-4 py-2.5 text-left shadow-xs backdrop-blur transition-all duration-200 hover:scale-[1.02] hover:border-leaf hover:bg-leaf-soft hover:shadow-md focus-ring"
                    >
                      <span className="text-base">{item.icon}</span>
                      <div className="flex flex-col">
                        <span className="text-[8px] font-black uppercase tracking-wider text-muted-foreground group-hover:text-leaf">
                          {hi ? (item.tagHi || item.categoryLabelHi) : (item.tagEn || item.categoryLabelEn)}
                        </span>
                        <span className="font-display text-xs font-extrabold text-navy whitespace-nowrap">
                          {hi ? item.textHi : item.textEn}
                        </span>
                      </div>
                      <span className="ml-1 text-leaf text-xs font-black opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all">
                        →
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Row 2: Smooth Rightward Moving Questions (Reverse Ticker) */}
              <div
                className="overflow-hidden"
                style={{ animationPlayState: isAnimationPaused ? "paused" : "running" }}
              >
                <div
                  className="animate-marquee-reverse flex gap-2.5 items-center hover:[animation-play-state:paused]"
                  style={{ animationPlayState: isAnimationPaused ? "paused" : undefined }}
                >
                  {/* Repeated for seamless infinite loop */}
                  {[...movingStreams.row2, ...movingStreams.row2].map((item, idx) => (
                    <button
                      key={`row2_${idx}`}
                      type="button"
                      onClick={() => handleQuery(hi ? item.textHi : item.textEn)}
                      className="group flex shrink-0 items-center gap-2.5 rounded-2xl border border-border/90 bg-card/95 px-4 py-2.5 text-left shadow-xs backdrop-blur transition-all duration-200 hover:scale-[1.02] hover:border-leaf hover:bg-leaf-soft hover:shadow-md focus-ring"
                    >
                      <span className="text-base">{item.icon}</span>
                      <div className="flex flex-col">
                        <span className="text-[8px] font-black uppercase tracking-wider text-muted-foreground group-hover:text-leaf">
                          {hi ? (item.tagHi || item.categoryLabelHi) : (item.tagEn || item.categoryLabelEn)}
                        </span>
                        <span className="font-display text-xs font-extrabold text-navy whitespace-nowrap">
                          {hi ? item.textHi : item.textEn}
                        </span>
                      </div>
                      <span className="ml-1 text-leaf text-xs font-black opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all">
                        →
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* ─── GRID LIST VIEW (Categorized or Manual Selection) ─── */
            <div className="mt-2 grid gap-2.5 sm:grid-cols-2 animate-rise">
              {activeCategoryQuestions.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleQuery(hi ? item.textHi : item.textEn)}
                  className="group flex items-start justify-between gap-3 rounded-2xl border border-border bg-card p-3.5 text-left transition-all duration-200 hover:border-leaf hover:bg-leaf-soft/70 hover:shadow-sm focus-ring"
                >
                  <div className="flex items-start gap-2.5">
                    <span className="text-lg leading-none mt-0.5">{item.icon}</span>
                    <div>
                      <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground group-hover:text-leaf">
                        {hi ? item.categoryLabelHi : item.categoryLabelEn}
                      </span>
                      <p className="mt-0.5 font-display text-xs font-bold text-navy leading-snug">
                        {hi ? item.textHi : item.textEn}
                      </p>
                    </div>
                  </div>
                  <span className="text-leaf text-sm font-bold opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" aria-hidden>
                    →
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Explore What I Can Help With (Expandable Full 18-Domain Catalog) */}
          <div className="mt-3.5">
            <button
              type="button"
              onClick={() => setShowKnowledgeCatalog((prev) => !prev)}
              className="flex w-full items-center justify-between rounded-xl border border-dashed border-border bg-muted/40 px-4 py-2.5 text-xs font-bold text-navy hover:bg-muted focus-ring transition-colors"
            >
              <span className="flex items-center gap-2">
                <span>📚</span>
                <span>
                  {showKnowledgeCatalog
                    ? (hi ? "विषय सूची बंद करें" : "Hide Knowledge Catalog")
                    : (hi ? "और प्रश्न व विषय देखें (Explore What I Can Help With)" : "Explore What I Can Help With (18 Domains)")}
                </span>
              </span>
              <span className="text-xs text-muted-foreground">
                {showKnowledgeCatalog ? "▲" : "▼"}
              </span>
            </button>

            {showKnowledgeCatalog ? (
              <div className="mt-3 grid gap-3 sm:grid-cols-2 animate-rise">
                {knowledgeCatalog.map((cat, cIdx) => (
                  <div key={cIdx} className="rounded-2xl border border-border bg-card p-4 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-extrabold text-navy">
                      <span>{cat.icon}</span>
                      <span>{hi ? cat.categoryTitleHi : cat.categoryTitleEn}</span>
                    </div>
                    <div className="space-y-1.5 pt-1">
                      {cat.questions.map((q, qIdx) => (
                        <button
                          key={qIdx}
                          type="button"
                          onClick={() => {
                            handleQuery(hi ? q.textHi : q.textEn);
                            setShowKnowledgeCatalog(false);
                          }}
                          className="flex w-full items-center justify-between text-left rounded-lg px-2 py-1.5 text-[11px] font-semibold text-muted-foreground hover:bg-leaf-soft hover:text-navy transition-colors"
                        >
                          <span className="line-clamp-1">“{hi ? q.textHi : q.textEn}”</span>
                          <span className="text-leaf text-xs font-bold ml-1">→</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
