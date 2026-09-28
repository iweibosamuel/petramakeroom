import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { dataStore, DEFAULT_CAMPAIGN_ID, type GivingTier } from "../../lib/giving";
import { nairaToUnits } from "../../lib/giving/format";
import { rememberEmail } from "../../lib/giving/rememberedDonor";
import { TIERS } from "../../lib/giving/tiers";
import { GiveShell } from "./components/GiveShell";
import { useFlowStep } from "./components/useFlowStep";
import {
  AmountStep,
  DetailsStep,
  emptyDonorDetails,
  type DonorDetails,
} from "./components/FlowSteps";
import { PaymentPlanForm, type PaymentPlanFormResult } from "./components/PaymentPlanForm";

// Amount → your details → when. Same steps for every tier.
export const IndividualGive = ({ tier: tierId }: { tier: GivingTier }): JSX.Element => {
  const tier = TIERS[tierId];
  const navigate = useNavigate();
  const [step, goTo, back] = useFlowStep<"amount" | "details" | "payment">("amount");
  const [amountNaira, setAmountNaira] = useState(0);
  const [details, setDetails] = useState<DonorDetails>(emptyDonorDetails);

  async function handlePaymentPlanSubmit(result: PaymentPlanFormResult) {
    const pledge = await dataStore.createIndividualPledge({
      campaignId: DEFAULT_CAMPAIGN_ID,
      tier: tier.id,
      donorName: details.name,
      donorEmail: details.email,
      donorPhone: details.phone,
      donorProfile: details.profile,
      units: nairaToUnits(amountNaira),
      deadline: result.deadline,
      paymentPlan: result.paymentPlan,
      installments: result.installments,
    });
    rememberEmail(details.email);
    navigate(`/give/schedule/${pledge.id}`);
  }

  if (step === "payment") {
    return (
      <GiveShell title="When would you like to give?" onBack={back}>
        <PaymentPlanForm
          totalAmountNaira={amountNaira}
          onSubmit={handlePaymentPlanSubmit}
          submitLabel="Confirm my pledge"
        />
      </GiveShell>
    );
  }

  if (step === "details") {
    return (
      <DetailsStep
        initial={details}
        onBack={back}
        onContinue={(next) => {
          setDetails(next);
          goTo("payment");
        }}
      />
    );
  }

  return (
    <AmountStep
      title={tier.name}
      tier={tier}
      label="You give"
      minNaira={tier.minNaira}
      maxNaira={tier.maxNaira}
      initialAmountNaira={amountNaira}
      backTo={`/give/${tier.slug}`}
      onContinue={(amount) => {
        setAmountNaira(amount);
        goTo("details");
      }}
    />
  );
};
