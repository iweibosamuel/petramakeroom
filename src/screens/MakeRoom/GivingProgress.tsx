import { useEffect, useState } from "react";
import { dataStore, DEFAULT_CAMPAIGN_ID } from "../../lib/giving";
import { getNgnRatesOrLast } from "../../lib/giving/currency";
import { formatMoney } from "../../lib/giving/format";
import { CURRENT_PHASE, PHASES } from "../../lib/giving/phases";

interface Progress {
  percent: number;
  givers: number;
}

// "$1 MILLION" rather than "$1,000,000" for round millions.
function formatTarget(usd: number): string {
  return usd % 1_000_000 === 0 ? `$${usd / 1_000_000} MILLION` : formatMoney(usd, "USD");
}

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
        {/* Phase and title on the left; the target, big and orange, on the
            right from 1024px up (below the title on phones and tablets). */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between lg:gap-6">
          <div className="min-w-0">
            <p className="[font-family:'Inter',Helvetica] text-xs font-bold uppercase tracking-[0.08em] text-slate-500 sm:text-sm">
              Phase {CURRENT_PHASE.number} of {PHASES.length}
            </p>
            <h2
              id="giving-progress-title"
              className="mt-1 font-drum text-[clamp(1rem,3.8vw,1.5rem)] font-bold leading-[1.15] text-black"
            >
              {CURRENT_PHASE.title}
            </h2>
          </div>
          <div className="shrink-0 lg:text-right">
            <p className="[font-family:'Inter',Helvetica] text-xs font-bold uppercase tracking-[0.08em] text-slate-500 sm:text-sm">
              Target
            </p>
            <p className="whitespace-nowrap font-drum text-[min(35px,calc((100vw-6rem)/9.5))] font-bold leading-none text-[#FA400F]">
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

        <p className="mt-3 [font-family:'Inter',Helvetica] text-sm text-slate-600 sm:mt-5 sm:text-base">
          <span className="font-drum text-xl font-bold text-black sm:text-2xl">
            {progress ? progress.givers.toLocaleString("en-NG") : "–"}
          </span>{" "}
          {progress?.givers === 1 ? "person has" : "people have"} given
        </p>

        {upcoming.length > 0 && (
          <ul className="mt-5 grid grid-cols-1 gap-2 border-t border-black/10 pt-5 sm:mt-6 sm:grid-cols-2 sm:gap-3 sm:pt-6">
            {upcoming.map((phase) => (
              <li
                key={phase.number}
                className="flex items-center justify-between gap-3 rounded-2xl bg-black/[0.04] px-4 py-3 [font-family:'Inter',Helvetica]"
              >
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-500">Phase {phase.number}</p>
                  <p className="text-xs text-slate-500">
                    Target: {formatTarget(phase.goalUsd)}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-black/[0.06] px-3 py-1 text-xs font-bold text-slate-600">
                  Coming soon
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
};
