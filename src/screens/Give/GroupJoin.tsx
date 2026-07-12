import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { dataStore, type GroupMember } from "../../lib/giving";
import { isSupabaseConfigured } from "../../lib/supabaseClient";
import { formatNaira } from "../../lib/giving/format";
import { getRememberedEmail, rememberEmail } from "../../lib/giving/rememberedDonor";
import { GiveShell } from "./components/GiveShell";
import {
  errorTextClass,
  helpTextClass,
  inputClass,
  labelClass,
  primaryButtonClass,
} from "./components/fieldStyles";

export const GroupJoin = (): JSX.Element => {
  const { groupId } = useParams<{ groupId: string }>();
  const [name, setName] = useState("");
  const [email, setEmail] = useState(() => getRememberedEmail() ?? "");
  const [phone, setPhone] = useState("");
  const [amountStr, setAmountStr] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [joinedMember, setJoinedMember] = useState<GroupMember | null>(null);

  const amount = Number(amountStr) || 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!groupId) return;
    if (!name.trim() || !email.trim()) {
      setError("Please enter your name and email.");
      return;
    }
    if (amount <= 0) {
      setError("Enter an amount greater than ₦0.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const member = await dataStore.joinGroup(groupId, {
        name,
        email,
        phone: phone || undefined,
        committedAmountNaira: amount,
      });
      rememberEmail(email);
      setJoinedMember(member);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  if (joinedMember) {
    return (
      <GiveShell
        title="Check your email"
        subtitle={`We've sent a confirmation link to ${joinedMember.email}.`}
      >
        <p className="text-sm text-slate-500">
          Your pledge of {formatNaira(joinedMember.committedAmountNaira)} is
          saved as <span className="font-semibold text-amber-500">pending</span> until
          you confirm — it won't count toward the group's total until then.
        </p>

        {!isSupabaseConfigured && (
          <div className="mt-6 rounded-lg bg-slate-50 p-4">
            <p className="text-xs font-semibold text-slate-500">
              Dev mode: no email service is connected yet, so here's the link
              that would have been emailed to you.
            </p>
            <Link
              to={`/give/group/confirm/${joinedMember.confirmationToken}`}
              className="mt-2 inline-block text-sm font-semibold text-[#fa400f] hover:underline"
            >
              Confirm my pledge →
            </Link>
          </div>
        )}
      </GiveShell>
    );
  }

  return (
    <GiveShell
      title="Join this group"
      subtitle="Choose how much of the group's total you're covering."
      backTo={groupId ? `/give/group/${groupId}` : "/give"}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div>
          <label className={labelClass} htmlFor="amount">
            Amount you're covering (₦)
          </label>
          <input
            id="amount"
            type="number"
            min={1}
            className={inputClass}
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value)}
            placeholder="e.g. 400000"
            required
          />
          <p className={helpTextClass}>
            This can be a fraction of a unit — e.g. ₦400,000 of a shared ₦1,000,000 unit.
          </p>
        </div>

        <div>
          <label className={labelClass} htmlFor="name">
            Full name
          </label>
          <input
            id="name"
            type="text"
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            className={inputClass}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <p className={helpTextClass}>
            We'll send a confirmation link here before your pledge counts.
          </p>
        </div>

        <div>
          <label className={labelClass} htmlFor="phone">
            Phone (optional)
          </label>
          <input
            id="phone"
            type="tel"
            className={inputClass}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        {error && <p className={errorTextClass}>{error}</p>}

        <button type="submit" className={primaryButtonClass} disabled={submitting}>
          {submitting ? "Joining…" : "Join & send confirmation email"}
        </button>
      </form>
    </GiveShell>
  );
};
