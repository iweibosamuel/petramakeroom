import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { dataStore, type Pledge } from "../../lib/giving";
import { formatDate, formatNaira } from "../../lib/giving/format";
import { BankTransferDetails } from "./components/BankTransferDetails";
import { GiveShell } from "./components/GiveShell";

export const PledgeSchedule = (): JSX.Element => {
  const { pledgeId } = useParams<{ pledgeId: string }>();
  const [pledge, setPledge] = useState<Pledge | null | undefined>(undefined);

  useEffect(() => {
    if (!pledgeId) return;
    dataStore.getPledge(pledgeId).then(setPledge);
  }, [pledgeId]);

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

  return (
    <GiveShell
      title="You're in 🎉"
      subtitle={`Thank you, ${pledge.donorName}. Here's your payment schedule.`}
      backTo="/give"
      backLabel="Give again"
    >
      <div className="mb-6 rounded-xl bg-slate-50 p-4">
        <div className="flex justify-between text-sm font-semibold text-slate-600">
          <span>Units</span>
          <span>{pledge.units}</span>
        </div>
        <div className="mt-1 flex justify-between text-sm font-semibold text-slate-600">
          <span>Total pledged</span>
          <span>{formatNaira(pledge.amountNaira)}</span>
        </div>
        <div className="mt-1 flex justify-between text-sm font-semibold text-slate-600">
          <span>Deadline</span>
          <span>{formatDate(pledge.deadline)}</span>
        </div>
      </div>

      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-400">
        Schedule
      </h2>
      <ul className="flex flex-col gap-2">
        {pledge.paymentPlan.installments.map((installment, idx) => (
          <li
            key={installment.id}
            className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3"
          >
            <div>
              <p className="text-sm font-semibold text-slate-700">
                Payment {idx + 1}
              </p>
              <p className="text-xs text-slate-400">
                Due {formatDate(installment.dueDate)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-slate-900">
                {formatNaira(installment.amount)}
              </p>
              <p
                className={`text-xs font-semibold ${
                  installment.status === "paid"
                    ? "text-emerald-600"
                    : "text-amber-500"
                }`}
              >
                {installment.status === "paid" ? "Paid" : "Pending"}
              </p>
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-6 rounded-lg bg-amber-50 p-3 text-xs text-amber-700">
        Online payment collection isn't connected yet — please pay via bank
        transfer below and keep your receipt. We'll mark each payment as
        received.
      </p>

      <div className="mt-6">
        <BankTransferDetails />
      </div>

      {pledge.groupId && (
        <Link
          to={`/give/group/${pledge.groupId}`}
          className="mt-4 block text-center text-sm font-semibold text-[#fa400f] hover:underline"
        >
          View group progress →
        </Link>
      )}
    </GiveShell>
  );
};
