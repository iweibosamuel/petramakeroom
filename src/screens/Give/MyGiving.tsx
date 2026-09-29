import { useEffect, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
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
  rememberDonorDetails,
  rememberEmail,
} from "../../lib/giving/rememberedDonor";
import { GiveShell } from "./components/GiveShell";
import { StickyAction } from "./components/FlowParts";
import { errorTextClass, inputClass, labelClass, primaryButtonClass } from "./components/fieldStyles";

// Track giving is two pages: /trackgiving asks for an email (always empty
// on arrival), and /trackgiving/mypledge lists that email's pledges. The
// email travels in history state, so Back from a pledge returns to the list
// and a fresh visit to the list without one goes back to the email page.
export const TRACK_GIVING_PATH = "/trackgiving";
export const MY_PLEDGES_PATH = "/trackgiving/mypledge";

export const pledgePath = (pledgeId: string) => `${MY_PLEDGES_PATH}/${pledgeId}`;

export interface TrackGivingState {
  // Opened from My pledges for this email: Back returns to the list.
  trackGivingEmail?: string;
  // Opened straight after making the pledge: Back offers "Give again".
  justPledged?: boolean;
}

// /trackgiving: type the email you gave with.
export const TrackGiving = (): JSX.Element => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      setError("Enter the email you gave with.");
      return;
    }
    navigate(MY_PLEDGES_PATH, { state: { trackGivingEmail: trimmed } satisfies TrackGivingState });
  }

  return (
    <GiveShell
      title="Track giving"
      subtitle="Enter the email you used when you gave to see your pledges, confirm payments or make another pledge."
      backTo="/"
    >
      <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-5">
        <div>
          <label className={labelClass} htmlFor="lookupEmail">
            Email
          </label>
          <input
            id="lookupEmail"
            type="email"
            autoComplete="email"
            className={inputClass}
            value={email}
            onChange={(e) => {
              setError(null);
              setEmail(e.target.value);
            }}
            required
          />
        </div>

        {error && <p className={errorTextClass}>{error}</p>}

        <StickyAction>
          <button type="submit" className={primaryButtonClass}>
            Track giving
          </button>
        </StickyAction>
      </form>
    </GiveShell>
  );
};

// /trackgiving/mypledge: the pledges for the email entered on /trackgiving.
export const MyPledges = (): JSX.Element => {
  const location = useLocation();
  const navigate = useNavigate();
  const email = (location.state as TrackGivingState | null)?.trackGivingEmail;
  const [pledges, setPledges] = useState<Pledge[]>([]);
  const [loading, setLoading] = useState(true);
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
      const found = await dataStore.getPledgesByEmail(targetEmail);
      setPledges(found);
      rememberEmail(targetEmail);
      // Save their details from their latest own pledge (not a group seed
      // someone else organised), so "Make another pledge" skips the form.
      const own = found.find(
        (p) => p.donorEmail.trim().toLowerCase() === targetEmail.trim().toLowerCase(),
      );
      if (own?.donorPhone && own.donorProfile) {
        rememberDonorDetails({
          name: own.donorName,
          email: own.donorEmail,
          phone: own.donorPhone,
          profile: own.donorProfile,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (email) lookup(email);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email]);

  // Opened directly (no email entered): ask for one first.
  if (!email) return <Navigate to={TRACK_GIVING_PATH} replace />;

  function useDifferentEmail() {
    forgetRememberedEmail();
    navigate(TRACK_GIVING_PATH);
  }

  const hasNothing = pledges.length === 0;
  return (
    <GiveShell title="My pledges" subtitle={email} backTo={TRACK_GIVING_PATH}>
        {loading && <p className="text-slate-500">Loading…</p>}

        {error && <p className={`${errorTextClass} mb-4`}>{error}</p>}

        {!loading && !error && hasNothing && (
          <p className="text-sm text-slate-500">
            We couldn't find any pledges for this email yet.
          </p>
        )}

        {!loading && (
          <Link
            to="/give"
            className={`${primaryButtonClass} mb-6 flex items-center justify-center`}
          >
            {hasNothing ? "Make a pledge" : "Make another pledge"}
          </Link>
        )}

        {!loading && pledges.length > 0 && (
          <div className="mb-6">
            <ul className="flex flex-col gap-2">
              {pledges.map((pledge) => {
                const nextPending = pledge.paymentPlan.installments
                  .filter((i) => i.status !== "paid")
                  .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
                return (
                  <li key={pledge.id} className="rounded-2xl bg-black/[0.05]">
                    <Link
                      to={pledgePath(pledge.id)}
                      state={{ trackGivingEmail: email } satisfies TrackGivingState}
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
              lookup(email);
            }}
          />
        )}
      </GiveShell>
  );
};
