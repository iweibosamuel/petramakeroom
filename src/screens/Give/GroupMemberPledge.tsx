import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { dataStore, type Group, type GroupMember } from "../../lib/giving";
import { formatDate, formatNaira } from "../../lib/giving/format";
import { rememberEmail } from "../../lib/giving/rememberedDonor";
import { GiveShell } from "./components/GiveShell";
import { PaymentPlanForm, type PaymentPlanFormResult } from "./components/PaymentPlanForm";

export const GroupMemberPledge = (): JSX.Element => {
  const { memberId } = useParams<{ memberId: string }>();
  const navigate = useNavigate();
  const [member, setMember] = useState<GroupMember | null | undefined>(undefined);
  const [group, setGroup] = useState<Group | null>(null);

  useEffect(() => {
    if (!memberId) return;
    (async () => {
      const m = await dataStore.getGroupMember(memberId);
      setMember(m);
      if (m) {
        const g = await dataStore.getGroup(m.groupId);
        setGroup(g);
      }
    })();
  }, [memberId]);

  if (member === undefined || (member && !group)) {
    return (
      <GiveShell title="Loading…">
        <p className="text-slate-500">Fetching your details…</p>
      </GiveShell>
    );
  }

  if (!member || member.status !== "confirmed") {
    return (
      <GiveShell title="Not confirmed yet" backTo="/give">
        <p className="text-sm text-slate-500">
          Please confirm your pledge via the link in your email first.
        </p>
      </GiveShell>
    );
  }

  async function handleSubmit(result: PaymentPlanFormResult) {
    if (!memberId || !member) return;
    const pledge = await dataStore.completeGroupMemberPledge({
      memberId,
      deadline: result.deadline,
      paymentPlan: result.paymentPlan,
      installments: result.installments,
    });
    rememberEmail(member.email);
    navigate(`/give/schedule/${pledge.id}`);
  }

  return (
    <GiveShell
      title="Your payment plan"
      subtitle={`Covering ${formatNaira(member.committedAmountNaira)} — choose your deadline (by ${formatDate(group!.deadline)}) and how you'll pay.`}
    >
      <PaymentPlanForm
        totalAmountNaira={member.committedAmountNaira}
        maxDeadline={group!.deadline}
        onSubmit={handleSubmit}
        submitLabel="Confirm my pledge"
      />
    </GiveShell>
  );
};
