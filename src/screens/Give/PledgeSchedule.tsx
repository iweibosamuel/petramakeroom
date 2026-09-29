import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { CalendarDays, CircleCheck, Zap } from "lucide-react";
import {
  dataStore,
  type GroupMember,
  type Installment,
  type Pledge,
} from "../../lib/giving";
import { formatDate, formatMoney, todayIso } from "../../lib/giving/format";
import { PaymentMethods } from "./components/PaymentMethods";
import { ConfirmPaymentSheet } from "./components/ConfirmPaymentSheet";
import {
  BigAmount,
  DetailRow,
  Divider,
  StickyAction,
} from "./components/FlowParts";
import { primaryButtonClass } from "./components/fieldStyles";
import { GiveShell } from "./components/GiveShell";
import { TRACK_GIVING_PATH, type TrackGivingState } from "./MyGiving";

export const PledgeSchedule = (): JSX.Element => {
  const { pledgeId } = useParams<{ pledgeId: string }>();
  const navigate = useNavigate();
  // Back depends on how the page was opened: from My pledges it returns to
  // that list; straight after pledging it offers "Give again"; from an email
  // link it goes to Track giving.
  const openedFrom = useLocation().state as TrackGivingState | null;
  const backProps = openedFrom?.trackGivingEmail
    ? { onBack: () => navigate(-1), backLabel: "Back to my pledges" }
    : openedFrom?.justPledged
      ? { backTo: "/give", backLabel: "Give again" }
      : { backTo: TRACK_GIVING_PATH, backLabel: "Track giving" };
  const [pledge, setPledge] = useState<Pledge | null | undefined>(undefined);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [confirming, setConfirming] = useState<Installment | null>(null);

  const loadPledge = useCallback(() => {
    if (!pledgeId) return;
    dataStore.getPledge(pledgeId).then((found) => {
      setPledge(found);
      if (found?.kind === "group" && found.groupId) {
        dataStore.getGroupMembers(found.groupId).then(setGroupMembers);
      }
    });
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
      <GiveShell title="Pledge not found" {...backProps}>
        <p className="text-slate-500">
          We couldn't find that pledge. It may have been an invalid link.
        </p>
      </GiveShell>
    );
  }

  const money = (amount: number) => formatMoney(amount, pledge.currency);
  const { installments } = pledge.paymentPlan;
  const pending = installments
    .filter((i) => i.status !== "paid")
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const nextPending = pending[0];
  // "I've paid" only shows once a payment is due. Paying early is confirmed
  // from Track giving instead.
  const nextIsDue = Boolean(nextPending) && nextPending.dueDate <= todayIso();
  const isFullyPaid = pending.length === 0;
  const isGivingNow =
    installments.length === 1 && !isFullyPaid && installments[0].dueDate <= todayIso();

  const title = isFullyPaid
    ? "Thank you 🎉"
    : isGivingNow
      ? "Make payment"
      : "You're in 🎉";
  const isGroup = pledge.kind === "group";
  // Anyone in a group can open this page from their email and pay, so group
  // wording doesn't assume the viewer is the organiser.
  const thanks = isGroup ? "Thank you for giving together." : `Thank you, ${pledge.donorName}.`;
  const subtitle = isFullyPaid
    ? isGroup
      ? `We've recorded your group's seed of ${money(pledge.amount)}. God bless you all.`
      : `We've recorded your seed of ${money(pledge.amount)}, ${pledge.donorName}. God bless you.`
    : isGivingNow
      ? `${thanks} ${isGroup ? "Anyone in the group can pay" : "Pay"} ${money(pledge.amount)} using any of the options below, then tap “I've paid”.`
      : `${thanks} When a payment is due, ${isGroup ? "anyone in the group can pay" : "pay"} using any of the options below, then tap “I've paid”.`;

  return (
    <GiveShell title={title} subtitle={subtitle} {...backProps}>
      <p className="text-base text-slate-500">
        {isFullyPaid ? "Total given" : isGivingNow ? "Amount to pay" : "Total pledged"}
      </p>
      <div className="mt-2">
        <BigAmount text={money(pledge.amount)} />
      </div>
      {!isFullyPaid && pledge.amountPaid > 0 && (
        <p className="mt-2 text-sm font-semibold text-emerald-700">
          {money(pledge.amountPaid)} paid so far
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
                value={money(installment.amount)}
                hint={isPaid && installment.paymentMethod ? `via ${installment.paymentMethod}` : undefined}
                action={
                  isPaid ? (
                    <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-700">
                      Paid
                    </span>
                  ) : undefined
                }
              />
            </div>
          );
        })}
        <Divider />
      </div>

      {isGroup && groupMembers.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-1 text-sm text-slate-500">Who's giving</h2>
          <ul>
            {groupMembers.map((member) => (
              <li
                key={member.id}
                className="flex items-center justify-between gap-3 border-b border-black/10 py-3"
              >
                <span className="min-w-0 text-base font-semibold text-black">
                  {member.name}
                  {member.isOrganizer && (
                    <span className="font-normal text-slate-500"> · organiser</span>
                  )}
                </span>
                <span className="shrink-0 text-base font-bold text-black">
                  {money(member.committedAmount)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!isFullyPaid && (
        <>
          <div className="mt-8">
            <PaymentMethods currency={pledge.currency} />
          </div>

          <p className="mt-8 rounded-2xl bg-black/[0.05] p-4 text-sm text-slate-600">
            {nextIsDue ? (
              <>
                After paying, tap “I've paid” so we can record it, and keep your
                receipt. You can also confirm it later in{" "}
              </>
            ) : (
              <>
                Your next payment is due {formatDate(nextPending.dueDate)}. We'll
                remind you by email. Paying earlier? Confirm it any time in{" "}
              </>
            )}
            <Link to="/trackgiving" className="font-bold text-black underline">
              Track giving
            </Link>{" "}
            with {isGroup ? "the email you were listed with" : pledge.donorEmail}.
          </p>
        </>
      )}

      {nextPending && nextIsDue && (
        <StickyAction>
          <button
            type="button"
            onClick={() => setConfirming(nextPending)}
            className={primaryButtonClass}
          >
            I've paid {money(nextPending.amount)}
          </button>
        </StickyAction>
      )}

      {confirming && (
        <ConfirmPaymentSheet
          pledgeId={pledge.id}
          installment={confirming}
          currency={pledge.currency}
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
