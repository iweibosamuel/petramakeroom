import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { dataStore, DEFAULT_CAMPAIGN_ID, type Currency, type GivingTier } from "../../lib/giving";
import { notifyPledgeCreated } from "../../lib/giving/notifications";
import { rememberEmail } from "../../lib/giving/rememberedDonor";
import { TIERS } from "../../lib/giving/tiers";
import { useFlowStep } from "./components/useFlowStep";
import {
  AmountStep,
  DetailsStep,
  emptyDonorDetails,
  type DonorDetails,
} from "./components/FlowSteps";
import { emptySchedule, type ScheduleDraft, type ScheduleResult } from "./components/ScheduleFields";

// Amount and when → your details. Same steps for every tier.
export const IndividualGive = ({ tier: tierId }: { tier: GivingTier }): JSX.Element => {
  const tier = TIERS[tierId];
  const navigate = useNavigate();
  const [step, goTo, back] = useFlowStep<"amount" | "details">("amount");
  const [amount, setAmount] = useState(0);
  const [currency, setCurrency] = useState<Currency>("NGN");
  const [ngnRate, setNgnRate] = useState(1);
  const [scheduleDraft, setScheduleDraft] = useState<ScheduleDraft>(emptySchedule);
  const [schedule, setSchedule] = useState<ScheduleResult | null>(null);
  const [details, setDetails] = useState<DonorDetails>(emptyDonorDetails);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDetailsContinue(next: DonorDetails) {
    setDetails(next);
    if (!schedule) return;
    setSubmitting(true);
    setError(null);
    try {
      const pledge = await dataStore.createIndividualPledge({
        campaignId: DEFAULT_CAMPAIGN_ID,
        tier: tier.id,
        donorName: next.name,
        donorEmail: next.email,
        donorPhone: next.phone,
        donorProfile: next.profile,
        currency,
        amount,
        ngnRate,
        deadline: schedule.deadline,
        paymentPlan: schedule.paymentPlan,
        installments: schedule.installments,
      });
      rememberEmail(next.email);
      notifyPledgeCreated(pledge.id);
      navigate(`/give/schedule/${pledge.id}`);
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
        onContinue={handleDetailsContinue}
      />
    );
  }

  return (
    <AmountStep
      title={tier.name}
      tier={tier}
      label="You give"
      initialAmount={amount}
      initialCurrency={currency}
      initialSchedule={scheduleDraft}
      backTo={`/give/${tier.slug}`}
      onContinue={(result) => {
        setAmount(result.amount);
        setCurrency(result.currency);
        setNgnRate(result.ngnRate);
        setSchedule(result.schedule);
        setScheduleDraft(result.draft);
        goTo("details");
      }}
    />
  );
};
