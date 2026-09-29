import { useEffect, useState } from "react";
import { CalendarDays, HardHat, LandPlot, Lock, Target, type LucideIcon } from "lucide-react";
import { dataStore, DEFAULT_CAMPAIGN_ID } from "../../lib/giving";
import { getNgnRatesOrLast } from "../../lib/giving/currency";
import { formatDate, formatMoney } from "../../lib/giving/format";
import { CURRENT_PHASE, PHASES, type GivingPhase } from "../../lib/giving/phases";

interface Progress {
  percent: number;
  givers: number;
}

// "$1 MILLION" rather than "$1,000,000" for round millions.
function formatTarget(usd: number): string {
  return usd % 1_000_000 === 0 ? `$${usd / 1_000_000} MILLION` : formatMoney(usd, "USD");
}

// "1 Oct – 31 Dec 2026" (or "1 Oct 2026 – 31 Mar 2027" across years).
function phaseTimeline(phase: GivingPhase): string {
  const sameYear = phase.startDate.slice(0, 4) === phase.endDate.slice(0, 4);
  const start = formatDate(phase.startDate);
  return `${sameYear ? start.replace(/\s\d{4}$/, "") : start} – ${formatDate(phase.endDate)}`;
}

// An icon for each goal; anything else gets a target icon.
const GOAL_ICONS: Record<string, LucideIcon> = {
  "Land (Leases, Acquisitions & Permits)": LandPlot,
  "Preparatory civil works": HardHat,
};

// Small amounts of a $1m goal still show movement: 0.5%, not 0%.
function formatPercent(percent: number): string {
  if (percent <= 0) return "0%";
  if (percent < 0.1) return "<0.1%";
  if (percent < 10) return `${Number(percent.toFixed(1))}%`;
  return `${Math.floor(percent)}%`;
}

