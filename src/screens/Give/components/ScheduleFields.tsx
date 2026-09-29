import { v4 as uuid } from "uuid";
import { X } from "lucide-react";
import type { Currency, Installment, PaymentPlanType } from "../../../lib/giving";
import { CURRENCY_SYMBOLS } from "../../../lib/giving/currency";
import { formatDate, formatMoney, maxDeadlineIso, todayIso } from "../../../lib/giving/format";
import { helpTextClass, inputClass, labelClass } from "./fieldStyles";
import { optionCardClass } from "./FlowParts";

// How and when someone will pay, chosen on the same page as the amount:
// all at once (now, or on one date) or in installments (a date and amount
// each). No date is pre-filled; every date is between today and
// LAST_DUE_DATE.

export interface ScheduleResult {
  deadline: string;
  paymentPlan: PaymentPlanType;
  installments: Installment[];
}

interface DraftInstallment {
  key: string;
  dueDate: string;
  amount: string;
}

export interface ScheduleDraft {
  dueDate: string;
  planType: PaymentPlanType;
  installments: DraftInstallment[];
}

const emptyRow = (): DraftInstallment => ({ key: uuid(), dueDate: "", amount: "" });

export const emptySchedule = (): ScheduleDraft => ({
  dueDate: "",
  planType: "full",
  installments: [emptyRow(), emptyRow()],
});

// Turns the draft into a schedule, or explains what's missing. All at once
// uses the one due date; installments each have their own date, and the
// last one is the pledge's deadline.
export function buildSchedule(
  totalAmount: number,
  currency: Currency,
  draft: ScheduleDraft,
): { result: ScheduleResult } | { error: string } {
  const today = todayIso();
  const latest = maxDeadlineIso();
  const inWindow = (date: string) => Boolean(date) && date >= today && date <= latest;

  if (draft.planType === "full") {
    const { dueDate } = draft;
    if (!dueDate) return { error: "Please choose when you'll pay, or tap “Pay now”." };
    if (!inWindow(dueDate)) {
      return { error: `Please choose a date between today and ${formatDate(latest)}.` };
    }
    return {
      result: {
        deadline: dueDate,
        paymentPlan: "full",
        installments: [{ id: uuid(), amount: totalAmount, dueDate, status: "pending" }],
      },
    };
  }

  if (draft.installments.length < 2) return { error: "Add at least two installments." };
  for (const [index, row] of draft.installments.entries()) {
    if (!row.dueDate) return { error: `Please choose a date for installment ${index + 1}.` };
    if (!inWindow(row.dueDate)) {
      return { error: `Installment dates must be between today and ${formatDate(latest)}.` };
    }
    if (!row.amount || Number(row.amount) <= 0) {
      return { error: `Every installment needs an amount greater than ${formatMoney(0, currency)}.` };
    }
  }
  const total = draft.installments.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
  if (total !== totalAmount) {
    return {
      error: `Installments must add up to ${formatMoney(totalAmount, currency)}. They currently total ${formatMoney(total, currency)}.`,
    };
  }
  const sorted = draft.installments.slice().sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  return {
    result: {
      deadline: sorted[sorted.length - 1].dueDate,
      paymentPlan: "installments",
      installments: sorted.map((row) => ({
        id: uuid(),
        amount: Number(row.amount),
        dueDate: row.dueDate,
        status: "pending",
      })),
    },
  };
}

interface ScheduleFieldsProps {
  // In `currency`.
  totalAmount: number;
  currency: Currency;
  value: ScheduleDraft;
  onChange: (next: ScheduleDraft) => void;
}

