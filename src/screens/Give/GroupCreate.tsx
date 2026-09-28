import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarDays } from "lucide-react";
import { dataStore, DEFAULT_CAMPAIGN_ID, type GivingTier } from "../../lib/giving";
import {
  formatDate,
  formatNaira,
  maxDeadlineIso,
  nairaToUnits,
  todayIso,
} from "../../lib/giving/format";
import { rememberEmail } from "../../lib/giving/rememberedDonor";
import { TIERS } from "../../lib/giving/tiers";
import { GiveShell } from "./components/GiveShell";
import { BigAmount, DetailRow, Divider, StickyAction } from "./components/FlowParts";
import {
  AmountStep,
  DetailsStep,
  emptyDonorDetails,
  type DonorDetails,
} from "./components/FlowSteps";
import {
  errorTextClass,
  helpTextClass,
  inputClass,
  labelClass,
  primaryButtonClass,
} from "./components/fieldStyles";

// Amount → your details → when. The organiser sets the group total and the
// date the group should finish by; members then choose their own share.
export const GroupCreate = ({ tier: tierId }: { tier: GivingTier }): JSX.Element => {
  const tier = TIERS[tierId];
  const navigate = useNavigate();
  const [step, setStep] = useState<"amount" | "details" | "deadline">("amount");
  const [totalNaira, setTotalNaira] = useState(0);
  const [details, setDetails] = useState<DonorDetails>(emptyDonorDetails);
  const [deadline, setDeadline] = useState(maxDeadlineIso());
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!deadline || deadline < todayIso() || deadline > maxDeadlineIso()) {
      setError(`Please choose a date up to ${formatDate(maxDeadlineIso())}.`);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const group = await dataStore.createGroup({
        campaignId: DEFAULT_CAMPAIGN_ID,
        tier: tier.id,
        organizerName: details.name,
        organizerEmail: details.email,
        organizerPhone: details.phone,
        organizerProfile: details.profile,
        totalUnits: nairaToUnits(totalNaira),
        deadline,
      });
      rememberEmail(details.email);
      navigate(`/give/group/${group.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSubmitting(false);
    }
  }

  if (step === "deadline") {
    return (
      <GiveShell
        title="When should your group finish giving?"
        onBack={() => setStep("details")}
      >
        <form onSubmit={handleCreate} className="flex flex-1 flex-col">
          <p className="text-base text-slate-500">Your group's total</p>
          <div className="mt-2">
            <BigAmount text={formatNaira(totalNaira)} />
          </div>

          <div className="mt-6">
            <Divider />
            <DetailRow
              icon={<CalendarDays />}
              label="Group deadline"
              value={deadline ? formatDate(deadline) : "Choose a date"}
              hint="Members give now or schedule their share before this date"
            />
            <Divider />
          </div>

          <div className="mt-4">
            <label className={labelClass} htmlFor="deadline">
              Finish by
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
              Any date up to {formatDate(maxDeadlineIso())}.
            </p>
          </div>

          {error && <p className={errorTextClass}>{error}</p>}

          <StickyAction>
            <button type="submit" className={primaryButtonClass} disabled={submitting}>
              {submitting ? "Creating…" : "Create group"}
            </button>
          </StickyAction>
        </form>
      </GiveShell>
    );
  }

  if (step === "details") {
    return (
      <DetailsStep
        subtitle="You're organising this group. We'll send updates here."
        initial={details}
        onBack={() => setStep("amount")}
        onContinue={(next) => {
          setDetails(next);
          setStep("deadline");
        }}
      />
    );
  }

  return (
    <AmountStep
      title="Start a group"
      subtitle="Set your group's total, then invite others to cover it together."
      tier={tier}
      label="Your group's total"
      minNaira={tier.minNaira}
      maxNaira={tier.maxNaira}
      initialAmountNaira={totalNaira}
      backTo={`/give/${tier.slug}`}
      onContinue={(amount) => {
        setTotalNaira(amount);
        setStep("details");
      }}
    />
  );
};