// Progress towards the current phase's goal (in US dollars), counting only
// payments givers have confirmed with "I've paid". Confirmed payments are
// totalled in naira (each at its pledge's locked rate) and converted to
// dollars at today's rate. Shows the phase target, a percentage and how many
// people have given — never names or individual amounts.
export const GivingProgress = (): JSX.Element | null => {
  const [progress, setProgress] = useState<Progress | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    function load() {
      Promise.all([dataStore.getCampaignProgress(DEFAULT_CAMPAIGN_ID), getNgnRatesOrLast()])
        .then(([result, rates]) => {
          if (cancelled) return;
          const goalNaira = CURRENT_PHASE.goalUsd * rates.USD;
          setProgress({
            percent: (result.raisedNaira / goalNaira) * 100,
            givers: result.contributorCount,
          });
        })
        .catch((err) => {
          console.warn("[GivingProgress] couldn't load progress", err);
          if (!cancelled) setFailed(true);
        });
    }
    load();
    // Refresh when someone comes back to the tab, e.g. after confirming a
    // payment in another tab.
    const onVisible = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  if (failed) return null;

  // Later phases, shown as "Coming soon" until they open.
  const upcoming = PHASES.filter((phase) => phase.number > CURRENT_PHASE.number);
  const percent = progress?.percent ?? 0;
  const fill = Math.min(100, percent);
  const label = progress ? `RAISED ${formatPercent(percent)}` : "RAISED …";

  return (
    <section className="mt-8 w-full sm:mt-10" aria-labelledby="giving-progress-title">
      <div className="mx-auto w-full max-w-[1100px] rounded-2xl bg-white p-5 text-left shadow-[0_8px_30px_rgba(0,0,0,0.08)] sm:rounded-3xl sm:p-10">
        {/* The phase on the left; the target, big and orange, on the right
            from 1024px up (below the phase on phones and tablets). The phase
            title itself sits under LAGOS in the hero. */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between lg:gap-6">
          <h2
            id="giving-progress-title"
            className="min-w-0 font-drum text-[clamp(1.125rem,4.5vw,1.75rem)] font-bold uppercase leading-none text-black"
          >
            Phase {CURRENT_PHASE.number}
          </h2>
          <div className="shrink-0 lg:text-right">
            <p className="[font-family:'Inter',Helvetica] text-xs font-bold uppercase tracking-[0.08em] text-slate-500 sm:text-sm">
              Target
            </p>
            <p className="mt-2 whitespace-nowrap font-drum text-[min(35px,calc((100vw-6rem)/9.5))] font-bold leading-none text-[#FA400F] sm:mt-0">
              {formatTarget(CURRENT_PHASE.goalUsd)}
            </p>
          </div>
        </div>

        <div
          role="progressbar"
          aria-label={`Phase ${CURRENT_PHASE.number} giving progress`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(fill)}
          aria-valuetext={progress ? `${formatPercent(percent)} raised` : "Loading"}
          // Sizes step up from phone to desktop: bar height, and how far the
          // pill keeps from the left edge while the percentage is small.
          className="relative mt-5 h-7 w-full rounded-full bg-black/[0.08] [--bar-h:1.75rem] [--pill-min:6.25rem] sm:mt-6 sm:h-12 sm:[--bar-h:3rem] sm:[--pill-min:9.5rem]"
        >
          <div
            className="h-full rounded-full bg-[#333333] transition-[width] duration-1000 ease-out"
            // A sliver of a percent still shows as a rounded start, not a line.
            style={{ width: `${fill}%`, minWidth: fill > 0 ? "var(--bar-h)" : 0 }}
          />
          {/* Pill sits at the end of the fill, but never slides off the
              left edge while the percentage is small. */}
          <span
            className="absolute inset-y-0 flex -translate-x-full items-center whitespace-nowrap rounded-full border-[3px] border-[#333333] bg-white px-2.5 [font-family:'Inter',Helvetica] text-[11px] font-extrabold leading-none text-black transition-[left] duration-1000 ease-out sm:px-4 sm:text-sm"
            style={{ left: `max(${fill}%, var(--pill-min))` }}
          >
            {label}
          </span>
        </div>

        {/* Givers on the left, the phase's dates on the right. */}
        <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 [font-family:'Inter',Helvetica] sm:mt-5">
          <p className="text-sm text-slate-600 sm:text-base">
            <span className="font-drum text-xl font-bold text-black sm:text-2xl">
              {progress ? progress.givers.toLocaleString("en-NG") : "–"}
            </span>{" "}
            {progress?.givers === 1 ? "person has" : "people have"} given
          </p>
          <p className="text-sm font-semibold text-slate-600 sm:text-base">
            {phaseTimeline(CURRENT_PHASE)}
          </p>
        </div>

        {CURRENT_PHASE.goals && CURRENT_PHASE.goals.length > 0 && (
          <div className="mt-6 border-t border-black/10 pt-6 [font-family:'Inter',Helvetica]">
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
              Phase {CURRENT_PHASE.number} goals
            </p>
            <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
              {CURRENT_PHASE.goals.map((goal) => {
                const Icon = GOAL_ICONS[goal] ?? Target;
                return (
                  <li
                    key={goal}
                    className="flex items-center gap-3 rounded-2xl border border-black/10 bg-white p-3 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-4"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FA400F]/10 text-[#FA400F]">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="text-sm font-bold leading-snug text-black sm:text-base">{goal}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {upcoming.length > 0 && (
          <div className="mt-6 border-t border-black/10 pt-6 [font-family:'Inter',Helvetica]">
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">Up next</p>
            <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {upcoming.map((phase) => (
                <li
                  key={phase.number}
                  className="rounded-2xl border border-dashed border-black/15 bg-[#fffaf4] p-4 sm:p-5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-drum text-lg font-bold uppercase leading-none text-black/75 sm:text-xl">
                      Phase {phase.number}
                    </h3>
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#FA400F]/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.06em] text-[#FA400F]">
                      <Lock className="h-3 w-3" aria-hidden="true" />
                      Coming soon
                    </span>
                  </div>
                  <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-slate-600">
                    <CalendarDays className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                    {phaseTimeline(phase)}
                  </p>
                  <div className="mt-4 flex items-baseline justify-between gap-3 border-t border-black/10 pt-3">
                    <span className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                      Target
                    </span>
                    <span className="font-drum text-base font-bold text-black/75 sm:text-lg">
                      {formatTarget(phase.goalUsd)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
};
