import { useMemo, useState } from "react";
import { v4 as uuid } from "uuid";
import type { Installment, PaymentPlanType } from "../../../lib/giving";
import {
  formatDate,
  formatNaira,
  maxDeadlineIso,
  todayIso,
} from "../../../lib/giving/format";
import {
  errorTextClass,
  helpTextClass,
  inputClass,
  labelClass,
  primaryButtonClass,
} from "./fieldStyles";
import { CalendarDays, Wallet, X, Zap } from "lucide-react";
import {
  BigAmount,
  DetailRow,
  Divider,
  StickyAction,
  optionCardClass,
  pillButtonClass,
} from "./FlowParts";

export interface PaymentPlanFormResult {
  deadline: string;
  paymentPlan: PaymentPlanType;
  installments: Installment[];
}

interface PaymentPlanFormProps {
  totalAmountNaira: number;
  amountLabel?: string;
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
  amountLabel = "You're giving",
  maxDeadline,
  submitLabel = "Confirm",
  onSubmit,
}: PaymentPlanFormProps): JSX.Element => {
  const today = todayIso();
  // A group's own deadline can be earlier, but never later than the cut-off.
  const latestDeadline =
    maxDeadline && maxDeadline < maxDeadlineIso() ? maxDeadline : maxDeadlineIso();
  // Once the cut-off has passed, giving now is the only option.
  const canSchedule = latestDeadline > today;

  const [timing, setTiming] = useState<"now" | "later">("now");
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

    if (timing === "now") {
      await submit({
        deadline: today,
        paymentPlan: "full",
        installments: [
          { id: uuid(), amount: totalAmountNaira, dueDate: today, status: "pending" },
        ],
      });
      return;
    }

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

    await submit({ deadline, paymentPlan: planType, installments: finalInstallments });
  }

  async function submit(result: PaymentPlanFormResult) {
    setSubmitting(true);
    try {
      await onSubmit(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-1 flex-col">
      <p className="text-base text-slate-500">{amountLabel}</p>
      <div className="mt-2">
        <BigAmount text={formatNaira(totalAmountNaira)} />
      </div>

      <div className="mt-6">
        <Divider />
        <DetailRow
          icon={timing === "now" ? <Zap /> : <CalendarDays />}
          label="When"
          value={timing === "now" ? "Today" : formatDate(deadline)}
          hint={
            timing === "now"
              ? "Pay straight after this step"
              : planType === "installments"
                ? `In ${installments.length} part${installments.length === 1 ? "" : "s"}`
                : "All at once"
          }
          action={
            canSchedule ? (
              <button
                type="button"
                onClick={() => setTiming(timing === "now" ? "later" : "now")}
                className={pillButtonClass}
              >
                {timing === "now" ? "Schedule" : "Give now"}
              </button>
            ) : undefined
          }
        />
      </div>

      {timing === "later" && (
        <div className="flex flex-col gap-6 pb-4 pt-2">
          <div>
            <label className={labelClass} htmlFor="deadline">
              Due date
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
            <p className={helpTextClass}>
              Any date up to {formatDate(latestDeadline)}.
            </p>
          </div>

          <div>
            <span className={labelClass}>How will you pay?</span>
            <div className="mt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setPlanType("full")}
                aria-pressed={planType === "full"}
                className={optionCardClass(planType === "full")}
              >
                <span className="block font-bold text-black">All at once</span>
                <span className="block text-sm text-slate-500">
                  One payment on your due date
                </span>
              </button>
              <button
                type="button"
                onClick={() => setPlanType("installments")}
                aria-pressed={planType === "installments"}
                className={optionCardClass(planType === "installments")}
              >
                <span className="block font-bold text-black">In installments</span>
                <span className="block text-sm text-slate-500">
                  Spread it across dates you choose
                </span>
              </button>
            </div>
          </div>

          {planType === "installments" && (
            <div>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <span className={labelClass}>Installments</span>
                <div className="flex gap-2">
                  {[2, 3, 4].map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => splitEvenly(count)}
                      className="rounded-full bg-black/[0.06] px-3 py-1.5 text-xs font-bold text-black hover:bg-black/10"
                    >
                      Split {count}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                {installments.map((row, idx) => (
                  <div key={row.key} className="flex items-center gap-2">
                    <input
                      type="date"
                      aria-label={`Installment ${idx + 1} date`}
                      className={`${inputClass} !mt-0 min-w-0`}
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
                      aria-label={`Installment ${idx + 1} amount`}
                      className={`${inputClass} !mt-0 min-w-0`}
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
                  onClick={addInstallmentRow}
                  className="text-sm font-bold text-black hover:underline"
                >
                  + Add installment
                </button>
                <p
                  className={`text-sm font-semibold ${
                    installmentsTotal === totalAmountNaira
                      ? "text-emerald-600"
                      : "text-slate-500"
                  }`}
                >
                  {formatNaira(installmentsTotal)} of {formatNaira(totalAmountNaira)}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      <Divider />
      <DetailRow
        icon={<Wallet />}
        label="Paying with"
        value="Card, bank transfer or Zelle"
        hint="Paystack, Flutterwave, GTBank, Bank of America"
      />
      <Divider />

      {error && <p className={errorTextClass}>{error}</p>}

      <StickyAction>
        <button type="submit" className={primaryButtonClass} disabled={submitting}>
          {submitting
            ? "Saving…"
            : timing === "now"
              ? "Continue to payment"
              : submitLabel}
        </button>
      </StickyAction>
    </form>
  );
};
