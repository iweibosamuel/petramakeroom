import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import {
  dataStore,
  type Currency,
  type Installment,
  type Pledge,
} from "../../lib/giving";
import { TIERS } from "../../lib/giving/tiers";
import { ConfirmPaymentSheet } from "./components/ConfirmPaymentSheet";
import { formatDate, formatMoney } from "../../lib/giving/format";
import {
  forgetRememberedEmail,
  getRememberedEmail,
  rememberEmail,
} from "../../lib/giving/rememberedDonor";
import { GiveShell } from "./components/GiveShell";
import { StickyAction } from "./components/FlowParts";
import { errorTextClass, inputClass, labelClass, primaryButtonClass } from "./components/fieldStyles";

export const MyGiving = (): JSX.Element => {
  const [email, setEmail] = useState(() => getRememberedEmail() ?? "");
  const [lookedUpEmail, setLookedUpEmail] = useState<string | null>(null);
  const [pledges, setPledges] = useState<Pledge[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<{
    pledgeId: string;
    installment: Installment;
    currency: Currency;
  } | null>(null);

  async function lookup(targetEmail: string) {
    setLoading(true);
    setError(null);
    try {
      setPledges(await dataStore.getPledgesByEmail(targetEmail));
      setLookedUpEmail(targetEmail);
      rememberEmail(targetEmail);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const remembered = getRememberedEmail();
    if (remembered) {
      lookup(remembered);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      setError("Enter the email you gave with.");
      return;
    }
    lookup(email);
  }

  function useDifferentEmail() {
    forgetRememberedEmail();
    setLookedUpEmail(null);
    setPledges([]);
    setEmail("");
  }

  if (lookedUpEmail) {
    const hasNothing = pledges.length === 0;
    return (
      <GiveShell
        title="Your giving"
        subtitle={lookedUpEmail}
        backTo="/give"
      >
        {loading && <p className="text-slate-500">Loading…</p>}

        {!loading && hasNothing && (
          <p className="text-sm text-slate-500">
            We couldn't find any pledges for this email yet.
          </p>
        )}

        {!loading && pledges.length > 0 && (
          <div className="mb-6">
            <h2 className="mb-3 text-sm text-slate-500">
              Pledges
            </h2>
            <ul className="flex flex-col gap-2">
              {pledges.map((pledge) => {
                const nextPending = pledge.paymentPlan.installments
                  .filter((i) => i.status !== "paid")
                  .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
                return (
                  <li key={pledge.id} className="rounded-2xl bg-black/[0.05]">
                    <Link
                      to={`/give/schedule/${pledge.id}`}
                      className="flex items-center justify-between gap-3 px-4 pt-4"
                    >
                      <div className="min-w-0">
                        <p className="text-sm text-slate-500">
                          {TIERS[pledge.tier ?? "burden_bearer"].name} ·{" "}
                          {pledge.kind === "individual" ? "Individual" : "Group"}
                        </p>
                        <p className="text-lg font-bold text-black">
                          {formatMoney(pledge.amount, pledge.currency)}
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 shrink-0 text-black" />
                    </Link>
                    <p
                      className={`px-4 pb-4 pt-2 text-sm font-semibold ${
                        nextPending ? "text-slate-500" : "text-emerald-700"
                      }`}
                    >
                      {nextPending
                        ? `${formatMoney(pledge.amountPaid, pledge.currency)} paid · next ${formatMoney(nextPending.amount, pledge.currency)} due ${formatDate(nextPending.dueDate)}`
                        : "Fully paid — thank you"}
                    </p>
                    {/* Always offered here, even before the due date, for
                        anyone who pays early. */}
                    {nextPending && (
                      <div className="mx-4 mb-4 flex items-center justify-between gap-3 border-t border-black/10 pt-3">
                        <p className="text-sm font-semibold text-black">
                          Have you made this payment?
                        </p>
                        <button
                          type="button"
                          onClick={() => setConfirming({ pledgeId: pledge.id, installment: nextPending, currency: pledge.currency })}
                          className="shrink-0 rounded-full bg-black px-4 py-2 text-sm font-bold text-white hover:bg-black/85"
                        >
                          Yes, I've paid
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <button
          type="button"
          onClick={useDifferentEmail}
          className="text-sm font-semibold text-slate-500 hover:text-slate-700"
        >
          Not you? Use a different email
        </button>

        {confirming && (
          <ConfirmPaymentSheet
            pledgeId={confirming.pledgeId}
            installment={confirming.installment}
            currency={confirming.currency}
            onClose={() => setConfirming(null)}
            onConfirmed={() => {
              setConfirming(null);
              lookup(lookedUpEmail);
            }}
          />
        )}
      </GiveShell>
    );
  }

  return (
    <GiveShell
      title="Access your giving"
      subtitle="Enter the email you used when you gave, and we'll pull up your pledges — no need to fill anything in again."
      backTo="/give"
    >
      <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-5">
        <div>
          <label className={labelClass} htmlFor="lookupEmail">
            Email
          </label>
          <input
            id="lookupEmail"
            type="email"
            className={inputClass}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        {error && <p className={errorTextClass}>{error}</p>}

        <StickyAction>
          <button type="submit" className={primaryButtonClass} disabled={loading}>
            {loading ? "Looking…" : "Find my giving"}
          </button>
        </StickyAction>
      </form>
    </GiveShell>
  );
};
