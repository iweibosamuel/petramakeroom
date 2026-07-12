import { useMemo, useState } from "react";
import { v4 as uuid } from "uuid";
import type { Installment, PaymentPlanType } from "../../../lib/giving";
import { formatNaira, maxDeadlineIso, todayIso } from "../../../lib/giving/format";
import {
  errorTextClass,
  helpTextClass,
  inputClass,
  labelClass,
  primaryButtonClass,
} from "./fieldStyles";

export interface PaymentPlanFormResult {
  deadline: string;
  paymentPlan: PaymentPlanType;
  installments: Installment[];
}

interface PaymentPlanFormProps {
  totalAmountNaira: number;
  maxDeadline?: string;
  submitLabel?: string;
  onSubmit: (result: PaymentPlanFormResult) => Promise<void>;
}

interface DraftInstallment {
  key: string;
  dueDate: string;
  amount: string;
}

export const PaymentPlanForm = ({
  totalAmountNaira,
  maxDeadline,
  submitLabel = "Confirm",
  onSubmit,
}: PaymentPlanFormProps): JSX.Element => {
  const today = todayIso();
  const latestDeadline = maxDeadline ?? maxDeadlineIso();

  const [deadline, setDeadline] = useState(latestDeadline);
  const [planType, setPlanType] = useState<PaymentPlanType>("full");
  const [installments, setInstallments] = useState<DraftInstallment[]>([
    { key: uuid(), dueDate: latestDeadline, amount: String(totalAmountNaira) },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const installmentsTotal = useMemo(
    () =>
      installments.reduce((sum, i) => sum + (Number(i.amount) || 0), 0),
    [installments],
  );

  function addInstallmentRow() {
    setInstallments((rows) => [
      ...rows,
      { key: uuid(), dueDate: latestDeadline, amount: "" },
    ]);
  }

  function removeInstallmentRow(key: string) {
    setInstallments((rows) => rows.filter((r) => r.key !== key));
  }

  function updateInstallmentRow(
    key: string,
    field: "dueDate" | "amount",
    value: string,
  ) {
    setInstallments((rows) =>
      rows.map((r) => (r.key === key ? { ...r, [field]: value } : r)),
    );
  }

  function splitEvenly(count: number) {
    const base = Math.floor(totalAmountNaira / count);
    const remainder = totalAmountNaira - base * count;
    const start = new Date(today);
    const end = new Date(deadline);
    const stepMs = (end.getTime() - start.getTime()) / Math.max(count - 1, 1);

    const rows: DraftInstallment[] = Array.from({ length: count }).map(
      (_, i) => {
        const dueDate =
          count === 1
            ? deadline
            : new Date(start.getTime() + stepMs * i).toISOString().slice(0, 10);
        const amount = base + (i === count - 1 ? remainder : 0);
        return { key: uuid(), dueDate, amount: String(amount) };
      },
    );
    setInstallments(rows);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!deadline || deadline < today || deadline > latestDeadline) {
      setError("Please choose a valid deadline within the allowed window.");
      return;
    }

    let finalInstallments: Installment[];

    if (planType === "full") {
      finalInstallments = [
        { id: uuid(), amount: totalAmountNaira, dueDate: deadline, status: "pending" },
      ];
    } else {
      if (installments.length === 0) {
        setError("Add at least one installment.");
        return;
      }
      for (const row of installments) {
        if (!row.dueDate || row.dueDate < today || row.dueDate > deadline) {
          setError("Every installment date must fall between today and your deadline.");
          return;
        }
        if (!row.amount || Number(row.amount) <= 0) {
          setError("Every installment needs an amount greater than ₦0.");
          return;
        }
      }
      if (installmentsTotal !== totalAmountNaira) {
        setError(
          `Installments must add up to ${formatNaira(totalAmountNaira)}. They currently total ${formatNaira(installmentsTotal)}.`,
        );
        return;
      }
      finalInstallments = installments
        .slice()
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
        .map((row) => ({
          id: uuid(),
          amount: Number(row.amount),
          dueDate: row.dueDate,
          status: "pending",
        }));
    }

    setSubmitting(true);
    try {
      await onSubmit({ deadline, paymentPlan: planType, installments: finalInstallments });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div>
        <label className={labelClass} htmlFor="deadline">
          When will you finish paying?
        </label>
        <input
          id="deadline"
          type="date"
          className={inputClass}
          min={today}
          max={latestDeadline}
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          required
        />
        <p className={helpTextClass}>Up to 2 months from today.</p>
      </div>

      <div>
        <span className={labelClass}>How will you pay?</span>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => setPlanType("full")}
            className={`flex-1 rounded-lg border-2 px-4 py-3 text-left text-sm font-semibold transition-colors ${
              planType === "full"
                ? "border-[#fa400f] bg-[#fa400f]/5 text-[#fa400f]"
                : "border-slate-200 text-slate-600 hover:border-slate-300"
            }`}
          >
            Pay in full now
          </button>
          <button
            type="button"
            onClick={() => setPlanType("installments")}
            className={`flex-1 rounded-lg border-2 px-4 py-3 text-left text-sm font-semibold transition-colors ${
              planType === "installments"
                ? "border-[#fa400f] bg-[#fa400f]/5 text-[#fa400f]"
                : "border-slate-200 text-slate-600 hover:border-slate-300"
            }`}
          >
            Split into installments
          </button>
        </div>
      </div>

      {planType === "installments" && (
        <div className="rounded-xl border border-slate-200 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-semibold text-slate-700">
              Installments
            </span>
            <div className="flex gap-2">
              {[2, 3, 4].map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => splitEvenly(count)}
                  className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-600 hover:border-[#fa400f] hover:text-[#fa400f]"
                >
                  Split {count}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {installments.map((row, idx) => (
              <div key={row.key} className="flex items-center gap-2">
                <input
                  type="date"
                  className={`${inputClass} mt-0`}
                  min={today}
                  max={deadline}
                  value={row.dueDate}
                  onChange={(e) =>
                    updateInstallmentRow(row.key, "dueDate", e.target.value)
                  }
                  required
                />
                <input
                  type="number"
                  className={`${inputClass} mt-0`}
                  placeholder="Amount (₦)"
                  min={1}
                  value={row.amount}
                  onChange={(e) =>
                    updateInstallmentRow(row.key, "amount", e.target.value)
                  }
                  required
                />
                {installments.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeInstallmentRow(row.key)}
                    aria-label={`Remove installment ${idx + 1}`}
                    className="shrink-0 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-red-600"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addInstallmentRow}
            className="mt-3 text-sm font-semibold text-[#fa400f] hover:underline"
          >
            + Add another installment
          </button>

          <p
            className={`mt-3 text-sm font-semibold ${
              installmentsTotal === totalAmountNaira
                ? "text-emerald-600"
                : "text-slate-500"
            }`}
          >
            Total: {formatNaira(installmentsTotal)} of {formatNaira(totalAmountNaira)}
          </p>
        </div>
      )}

      {error && <p className={errorTextClass}>{error}</p>}

      <button type="submit" className={primaryButtonClass} disabled={submitting}>
        {submitting ? "Saving…" : submitLabel}
      </button>
    </form>
  );
};
