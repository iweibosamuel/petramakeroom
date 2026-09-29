import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { dataStore, DEFAULT_CAMPAIGN_ID, type GivingTier } from "../../lib/giving";
import { notifyPledgeCreated } from "../../lib/giving/notifications";
import {
  forgetDonorDetails,
  getRememberedDonorDetails,
  rememberDonorDetails,
} from "../../lib/giving/rememberedDonor";
import { TIERS } from "../../lib/giving/tiers";
import { useFlowStep } from "./components/useFlowStep";
import { pledgePath, type TrackGivingState } from "./MyGiving";
import {
  AmountStep,
  DetailsStep,
  emptyDonorDetails,
  type AmountStepResult,
  type DonorDetails,
} from "./components/FlowSteps";
import { emptySchedule } from "./components/ScheduleFields";

// Amount and when → your details. Same steps for every tier. A returning
// giver (details saved on this device from an earlier pledge or Track
// giving) confirms straight from the amount page and skips the form.
export const IndividualGive = ({ tier: tierId }: { tier: GivingTier }): JSX.Element => {
  const tier = TIERS[tierId];
  const navigate = useNavigate();
  const [step, goTo, back] = useFlowStep<"amount" | "details">("amount");
  const [saved, setSaved] = useState(getRememberedDonorDetails);
  const [amountResult, setAmountResult] = useState<AmountStepResult | null>(null);
  const [details, setDetails] = useState<DonorDetails>(() => saved ?? emptyDonorDetails());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createPledge(donor: DonorDetails, chosen: AmountStepResult) {
    setSubmitting(true);
    setError(null);
    try {
      const pledge = await dataStore.createIndividualPledge({
        campaignId: DEFAULT_CAMPAIGN_ID,
        tier: tier.id,
        donorName: donor.name,
        donorEmail: donor.email,
        donorPhone: donor.phone,
        donorProfile: donor.profile,
        currency: chosen.currency,
        amount: chosen.amount,
        ngnRate: chosen.ngnRate,
        deadline: chosen.schedule.deadline,
        paymentPlan: chosen.schedule.paymentPlan,
        installments: chosen.schedule.installments,
      });
      rememberDonorDetails(donor);
      notifyPledgeCreated(pledge.id);
      navigate(pledgePath(pledge.id), { state: { justPledged: true } satisfies TrackGivingState });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSubmitting(false);
    }
  }

  if (step === "details") {
    return (
      <DetailsStep
        initial={details}
        onBack={back}
        submitLabel="Confirm my pledge"
        submitting={submitting}
        error={error}
        onContinue={(next) => {
          setDetails(next);
          if (amountResult) createPledge(next, amountResult);
        }}
      />
    );
  }

  return (
    <AmountStep
      title={tier.name}
      tier={tier}
      label="You give"
      initialAmount={amountResult?.amount ?? 0}
      initialCurrency={amountResult?.currency ?? "NGN"}
      initialSchedule={amountResult?.draft ?? emptySchedule()}
      backTo={`/give/${tier.slug}`}
      givingAs={saved ?? undefined}
      onNotYou={() => {
        forgetDonorDetails();
        setSaved(null);
        setDetails(emptyDonorDetails());
      }}
      submitLabel={saved ? "Confirm my pledge" : "Continue"}
      submitting={submitting}
      externalError={error}
      onContinue={(result) => {
        setAmountResult(result);
        if (saved) createPledge(saved, result);
        else goTo("details");
      }}
    />
  );
};
