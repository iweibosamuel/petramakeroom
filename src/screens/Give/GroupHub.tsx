import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { dataStore, type Group, type GroupMember, type Pledge } from "../../lib/giving";
import { formatDate, formatNaira } from "../../lib/giving/format";
import { GiveShell } from "./components/GiveShell";
import { primaryButtonClass } from "./components/fieldStyles";

interface MemberWithPledge {
  member: GroupMember;
  pledge: Pledge | null;
}

export const GroupHub = (): JSX.Element => {
  const { groupId } = useParams<{ groupId: string }>();
  const [group, setGroup] = useState<Group | null | undefined>(undefined);
  const [members, setMembers] = useState<MemberWithPledge[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!groupId) return;
    (async () => {
      const g = await dataStore.getGroup(groupId);
      setGroup(g);
      if (!g) return;
      const groupMembers = await dataStore.getGroupMembers(groupId);
      const withPledges = await Promise.all(
        groupMembers.map(async (member) => ({
          member,
          pledge: member.pledgeId ? await dataStore.getPledge(member.pledgeId) : null,
        })),
      );
      setMembers(withPledges);
    })();
  }, [groupId]);

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

  const inviteUrl = `${window.location.origin}/give/group/${group.id}/join`;
  const committedNaira = members.reduce(
    (sum, m) => sum + m.member.committedAmountNaira,
    0,
  );
  const paidNaira = members.reduce(
    (sum, m) => sum + (m.pledge?.amountPaid ?? 0),
    0,
  );
  const totalGoalNaira = group.totalUnits * 1_000_000;
  const pct = Math.min(100, Math.round((committedNaira / totalGoalNaira) * 100));

  function copyInviteLink() {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <GiveShell
      title={`${group.organizerName}'s group`}
      subtitle={`Deadline: ${formatDate(group.deadline)}`}
      backTo="/give"
    >
      <div className="mb-6">
        <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-[#fa400f] transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="mt-2 flex items-center justify-between text-sm font-semibold text-slate-600">
          <span>{formatNaira(committedNaira)} committed</span>
          <span>{formatNaira(totalGoalNaira)} goal</span>
        </div>
        <p className="mt-1 text-xs text-slate-400">
          {formatNaira(paidNaira)} actually paid so far
        </p>
      </div>

      <div className="mb-6 rounded-xl border border-dashed border-slate-300 p-4">
        <p className="text-sm font-semibold text-slate-700">Invite link</p>
        <div className="mt-2 flex items-center gap-2">
          <input
            readOnly
            value={inviteUrl}
            className="w-full truncate rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-600"
          />
          <button
            type="button"
            onClick={copyInviteLink}
            className="shrink-0 rounded-lg bg-[#1c2b3a] px-3 py-2 text-sm font-semibold text-white hover:bg-[#132029]"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>

      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-400">
        Who's in
      </h2>
      <ul className="mb-6 flex flex-col gap-2">
        {members.length === 0 && (
          <li className="text-sm text-slate-400">
            No one has joined yet — share the invite link above.
          </li>
        )}
        {members.map(({ member, pledge }) => (
          <li
            key={member.id}
            className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3"
          >
            <div>
              <p className="text-sm font-semibold text-slate-700">{member.name}</p>
              <p
                className={`text-xs font-semibold ${
                  member.status === "confirmed" ? "text-emerald-600" : "text-amber-500"
                }`}
              >
                {member.status === "confirmed" ? "Confirmed" : "Pending confirmation"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-slate-900">
                {formatNaira(member.committedAmountNaira)}
              </p>
              <p className="text-xs text-slate-400">
                {formatNaira(pledge?.amountPaid ?? 0)} paid
              </p>
            </div>
          </li>
        ))}
      </ul>

      <Link to={`/give/group/${group.id}/join`} className={primaryButtonClass + " block text-center"}>
        Join this group
      </Link>
    </GiveShell>
  );
};