export const ScheduleFields = ({
  totalAmount,
  currency,
  value,
  onChange,
}: ScheduleFieldsProps): JSX.Element => {
  const today = todayIso();
  const latest = maxDeadlineIso();
  const { dueDate, planType, installments } = value;
  const installmentsTotal = installments.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);

  const set = (patch: Partial<ScheduleDraft>) => onChange({ ...value, ...patch });
  const setRows = (rows: DraftInstallment[]) => set({ installments: rows });

  function updateRow(key: string, field: "dueDate" | "amount", fieldValue: string) {
    setRows(installments.map((r) => (r.key === key ? { ...r, [field]: fieldValue } : r)));
  }

  // Even amounts on evenly spaced dates, from today up to the latest date
  // already picked (or the last allowed date). Any rounding remainder goes
  // on the last payment.
  function splitEvenly(count: number) {
    if (totalAmount <= 0) return;
    const picked = installments.map((r) => r.dueDate).filter(Boolean).sort();
    const end = picked.length && picked[picked.length - 1] > today ? picked[picked.length - 1] : latest;
    const base = Math.floor(totalAmount / count);
    const remainder = totalAmount - base * count;
    const start = new Date(today).getTime();
    const stepMs = (new Date(end).getTime() - start) / Math.max(count - 1, 1);
    setRows(
      Array.from({ length: count }).map((_, i) => ({
        key: uuid(),
        dueDate: new Date(start + stepMs * i).toISOString().slice(0, 10),
        amount: String(base + (i === count - 1 ? remainder : 0)),
      })),
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <fieldset>
        <legend className={labelClass}>How will you pay?</legend>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => set({ planType: "full" })}
            aria-pressed={planType === "full"}
            className={optionCardClass(planType === "full")}
          >
            <span className="block font-bold text-black">All at once</span>
            <span className="block text-sm text-slate-500">One payment, now or on a date you choose</span>
          </button>
          <button
            type="button"
            onClick={() => set({ planType: "installments" })}
            aria-pressed={planType === "installments"}
            className={optionCardClass(planType === "installments")}
          >
            <span className="block font-bold text-black">In installments</span>
            <span className="block text-sm text-slate-500">Spread it across dates you choose</span>
          </button>
        </div>
      </fieldset>

      {planType === "full" ? (
        <div>
          <div className="flex items-center justify-between gap-3">
            <label className={labelClass} htmlFor="dueDate">
              When will you pay?
            </label>
            <button
              type="button"
              onClick={() => set({ dueDate: today })}
              aria-pressed={dueDate === today}
              className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                dueDate === today ? "bg-black text-white" : "bg-black/[0.06] text-black hover:bg-black/10"
              }`}
            >
              Pay now
            </button>
          </div>
          <input
            id="dueDate"
            type="date"
            className={inputClass}
            min={today}
            max={latest}
            value={dueDate}
            onChange={(e) => set({ dueDate: e.target.value })}
            required
          />
          <p className={helpTextClass}>
            {dueDate === today
              ? "You'll see how to pay on the next pages."
              : `Tap “Pay now”, or pick any date up to ${formatDate(latest)}.`}
          </p>
        </div>
      ) : (
        <div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <span className={labelClass}>Installments</span>
            <div className="flex gap-2">
              {[2, 3, 4].map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => splitEvenly(count)}
                  disabled={totalAmount <= 0}
                  className="rounded-full bg-black/[0.06] px-3 py-1.5 text-xs font-bold text-black hover:bg-black/10 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Split {count}
                </button>
              ))}
            </div>
          </div>
          <p className={`${helpTextClass} !mt-0 mb-3`}>
            Choose a date and amount for each payment, up to {formatDate(latest)}.
          </p>

          <div className="flex flex-col gap-2">
            {installments.map((row, idx) => (
              <div key={row.key} className="flex items-center gap-2">
                <input
                  type="date"
                  aria-label={`Installment ${idx + 1} date`}
                  className={`${inputClass} !mt-0 min-w-0 !px-3`}
                  min={today}
                  max={latest}
                  value={row.dueDate}
                  onChange={(e) => updateRow(row.key, "dueDate", e.target.value)}
                  required
                />
                <input
                  type="number"
                  aria-label={`Installment ${idx + 1} amount`}
                  className={`${inputClass} !mt-0 min-w-0 !px-3`}
                  placeholder={`Amount (${CURRENCY_SYMBOLS[currency]})`}
                  min={1}
                  value={row.amount}
                  onChange={(e) => updateRow(row.key, "amount", e.target.value)}
                  required
                />
                {installments.length > 2 && (
                  <button
                    type="button"
                    onClick={() => setRows(installments.filter((r) => r.key !== row.key))}
                    aria-label={`Remove installment ${idx + 1}`}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-black/5 hover:text-red-600"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="mt-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setRows([...installments, emptyRow()])}
              className="text-sm font-bold text-black hover:underline"
            >
              + Add installment
            </button>
            <p
              className={`text-sm font-semibold ${
                totalAmount > 0 && installmentsTotal === totalAmount
                  ? "text-emerald-600"
                  : "text-slate-500"
              }`}
            >
              {formatMoney(installmentsTotal, currency)} of {formatMoney(totalAmount, currency)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
