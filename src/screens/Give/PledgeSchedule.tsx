import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CalendarDays, CircleCheck, Zap } from "lucide-react";
import { dataStore, type Installment, type Pledge } from "../../lib/giving";
import { formatDate, formatNaira, todayIso } from "../../lib/giving/format";
import { PaymentMethods } from "./components/PaymentMethods";
import { ConfirmPaymentSheet } from "./components/ConfirmPaymentSheet";
import {
  BigAmount,
  DetailRow,
  Divider,
  StickyAction,
  pillButtonClass,
} from "./components/FlowParts";
import { primaryButtonClass, secondaryButtonClass } from "./components/fieldStyles";
import { GiveShell } from "./components/GiveShell";

export const PledgeSchedule = (): JSX.Element => {
  const { pledgeId } = useParams<{ pledgeId: string }>();
  const [pledge, setPledge] = useState<Pledge | null | undefined>(undefined);
  const [confirming, setConfirming] = useState<Installment | null>(null);

  const loadPledge = useCallback(() => {
    if (!pledgeId) return;
    dataStore.getPledge(pledgeId).then(setPledge);
  }, [pledgeId]);

  useEffect(loadPledge, [loadPledge]);

  if (pledge === undefined) {
    return (
      <GiveShell title="Loading…">
        <p className="text-slate-500">Fetching your pledge…</p>
      </GiveShell>
    );
  }

  if (pledge === null) {
    return (
      <GiveShell title="Pledge not found" backTo="/give">
        <p className="text-slate-500">
          We couldn't find that pledge. It may have been an invalid link.
        </p>
      </GiveShell>
    );
  }

  const { installments } = pledge.paymentPlan;
  const pending = installments
    .filter((i) => i.status !== "paid")
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const nextPending = pending[0];
  const isFullyPaid = pending.length === 0;
  const isGivingNow =
    installments.length === 1 && !isFullyPaid && installments[0].dueDate <= todayIso();

  const title = isFullyPaid
    ? "Thank you 🎉"
    : isGivingNow
      ? "Complete your seed"
      : "You're in 🎉";
  const subtitle = isFullyPaid
    ? `We've recorded your seed of ${formatNaira(pledge.amountNaira)}, ${pledge.donorName}. God bless you.`
    : isGivingNow
      ? `Thank you, ${pledge.donorName}. Pay ${formatNaira(pledge.amountNaira)} using any of the options below, then tap “I've paid”.`
      : `Thank you, ${pledge.donorName}. When a payment is due, pay using any of the options below, then tap “I've paid”.`;

  return (
    <GiveShell title={title} subtitle={subtitle} backTo="/give" backLabel="Give again">
      <p className="text-base text-slate-500">
        {isFullyPaid ? "Total given" : isGivingNow ? "Amount to pay" : "Total pledged"}
      </p>
      <div className="mt-2">
        <BigAmount text={formatNaira(pledge.amountNaira)} />
      </div>
      {!isFullyPaid && pledge.amountPaid > 0 && (
        <p className="mt-2 text-sm font-semibold text-emerald-700">
          {formatNaira(pledge.amountPaid)} paid so far
        </p>
      )}

      <div className="mt-6">
        <Divider />
        {installments.map((installment, idx) => {
          const isPaid = installment.status === "paid";
          const isDueNow = !isPaid && installment.dueDate <= todayIso();
          return (
            <div key={installment.id}>
              {idx > 0 && <Divider />}
              <DetailRow
                icon={isPaid ? <CircleCheck /> : isDueNow ? <Zap /> : <CalendarDays />}
                label={
                  (installments.length > 1 ? `Payment ${idx + 1} · ` : "") +
                  (isPaid
                    ? `Paid${installment.paidAt ? ` ${formatDate(installment.paidAt.slice(0, 10))}` : ""}`
                    : isDueNow
                      ? "Due today"
                      : `Due ${formatDate(installment.dueDate)}`)
                }
                value={formatNaira(installment.amount)}
                hint={isPaid && installment.paymentMethod ? `via ${installment.paymentMethod}` : undefined}
                action={
                  isPaid ? (
                    <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-700">
                      Paid
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirming(installment)}
                      className={pillButtonClass}
                    >
                      I've paid
                    </button>
                  )
                }
              />
            </div>
          );
        })}
        <Divider />
      </div>

      {!isFullyPaid && (
        <>
          <div className="mt-8">
            <PaymentMethods />
          </div>

          <p className="mt-8 rounded-2xl bg-black/[0.05] p-4 text-sm text-slate-600">
            After paying, tap “I've paid” so we can record it, and keep your
            receipt. You can also come back later through “Track your giving”
            with {pledge.donorEmail}.
          </p>
        </>
      )}

      {pledge.groupId && (
        <Link to={`/give/group/${pledge.groupId}`} className={`${secondaryButtonClass} mt-6`}>
          View group progress
        </Link>
      )}

      {nextPending && (
        <StickyAction>
          <button
            type="button"
            onClick={() => setConfirming(nextPending)}
            className={primaryButtonClass}
          >
            I've paid {formatNaira(nextPending.amount)}
          </button>
        </StickyAction>
      )}

      {confirming && (
        <ConfirmPaymentSheet
          pledgeId={pledge.id}
          installment={confirming}
          onClose={() => setConfirming(null)}
          onConfirmed={() => {
            setConfirming(null);
            loadPledge();
          }}
        />
      )}
    </GiveShell>
  );
};
