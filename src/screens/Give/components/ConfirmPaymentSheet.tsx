import { useEffect, useState } from "react";
import { X } from "lucide-react";
import {
  dataStore,
  type Currency,
  type Installment,
  type PaymentMethod,
} from "../../../lib/giving";
import { PAYMENT_METHODS_BY_CURRENCY } from "../../../lib/giving/currency";
import { formatMoney } from "../../../lib/giving/format";
import { track } from "../../../lib/analytics";
import { notifyPaymentConfirmed } from "../../../lib/giving/notifications";
import { BigAmount } from "./FlowParts";
import { errorTextClass, inputClass, labelClass, primaryButtonClass } from "./fieldStyles";

interface ConfirmPaymentSheetProps {
  pledgeId: string;
  installment: Installment;
  currency: Currency;
  onClose: () => void;
  onConfirmed: () => void;
}

// Bottom sheet where a giver confirms they've paid. There's no payment
// integration, so this is how payments get marked as received.
export const ConfirmPaymentSheet = ({
  pledgeId,
  installment,
  currency,
  onClose,
  onConfirmed,
}: ConfirmPaymentSheetProps): JSX.Element => {
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [reference, setReference] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!method) {
      setError("Please choose how you paid.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await dataStore.markInstallmentPaid(pledgeId, installment.id, {
        method,
        reference: reference.trim() || undefined,
      });
      notifyPaymentConfirmed(pledgeId, installment.id);
      track("payment_confirmed", { method, currency, value: installment.amount });
      onConfirmed();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-payment-title"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-[560px] overflow-y-auto rounded-t-3xl bg-[#fffaf4] px-5 pb-6 pt-5 [font-family:'Inter',Helvetica] sm:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-4">
          <h2
            id="confirm-payment-title"
            className="font-drum text-2xl font-bold leading-tight text-black"
          >
            Confirm your payment
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black/[0.06] text-black hover:bg-black/10"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-6">
          <div>
            <p className="text-base text-slate-500">You paid</p>
            <div className="mt-2">
              <BigAmount text={formatMoney(installment.amount, currency)} />
            </div>
          </div>

          <fieldset>
            <legend className={labelClass}>How did you pay?</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {PAYMENT_METHODS_BY_CURRENCY[currency].map((option) => {
                const selected = method === option;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setMethod(option)}
                    aria-pressed={selected}
                    className={`rounded-full px-4 py-2.5 text-sm font-bold transition-colors ${
                      selected
                        ? "bg-black text-white"
                        : "bg-black/[0.06] text-black hover:bg-black/10"
                    }`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div>
            <label className={labelClass} htmlFor="paymentReference">
              Reference or note (optional)
            </label>
            <input
              id="paymentReference"
              type="text"
              placeholder="e.g. transaction ID or sender name"
              className={inputClass}
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </div>

          {error && <p className={errorTextClass}>{error}</p>}

          <button type="submit" className={primaryButtonClass} disabled={submitting}>
            {submitting ? "Saving…" : "Yes, I've paid"}
          </button>
        </form>
      </div>
    </div>
  );
};
