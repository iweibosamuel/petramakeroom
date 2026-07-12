import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { dataStore, DEFAULT_CAMPAIGN_ID } from "../../lib/giving";
import { maxDeadlineIso, todayIso, unitsToNaira, formatNaira } from "../../lib/giving/format";
import { GiveShell } from "./components/GiveShell";
import {
  errorTextClass,
  helpTextClass,
  inputClass,
  labelClass,
  primaryButtonClass,
} from "./components/fieldStyles";

export const GroupCreate = (): JSX.Element => {
  const navigate = useNavigate();
  const [organizerName, setOrganizerName] = useState("");
  const [organizerEmail, setOrganizerEmail] = useState("");
  const [totalUnitsStr, setTotalUnitsStr] = useState("2");
  const [deadline, setDeadline] = useState(maxDeadlineIso());
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const totalUnits = Number(totalUnitsStr) || 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!organizerName.trim() || !organizerEmail.trim()) {
      setError("Please enter your name and contact email.");
      return;
    }
    if (totalUnits < 1) {
      setError("Minimum is 1 unit.");
      return;
    }
    if (!deadline || deadline < todayIso() || deadline > maxDeadlineIso()) {
      setError("Please choose a valid deadline within 2 months.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const group = await dataStore.createGroup({
        campaignId: DEFAULT_CAMPAIGN_ID,
        organizerName,
        organizerEmail,
        totalUnits,
        deadline,
      });
      navigate(`/give/group/${group.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSubmitting(false);
    }
  }

  return (
    <GiveShell
      title="Start a group"
      subtitle="Commit to a total, then invite your group to cover it together."
      backTo="/give"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div>
          <label className={labelClass} htmlFor="totalUnits">
            Total units your group is committing to
          </label>
          <input
            id="totalUnits"
            type="number"
            min={1}
            step={1}
            className={inputClass}
            value={totalUnitsStr}
            onChange={(e) => setTotalUnitsStr(e.target.value)}
            required
          />
          <p className="mt-1 text-sm font-semibold text-[#fa400f]">
            = {formatNaira(unitsToNaira(totalUnits))}
          </p>
        </div>

        <div>
          <label className={labelClass} htmlFor="deadline">
            Group deadline
          </label>
          <input
            id="deadline"
            type="date"
            className={inputClass}
            min={todayIso()}
            max={maxDeadlineIso()}
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            required
          />
          <p className={helpTextClass}>
            Members will choose their own deadline within this window.
          </p>
        </div>

        <div>
          <label className={labelClass} htmlFor="organizerName">
            Your name
          </label>
          <input
            id="organizerName"
            type="text"
            className={inputClass}
            value={organizerName}
            onChange={(e) => setOrganizerName(e.target.value)}
            required
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="organizerEmail">
            Your email
          </label>
          <input
            id="organizerEmail"
            type="email"
            className={inputClass}
            value={organizerEmail}
            onChange={(e) => setOrganizerEmail(e.target.value)}
            required
          />
        </div>

        {error && <p className={errorTextClass}>{error}</p>}

        <button type="submit" className={primaryButtonClass} disabled={submitting}>
          {submitting ? "Creating…" : "Create group & get invite link"}
        </button>
      </form>
    </GiveShell>
  );
};
