import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Mail } from "lucide-react";
import { dataStore, type Group, type GroupMember } from "../../lib/giving";
import { isSupabaseConfigured } from "../../lib/supabaseClient";
import { formatNaira } from "../../lib/giving/format";
import { rememberEmail } from "../../lib/giving/rememberedDonor";
import { TIERS } from "../../lib/giving/tiers";
import { GiveShell } from "./components/GiveShell";
import { BigAmount, DetailRow, Divider } from "./components/FlowParts";
import {
  AmountStep,
  DetailsStep,
  emptyDonorDetails,
  type DonorDetails,
} from "./components/FlowSteps";

// Amount → your details → (confirm by email) → when. Members can cover any
// share of the group's total.
export const GroupJoin = (): JSX.Element => {
  const { groupId } = useParams<{ groupId: string }>();
  const [group, setGroup] = useState<Group | null | undefined>(undefined);
  const [step, setStep] = useState<"amount" | "details">("amount");
  const [amountNaira, setAmountNaira] = useState(0);
  const [details, setDetails] = useState<DonorDetails>(emptyDonorDetails);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [joinedMember, setJoinedMember] = useState<GroupMember | null>(null);

  useEffect(() => {
    if (!groupId) return;
    dataStore.getGroup(groupId).then(setGroup);
  }, [groupId]);

  async function handleJoin(next: DonorDetails) {
    if (!groupId) return;
    setDetails(next);
    setError(null);
    setSubmitting(true);
    try {
      const member = await dataStore.joinGroup(groupId, {
        name: next.name,
        email: next.email,
        phone: next.phone,
        profile: next.profile,
        committedAmountNaira: amountNaira,
      });
      rememberEmail(next.email);
      setJoinedMember(member);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  if (group === undefined) {
    return (
      <GiveShell title="Loading…">
        <p className="text-slate-500">Fetching group…</p>
      </GiveShell>
    );
  }

  if (group === null) {
    return (
      <GiveShell title="Group not found" backTo="/give">
        <p className="text-slate-500">This group link looks invalid.</p>
      </GiveShell>
    );
  }

  const tier = TIERS[group.tier ?? "burden_bearer"];

  if (joinedMember) {
    return (
      <GiveShell
        title="Check your email"
        subtitle="Confirm your pledge, then choose to give now or on a date."
      >
        <p className="text-base text-slate-500">Your share</p>
        <div className="mt-2">
          <BigAmount text={formatNaira(joinedMember.committedAmountNaira)} />
        </div>

        <div className="mt-6">
          <Divider />
          <DetailRow
            icon={<Mail />}
            label="Confirmation link sent to"
            value={joinedMember.email}
            hint="Your share counts toward the group once you confirm"
          />
          <Divider />
        </div>

        {!isSupabaseConfigured && (
          <div className="mt-6 rounded-2xl bg-black/[0.05] p-4">
            <p className="text-sm text-slate-500">
              Dev mode: no email service is connected yet, so here's the link
              that would have been emailed to you.
            </p>
            <Link
              to={`/give/group/confirm/${joinedMember.confirmationToken}`}
              className="mt-2 inline-block text-sm font-bold text-black hover:underline"
            >
              Confirm my pledge →
            </Link>
          </div>
        )}
      </GiveShell>
    );
  }

  if (step === "details") {
    return (
      <DetailsStep
        initial={details}
        submitLabel="Join & send confirmation email"
        submitting={submitting}
        error={error}
        onBack={() => setStep("amount")}
        onContinue={handleJoin}
      />
    );
  }

  return (
    <AmountStep
      title={`Join ${group.organizerName}'s group`}
      subtitle={`Their group is giving ${formatNaira(group.totalUnits * 1_000_000)} together. Cover any share you like.`}
      tier={tier}
      label="Your share"
      minNaira={1}
      initialAmountNaira={amountNaira}
      backTo={`/give/group/${group.id}`}
      onContinue={(amount) => {
        setAmountNaira(amount);
        setStep("details");
      }}
    />
  );
};
