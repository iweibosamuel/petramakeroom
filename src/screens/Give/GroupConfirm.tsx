import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { dataStore, type GroupMember } from "../../lib/giving";
import { GiveShell } from "./components/GiveShell";
import { primaryButtonClass } from "./components/fieldStyles";

export const GroupConfirm = (): JSX.Element => {
  const { token } = useParams<{ token: string }>();
  const [member, setMember] = useState<GroupMember | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    dataStore
      .confirmGroupMemberByToken(token)
      .then(setMember)
      .catch((err) => setError(err instanceof Error ? err.message : "Invalid link"));
  }, [token]);

  if (error) {
    return (
      <GiveShell title="Confirmation link invalid" backTo="/give">
        <p className="text-sm text-slate-500">{error}</p>
      </GiveShell>
    );
  }

  if (member === undefined) {
    return (
      <GiveShell title="Confirming…">
        <p className="text-slate-500">One moment…</p>
      </GiveShell>
    );
  }

  if (member.pledgeId) {
    return (
      <GiveShell title="Already confirmed" subtitle="You've already set up your payment plan.">
        <Link to={`/give/schedule/${member.pledgeId}`} className={primaryButtonClass + " block text-center"}>
          View your schedule
        </Link>
      </GiveShell>
    );
  }

  return (
    <GiveShell
      title="You're confirmed!"
      subtitle="Now choose to give now or on a date that works for you."
    >
      <Link
        to={`/give/group/member/${member.id}/pledge`}
        className={primaryButtonClass + " block text-center"}
      >
        Continue
      </Link>
    </GiveShell>
  );
};
