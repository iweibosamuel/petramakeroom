import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, X } from "lucide-react";
import { dataStore, DEFAULT_CAMPAIGN_ID, type GivingTier } from "../../lib/giving";
import { formatNaira } from "../../lib/giving/format";
import { notifyGroupMembers } from "../../lib/giving/notifications";
import { rememberEmail } from "../../lib/giving/rememberedDonor";
import { TIERS } from "../../lib/giving/tiers";
import { GiveShell } from "./components/GiveShell";
import { BigAmount, StickyAction } from "./components/FlowParts";
import {
  AmountStep,
  DetailsStep,
  emptyDonorDetails,
  type DonorDetails,
} from "./components/FlowSteps";
import { PaymentPlanForm, type PaymentPlanFormResult } from "./components/PaymentPlanForm";
import {
  errorTextClass,
  inputClass,
  labelClass,
  primaryButtonClass,
} from "./components/fieldStyles";

interface MemberDraft {
  key: string;
  name: string;
  email: string;
  phone: string;
  amountNaira: number;
}

let draftKey = 0;
const newMember = (): MemberDraft => ({
  key: `m${++draftKey}`,
  name: "",
  email: "",
  phone: "",
  amountNaira: 0,
});

function parseNairaInput(value: string): number {
  return Number(value.replace(/[^\d]/g, "")) || 0;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// A group seed is one amount given together by several people.
// Amount → your details → who's giving (and how much each) → when.
// Everyone listed gets an email with their share; anyone can pay the total.
export const GroupCreate = ({ tier: tierId }: { tier: GivingTier }): JSX.Element => {
  const tier = TIERS[tierId];
  const navigate = useNavigate();
  const [step, setStep] = useState<"amount" | "details" | "members" | "payment">("amount");
  const [totalNaira, setTotalNaira] = useState(0);
  const [details, setDetails] = useState<DonorDetails>(emptyDonorDetails);
  const [organizerShare, setOrganizerShare] = useState(0);
  const [members, setMembers] = useState<MemberDraft[]>(() => [newMember()]);
  const [error, setError] = useState<string | null>(null);

  const sharesTotal = organizerShare + members.reduce((sum, m) => sum + m.amountNaira, 0);

  function updateMember(key: string, patch: Partial<MemberDraft>) {
    setMembers((rows) => rows.map((m) => (m.key === key ? { ...m, ...patch } : m)));
  }

  function splitEvenly() {
    const people = members.length + 1;
    const each = Math.floor(totalNaira / people);
    // Any remainder from rounding goes to the organiser.
    setOrganizerShare(totalNaira - each * members.length);
    setMembers((rows) => rows.map((m) => ({ ...m, amountNaira: each })));
  }

  function handleMembersContinue(e: React.FormEvent) {
    e.preventDefault();
    if (members.length === 0) {
      setError("Add at least one other person, or give as an individual instead.");
      return;
    }
    for (const [index, m] of members.entries()) {
      const who = m.name.trim() || `Person ${index + 2}`;
      if (!m.name.trim() || !m.email.trim() || !m.phone.trim()) {
        setError(`Please add a name, email and phone number for ${who}.`);
        return;
      }
      if (!EMAIL_PATTERN.test(m.email.trim())) {
        setError(`Please check the email address for ${who}.`);
        return;
      }
    }
    if (organizerShare <= 0 || members.some((m) => m.amountNaira <= 0)) {
      setError("Everyone needs an amount greater than ₦0.");
      return;
    }
    if (sharesTotal !== totalNaira) {
      setError(
        `Everyone's amounts need to add up to ${formatNaira(totalNaira)}. They currently add up to ${formatNaira(sharesTotal)}.`,
      );
      return;
    }
    setError(null);
    setStep("payment");
  }

  async function handlePaymentPlanSubmit(result: PaymentPlanFormResult) {
    const { pledge } = await dataStore.createGroupPledge({
      campaignId: DEFAULT_CAMPAIGN_ID,
      tier: tier.id,
      organizerName: details.name,
      organizerEmail: details.email,
      organizerPhone: details.phone,
      organizerProfile: details.profile,
      members: [
        {
          name: details.name,
          email: details.email,
          phone: details.phone,
          amountNaira: organizerShare,
        },
        ...members.map((m) => ({
          name: m.name.trim(),
          email: m.email.trim(),
          phone: m.phone.trim(),
          amountNaira: m.amountNaira,
        })),
      ],
      deadline: result.deadline,
      paymentPlan: result.paymentPlan,
      installments: result.installments,
    });
    rememberEmail(details.email);
    notifyGroupMembers(pledge.id);
    navigate(`/give/schedule/${pledge.id}`);
  }

  if (step === "payment") {
    return (
      <GiveShell title="When will your group give?" onBack={() => setStep("members")}>
        <PaymentPlanForm
          totalAmountNaira={totalNaira}
          amountLabel="Your group is giving"
          onSubmit={handlePaymentPlanSubmit}
          submitLabel="Confirm group seed"
        />
      </GiveShell>
    );
  }

  if (step === "members") {
    const matches = sharesTotal === totalNaira;
    return (
      <GiveShell
        title="Who's giving?"
        subtitle="Add everyone giving with you and how much each person is covering. We'll email each person their amount."
        onBack={() => setStep("details")}
      >
        <form onSubmit={handleMembersContinue} className="flex flex-1 flex-col">
          <p className="text-base text-slate-500">Your group's total</p>
          <div className="mt-2">
            <BigAmount text={formatNaira(totalNaira)} />
          </div>

          <div className="mt-6 flex items-center justify-between">
            <p
              className={`text-sm font-semibold ${matches ? "text-emerald-700" : "text-slate-500"}`}
            >
              {formatNaira(sharesTotal)} of {formatNaira(totalNaira)} assigned
            </p>
            <button
              type="button"
              onClick={splitEvenly}
              className="shrink-0 whitespace-nowrap rounded-full bg-black/[0.06] px-3 py-1.5 text-xs font-bold text-black hover:bg-black/10"
            >
              Split evenly
            </button>
          </div>

          <div className="mt-3 flex flex-col gap-3">
            <div className="rounded-2xl bg-black/[0.05] p-4">
              <p className="text-sm text-slate-500">You · organiser</p>
              <p className="text-lg font-bold text-black">{details.name}</p>
              <label className={`${labelClass} mt-3`} htmlFor="organizer-amount">
                Your amount (₦)
              </label>
              <input
                id="organizer-amount"
                type="text"
                inputMode="numeric"
                placeholder="0"
                className={`${inputClass} !bg-white`}
                value={organizerShare ? organizerShare.toLocaleString("en-NG") : ""}
                onChange={(e) => setOrganizerShare(parseNairaInput(e.target.value))}
                required
              />
            </div>

            {members.map((member, index) => (
              <fieldset key={member.key} className="rounded-2xl bg-black/[0.05] p-4">
                <div className="flex items-center justify-between">
                  <legend className="text-sm text-slate-500">Person {index + 2}</legend>
                  <button
                    type="button"
                    onClick={() => setMembers((rows) => rows.filter((m) => m.key !== member.key))}
                    aria-label={`Remove person ${index + 2}`}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-black/5 hover:text-red-600"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="flex flex-col gap-3">
                  <input
                    type="text"
                    aria-label={`Person ${index + 2} full name`}
                    placeholder="Full name"
                    autoComplete="off"
                    className={`${inputClass} !bg-white`}
                    value={member.name}
                    onChange={(e) => updateMember(member.key, { name: e.target.value })}
                    required
                  />
                  <input
                    type="email"
                    aria-label={`Person ${index + 2} email`}
                    placeholder="Email"
                    autoComplete="off"
                    className={`${inputClass} !mt-0 !bg-white`}
                    value={member.email}
                    onChange={(e) => updateMember(member.key, { email: e.target.value })}
                    required
                  />
                  <input
                    type="tel"
                    aria-label={`Person ${index + 2} phone number`}
                    placeholder="Phone number"
                    autoComplete="off"
                    className={`${inputClass} !mt-0 !bg-white`}
                    value={member.phone}
                    onChange={(e) => updateMember(member.key, { phone: e.target.value })}
                    required
                  />
                  <input
                    type="text"
                    inputMode="numeric"
                    aria-label={`Person ${index + 2} amount in naira`}
                    placeholder="Amount (₦)"
                    className={`${inputClass} !mt-0 !bg-white`}
                    value={member.amountNaira ? member.amountNaira.toLocaleString("en-NG") : ""}
                    onChange={(e) =>
                      updateMember(member.key, { amountNaira: parseNairaInput(e.target.value) })
                    }
                    required
                  />
                </div>
              </fieldset>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setMembers((rows) => [...rows, newMember()])}
            className="mt-3 flex h-12 items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-black/15 text-sm font-bold text-black hover:border-black/30"
          >
            <Plus className="h-4 w-4" /> Add another person
          </button>

          {error && <p className={errorTextClass}>{error}</p>}

          <StickyAction>
            <button type="submit" className={primaryButtonClass}>
              Continue
            </button>
          </StickyAction>
        </form>
      </GiveShell>
    );
  }

  if (step === "details") {
    return (
      <DetailsStep
        subtitle="You're organising this group seed. Next, you'll add everyone giving with you."
        initial={details}
        onBack={() => setStep("amount")}
        onContinue={(next) => {
          setDetails(next);
          setStep("members");
        }}
      />
    );
  }

  return (
    <AmountStep
      title="Give as a group"
      subtitle="One seed, given together. Enter the total your group is giving."
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
