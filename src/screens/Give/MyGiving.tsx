import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { dataStore, type GroupMember, type Pledge } from "../../lib/giving";
import { formatDate, formatNaira } from "../../lib/giving/format";
import {
  forgetRememberedEmail,
  getRememberedEmail,
  rememberEmail,
} from "../../lib/giving/rememberedDonor";
import { GiveShell } from "./components/GiveShell";
import { errorTextClass, inputClass, labelClass, primaryButtonClass } from "./components/fieldStyles";

export const MyGiving = (): JSX.Element => {
  const [email, setEmail] = useState(() => getRememberedEmail() ?? "");
  const [lookedUpEmail, setLookedUpEmail] = useState<string | null>(null);
  const [pledges, setPledges] = useState<Pledge[]>([]);
  const [memberships, setMemberships] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function lookup(targetEmail: string) {
    setLoading(true);
    setError(null);
    try {
      const [foundPledges, foundMemberships] = await Promise.all([
        dataStore.getPledgesByEmail(targetEmail),
        dataStore.getGroupMembershipsByEmail(targetEmail),
      ]);
      setPledges(foundPledges);
      setMemberships(foundMemberships);
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
    setMemberships([]);
    setEmail("");
  }

  const membershipsWithoutPledge = memberships.filter((m) => !m.pledgeId);

  if (lookedUpEmail) {
    const hasNothing = pledges.length === 0 && membershipsWithoutPledge.length === 0;
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
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-400">
              Pledges
            </h2>
            <ul className="flex flex-col gap-2">
              {pledges.map((pledge) => (
                <li key={pledge.id}>
                  <Link
                    to={`/give/schedule/${pledge.id}`}
                    className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3 hover:border-[#fa400f]"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-700">
                        {pledge.kind === "group_member" ? "Group pledge" : "Individual pledge"}
                      </p>
                      <p className="text-xs text-slate-400">
                        Deadline {formatDate(pledge.deadline)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-900">
                        {formatNaira(pledge.amountNaira)}
                      </p>
                      <p className="text-xs text-slate-400">
                        {formatNaira(pledge.amountPaid)} paid
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {!loading && membershipsWithoutPledge.length > 0 && (
          <div className="mb-6">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-400">
              Groups you've joined
            </h2>
            <ul className="flex flex-col gap-2">
              {membershipsWithoutPledge.map((member) => (
                <li key={member.id}>
                  <Link
                    to={
                      member.status === "confirmed"
                        ? `/give/group/member/${member.id}/pledge`
                        : `/give/group/${member.groupId}`
                    }
                    className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3 hover:border-[#fa400f]"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-700">
                        {formatNaira(member.committedAmountNaira)} commitment
                      </p>
                      <p
                        className={`text-xs font-semibold ${
                          member.status === "confirmed" ? "text-emerald-600" : "text-amber-500"
                        }`}
                      >
                        {member.status === "confirmed"
                          ? "Confirmed — set up your payment plan"
                          : "Pending confirmation"}
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-[#fa400f]">
                      {member.status === "confirmed" ? "Continue →" : "View group →"}
                    </span>
                  </Link>
                </li>
              ))}
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
      </GiveShell>
    );
  }

  return (
    <GiveShell
      title="Access your giving"
      subtitle="Enter the email you used when you gave, and we'll pull up your pledges — no need to fill anything in again."
      backTo="/give"
      centerText
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
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

        <button type="submit" className={primaryButtonClass} disabled={loading}>
          {loading ? "Looking…" : "Find my giving"}
        </button>
      </form>
    </GiveShell>
  );
};
