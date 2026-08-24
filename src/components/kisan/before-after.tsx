import { SectionLabel } from "@/components/kisan/primitives";
import { cn } from "@/lib/utils";

const traditional = [
  { label: "Fixed Slot", detail: "Allotted blindly, same time for everyone" },
  { label: "Uncertain Queue", detail: "No visibility of how many are ahead" },
  { label: "Waiting", detail: "2–3 hours at the gate, sometimes overnight" },
  { label: "Reactive Administration", detail: "Officers react after congestion happens" },
];

const kisanSetu = [
  { label: "Predict", detail: "Arrival and congestion forecast per centre, per hour" },
  { label: "Optimize", detail: "Load balanced across centres before farmers leave home" },
  { label: "Smart Arrival", detail: "Farmer told exactly when to leave and where to go" },
  { label: "Virtual Queue", detail: "Live token, farmers ahead and ETA on the phone" },
  { label: "Proactive Intervention", detail: "AI flags overload early; officer approves in one tap" },
];

export function BeforeAfter() {
  return (
    <section className="mt-16 sm:mt-24">
      <div className="max-w-2xl">
        <SectionLabel>The shift</SectionLabel>
        <h2 className="mt-2 font-display text-3xl font-extrabold text-navy sm:text-4xl">
          Before vs Kisan&nbsp;Setu
        </h2>
        <p className="mt-3 text-balance-tight text-muted-foreground">
          Don't just digitize the queue. Predict it, optimize it and orchestrate it.
        </p>
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        <Column
          kind="before"
          title="Traditional procurement"
          subtitle="Sequential, blind, reactive"
          steps={traditional}
        />
        <Column
          kind="after"
          title="With Kisan Setu"
          subtitle="Predictive, balanced, orchestrated"
          steps={kisanSetu}
        />
      </div>
    </section>
  );
}

function Column({
  kind,
  title,
  subtitle,
  steps,
}: {
  kind: "before" | "after";
  title: string;
  subtitle: string;
  steps: Array<{ label: string; detail: string }>;
}) {
  const after = kind === "after";
  return (
    <div
      className={cn(
        "relative overflow-hidden p-5 sm:p-7",
        after ? "surface-lift border-leaf/30" : "surface",
      )}
    >
      {after ? <span className="absolute inset-x-0 top-0 h-1 bg-gradient-leaf" /> : null}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className={cn("font-display text-xl font-extrabold", after ? "text-navy" : "text-muted-foreground")}>
            {title}
          </h3>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{subtitle}</p>
        </div>
        <span
          className={cn(
            "rounded-full px-3 py-1 text-[11px] font-bold",
            after ? "bg-leaf-soft text-leaf" : "bg-muted text-muted-foreground",
          )}
        >
          {after ? "Avg wait 47 min" : "Avg wait 154 min"}
        </span>
      </div>

      <ol className="mt-6 space-y-4">
        {steps.map((step, i) => (
          <li key={step.label} className="relative flex gap-4 pb-1">
            {i < steps.length - 1 ? (
              <span
                className={cn(
                  "absolute left-4 top-9 h-[calc(100%-1rem)] w-px",
                  after ? "bg-leaf/35" : "bg-border",
                )}
                aria-hidden
              />
            ) : null}
            <span
              className={cn(
                "z-10 flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-extrabold",
                after ? "bg-gradient-leaf text-primary-foreground" : "bg-muted text-muted-foreground",
              )}
            >
              {i + 1}
            </span>
            <div>
              <p className={cn("font-display text-base font-bold", after ? "text-navy" : "text-foreground/70")}>
                {step.label}
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground">{step.detail}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
