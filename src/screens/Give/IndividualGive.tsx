import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { dataStore, DEFAULT_CAMPAIGN_ID } from "../../lib/giving";
import { formatNaira, unitsToNaira } from "../../lib/giving/format";
import { getRememberedEmail, rememberEmail } from "../../lib/giving/rememberedDonor";
import { GiveShell } from "./components/GiveShell";
import {
  errorTextClass,
  inputClass,
  labelClass,
  primaryButtonClass,
} from "./components/fieldStyles";
import { PaymentPlanForm, type PaymentPlanFormResult } from "./components/PaymentPlanForm";

export const IndividualGive = (): JSX.Element => {
  const navigate = useNavigate();
  const [step, setStep] = useState<"details" | "payment">("details");
  const [donorName, setDonorName] = useState("");
  const [donorEmail, setDonorEmail] = useState(() => getRememberedEmail() ?? "");
  const [donorPhone, setDonorPhone] = useState("");
  const [unitsStr, setUnitsStr] = useState("1");
  const [error, setError] = useState<string | null>(null);

  const units = Number(unitsStr) || 0;
  const amountNaira = unitsToNaira(units);

  function handleContinue(e: React.FormEvent) {
    e.preventDefault();
    if (!donorName.trim() || !donorEmail.trim()) {
      setError("Please enter your name and contact email.");
      return;
    }
    if (units < 1) {
      setError("Minimum is 1 unit.");
      return;
    }
    setError(null);
    setStep("payment");
  }

  async function handlePaymentPlanSubmit(result: PaymentPlanFormResult) {
    const pledge = await dataStore.createIndividualPledge({
      campaignId: DEFAULT_CAMPAIGN_ID,
      donorName,
      donorEmail,
      donorPhone: donorPhone || undefined,
      units,
      deadline: result.deadline,
      paymentPlan: result.paymentPlan,
      installments: result.installments,
    });
    rememberEmail(donorEmail);
    navigate(`/give/schedule/${pledge.id}`);
  }

  if (step === "payment") {
    return (
      <GiveShell
        title="Your payment plan"
        subtitle={`Giving ${units} unit${units === 1 ? "" : "s"} — ${formatNaira(amountNaira)}`}
      >
        <button
          type="button"
          onClick={() => setStep("details")}
          className="mb-4 text-sm font-semibold text-slate-500 hover:text-slate-700"
        >
          ← Edit details
        </button>
        <PaymentPlanForm
          totalAmountNaira={amountNaira}
          onSubmit={handlePaymentPlanSubmit}
          submitLabel="Confirm my pledge"
        />
      </GiveShell>
    );
  }

  return (
    <GiveShell
      title="Give as an individual"
      subtitle="1 unit = ₦1,000,000. You can give any number of units."
      backTo="/give"
    >
      <form onSubmit={handleContinue} className="flex flex-col gap-5">
        <div>
          <label className={labelClass} htmlFor="units">
            Number of units
          </label>
          <input
            id="units"
            type="number"
            min={1}
            step={1}
            className={inputClass}
            value={unitsStr}
            onChange={(e) => setUnitsStr(e.target.value)}
            required
          />
          <p className="mt-1 text-sm font-semibold text-[#fa400f]">
            = {formatNaira(amountNaira)}
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
            value={donorName}
            onChange={(e) => setDonorName(e.target.value)}
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
            value={donorEmail}
            onChange={(e) => setDonorEmail(e.target.value)}
            required
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="phone">
            Phone (optional)
          </label>
          <input
            id="phone"
            type="tel"
            className={inputClass}
            value={donorPhone}
            onChange={(e) => setDonorPhone(e.target.value)}
          />
        </div>

        {error && <p className={errorTextClass}>{error}</p>}

        <button type="submit" className={primaryButtonClass}>
          Continue
        </button>
      </form>
    </GiveShell>
  );
};
