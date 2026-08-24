import { useCallback, useEffect, useRef, useState } from "react";

import { Pill } from "@/components/kisan/primitives";
import { useKisan } from "@/lib/kisan/store";
import {
  fallbackAnswer,
  getRecognition,
  matchIntent,
  speak,
  voiceIntents,
  type VoiceIntent,
} from "@/lib/kisan/voice";
import { cn } from "@/lib/utils";

type VoiceState = "idle" | "listening" | "thinking" | "speaking";

export function VoiceAssistant() {
  const { language } = useKisan();
  const hi = language === "hi";
  const [state, setState] = useState<VoiceState>("idle");
  const [transcript, setTranscript] = useState("");
  const [answer, setAnswer] = useState<{ text: string; facts?: VoiceIntent["facts"] } | null>(null);
  const [supported, setSupported] = useState(true);
  const recRef = useRef<ReturnType<typeof getRecognition>>(null);

  useEffect(() => {
    setSupported(Boolean(getRecognition(language)));
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, [language]);

  const respond = useCallback(
    (spoken: string) => {
      setTranscript(spoken);
      setState("thinking");
      window.setTimeout(() => {
        const intent = matchIntent(spoken);
        const text = intent ? intent.answer[language] : fallbackAnswer[language];
        setAnswer({ text, facts: intent?.facts });
        setState("speaking");
        speak(text, language);
        window.setTimeout(() => setState("idle"), Math.min(9000, 2600 + text.length * 45));
      }, 900);
    },
    [language],
  );

  const startListening = useCallback(() => {
    const rec = getRecognition(language);
    if (!rec) {
      respond(hi ? "मेरी बारी कब आएगी?" : "When is my turn?");
      return;
    }
    recRef.current = rec;
    setTranscript("");
    setAnswer(null);
    setState("listening");
    rec.onresult = (e) => {
      const said = e.results[0]?.[0]?.transcript ?? "";
      respond(said);
    };
    rec.onerror = () => setState("idle");
    rec.onend = () => setState((s) => (s === "listening" ? "idle" : s));
    rec.start();
  }, [hi, language, respond]);

  const stop = useCallback(() => {
    recRef.current?.stop();
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    setState("idle");
  }, []);

  const stateLabel: Record<VoiceState, string> = {
    idle: hi ? "बोलने के लिए दबाएँ" : "Tap to speak",
    listening: hi ? "सुन रहा हूँ…" : "Listening…",
    thinking: hi ? "सोच रहा हूँ…" : "Thinking…",
    speaking: hi ? "जवाब दे रहा हूँ" : "Speaking",
  };

  return (
    <section className="surface-lift overflow-hidden">
      <div className="bg-hero px-5 py-5 text-primary-foreground sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-foreground/70">
              {hi ? "आवाज़ सहायक" : "Voice assistant"}
            </p>
            <h2 className="mt-1 font-display text-xl font-extrabold">
              {hi ? "पूछिए, मैं बताऊँगा" : "Just ask — I'll answer"}
            </h2>
          </div>
          <Pill tone="saffron">{hi ? "हिंदी" : "English"}</Pill>
        </div>
      </div>

      <div className="flex flex-col items-center gap-4 px-5 py-7 sm:px-6">
        <button
          type="button"
          onClick={state === "idle" ? startListening : stop}
          aria-label={stateLabel[state]}
          className={cn(
            "relative flex size-28 items-center justify-center rounded-full transition-transform duration-300 focus-ring active:scale-95",
            state === "idle" ? "bg-gradient-leaf" : "bg-gradient-saffron",
          )}
          style={{ boxShadow: "var(--shadow-glow-leaf)" }}
        >
          {state !== "idle" ? (
            <>
              <span className="absolute inline-flex size-28 rounded-full bg-saffron/40 animate-pulse-ring" />
              <span
                className="absolute inline-flex size-28 rounded-full bg-saffron/30 animate-pulse-ring"
                style={{ animationDelay: "0.6s" }}
              />
            </>
          ) : null}
          <svg viewBox="0 0 24 24" className="relative size-11 text-primary-foreground" fill="none" stroke="currentColor" strokeWidth="1.8">
            <rect x="9" y="3" width="6" height="11" rx="3" />
            <path d="M5 11a7 7 0 0 0 14 0M12 18v3M8.5 21h7" strokeLinecap="round" />
          </svg>
        </button>

        <div className="text-center">
          <p className="font-display text-base font-bold text-navy">{stateLabel[state]}</p>
          {state === "listening" ? (
            <div className="mt-2 flex items-end justify-center gap-1" aria-hidden>
              {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                <span
                  key={i}
                  className="w-1.5 rounded-full bg-leaf"
                  style={{
                    height: `${10 + ((i * 7) % 22)}px`,
                    animation: `ks-blip 900ms ease-in-out ${i * 90}ms infinite`,
                  }}
                />
              ))}
            </div>
          ) : null}
          {!supported ? (
            <p className="mt-2 text-xs text-muted-foreground">
              {hi
                ? "इस ब्राउज़र में माइक्रोफ़ोन उपलब्ध नहीं — डेमो उत्तर दिखाए जाएंगे"
                : "Microphone not available in this browser — demo answers will be shown"}
            </p>
          ) : null}
        </div>

        {transcript ? (
          <div className="w-full animate-rise rounded-xl bg-muted px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {hi ? "आपने कहा" : "You said"}
            </p>
            <p className="mt-1 text-sm font-semibold text-navy">“{transcript}”</p>
          </div>
        ) : null}

        {answer ? (
          <div className="w-full animate-rise rounded-xl border border-leaf/30 bg-leaf-soft px-4 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-leaf">
              {hi ? "किसान सेतु" : "Kisan Setu"}
            </p>
            <p className="mt-1.5 text-base leading-relaxed font-semibold text-navy">{answer.text}</p>
            {answer.facts ? (
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {answer.facts.map((f) => (
                  <div key={f.label} className="rounded-lg bg-card px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{f.label}</p>
                    <p className="text-sm font-bold text-navy">{f.value}</p>
                  </div>
                ))}
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => speak(answer.text, language)}
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-navy px-3 py-2 text-xs font-semibold text-primary-foreground focus-ring"
            >
              🔊 {hi ? "दोबारा सुनें" : "Play again"}
            </button>
          </div>
        ) : null}

        <div className="w-full">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {hi ? "ये सवाल पूछ सकते हैं" : "Try asking"}
          </p>
          <div className="grid gap-2">
            {voiceIntents.map((intent) => (
              <button
                key={intent.id}
                type="button"
                onClick={() => respond(intent.question[language])}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left text-sm font-semibold text-navy transition-colors hover:border-leaf hover:bg-leaf-soft focus-ring"
              >
                <span>{intent.question[language]}</span>
                <span className="text-leaf" aria-hidden>
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
