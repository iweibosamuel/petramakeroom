import { useState, type ReactNode } from "react";
import { HandHeart, Shield } from "lucide-react";
import type { DonorProfile } from "../../../lib/giving";
import { formatNaira } from "../../../lib/giving/format";
import { getRememberedEmail } from "../../../lib/giving/rememberedDonor";
import { PETRA_CAMPUSES, type TierConfig } from "../../../lib/giving/tiers";
import { GiveShell } from "./GiveShell";
import { DetailRow, Divider, StickyAction, fitAmountStyle, optionCardClass } from "./FlowParts";
import { errorTextClass, inputClass, labelClass, primaryButtonClass } from "./fieldStyles";

function parseNairaInput(value: string): number {
  return Number(value.replace(/[^\d]/g, "")) || 0;
}

interface AmountStepProps {
  title: string;
  subtitle?: ReactNode;
  tier: TierConfig;
  label: string;
  minNaira: number;
  maxNaira?: number;
  initialAmountNaira: number;
  backTo?: string;
  onBack?: () => void;
  onContinue: (amountNaira: number) => void;
}

// Step 1 of every flow: one big amount, typed in naira.
export const AmountStep = ({
  title,
  subtitle,
  tier,
  label,
  minNaira,
  maxNaira,
  initialAmountNaira,
  backTo,
  onBack,
  onContinue,
}: AmountStepProps): JSX.Element => {
  const [amountNaira, setAmountNaira] = useState(initialAmountNaira);
  const [error, setError] = useState<string | null>(null);
  const amountText = amountNaira ? amountNaira.toLocaleString("en-NG") : "";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (amountNaira <= 0) {
      setError("Please enter the amount you'd like to give.");
      return;
    }
    if (amountNaira < minNaira) {
      setError(`${tier.name} seeds start at ${formatNaira(minNaira)}.`);
      return;
    }
    if (maxNaira && amountNaira > maxNaira) {
      setError(`${tier.name} seeds go up to ${formatNaira(maxNaira)}.`);
      return;
    }
    setError(null);
    onContinue(amountNaira);
  }

  return (
    <GiveShell title={title} subtitle={subtitle} backTo={backTo} onBack={onBack}>
      <form onSubmit={handleSubmit} className="flex flex-1 flex-col">
        <div className="flex items-center justify-between">
          <label htmlFor="amount" className="text-base text-slate-500">
            {label}
          </label>
          <span className="rounded-full bg-black/[0.06] px-3 py-1.5 text-sm font-bold text-black">
            NGN
          </span>
        </div>
        <div className="mt-4 [container-type:inline-size]">
          <div
            className="flex items-baseline whitespace-nowrap font-drum font-bold leading-none text-black"
            style={fitAmountStyle(`₦${amountText || "0"}`)}
          >
            <span aria-hidden="true">₦</span>
            <input
              id="amount"
              type="text"
              inputMode="numeric"
              autoFocus
              placeholder="0"
              className="w-full min-w-0 bg-transparent placeholder:text-black/20 focus:outline-none"
              value={amountText}
              onChange={(e) => setAmountNaira(parseNairaInput(e.target.value))}
            />
          </div>
        </div>

        {minNaira > 1 && tier.quickAmountsNaira && (
          <fieldset className="mt-8">
            <legend className="text-sm text-slate-500">Quick pick</legend>
            <div className="mt-3 grid grid-cols-5 gap-2">
              {tier.quickAmountsNaira.map((amount) => {
                const selected = amount === amountNaira;
                return (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => setAmountNaira(amount)}
                    aria-pressed={selected}
                    className={`h-12 rounded-full text-[13px] font-bold transition-colors sm:text-sm ${
                      selected ? "text-white" : "bg-black/[0.06] text-black hover:bg-black/10"
                    }`}
                    style={selected ? { backgroundColor: tier.accent } : undefined}
                  >
                    ₦{amount / 1_000_000}m
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}

        <div className="mt-8">
          <Divider />
          <DetailRow
            icon={tier.id === "centurion" ? <Shield /> : <HandHeart />}
            label="Giving as"
            value={tier.name}
            hint={minNaira > 1 ? tier.amountHint : "Any amount, as you are led"}
          />
          <Divider />
        </div>

        {error && <p className={errorTextClass}>{error}</p>}

        <StickyAction>
          <button type="submit" className={primaryButtonClass}>
            Continue
          </button>
        </StickyAction>
      </form>
    </GiveShell>
  );
};

export interface DonorDetails {
  name: string;
  email: string;
  phone: string;
  profile: DonorProfile;
}

export function emptyDonorDetails(): DonorDetails {
  return {
    name: "",
    email: getRememberedEmail() ?? "",
    phone: "",
    profile: { location: "", isPetraMember: false, campus: undefined },
  };
}

interface DetailsStepProps {
  title?: string;
  subtitle?: ReactNode;
  initial: DonorDetails;
  submitLabel?: string;
  submitting?: boolean;
  error?: string | null;
  onBack: () => void;
  onContinue: (details: DonorDetails) => void;
}

// Step 2 of every flow: who the giver is.
export const DetailsStep = ({
  title = "Your details",
  subtitle = "So we can send your giving schedule and receipts.",
  initial,
  submitLabel = "Continue",
  submitting = false,
  error: externalError,
  onBack,
  onContinue,
}: DetailsStepProps): JSX.Element => {
  const [name, setName] = useState(initial.name);
  const [email, setEmail] = useState(initial.email);
  const [phone, setPhone] = useState(initial.phone);
  const [location, setLocation] = useState(initial.profile.location);
  const [isPetraMember, setIsPetraMember] = useState<boolean | null>(
    initial.profile.location ? initial.profile.isPetraMember : null,
  );
  // Campus must come from the official list.
  const [campus, setCampus] = useState(
    initial.profile.campus && PETRA_CAMPUSES.includes(initial.profile.campus)
      ? initial.profile.campus
      : "",
  );
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !phone.trim()) {
      setError("Please enter your name, email and phone number.");
      return;
    }
    if (!location.trim()) {
      setError("Please tell us where you're based.");
      return;
    }
    if (isPetraMember === null) {
      setError("Please let us know if you're a Petra member.");
      return;
    }
    if (isPetraMember && !PETRA_CAMPUSES.includes(campus)) {
      setError("Please choose the campus you attend.");
      return;
    }
    setError(null);
    onContinue({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      profile: {
        location: location.trim(),
        isPetraMember,
        campus: isPetraMember ? campus : undefined,
      },
    });
  }

  const shownError = error ?? externalError;

  return (
    <GiveShell title={title} subtitle={subtitle} onBack={onBack}>
      <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-5">
        <div>
          <label className={labelClass} htmlFor="name">
            Full name
          </label>
          <input
            id="name"
            type="text"
            autoComplete="name"
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
            autoComplete="email"
            className={inputClass}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="phone">
            Phone number
          </label>
          <input
            id="phone"
            type="tel"
            autoComplete="tel"
            placeholder="e.g. 0803 000 0000"
            className={inputClass}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="location">
            Where are you based?
          </label>
          <input
            id="location"
            type="text"
            autoComplete="address-level2"
            placeholder="City and country, e.g. Lekki, Lagos"
            className={inputClass}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            required
          />
        </div>

        <fieldset>
          <legend className={labelClass}>Are you a Petra member?</legend>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {[
              { value: true, label: "Yes" },
              { value: false, label: "No" },
            ].map((option) => (
              <button
                key={option.label}
                type="button"
                onClick={() => setIsPetraMember(option.value)}
                aria-pressed={isPetraMember === option.value}
                className={`${optionCardClass(isPetraMember === option.value)} !py-3 text-center font-bold text-black`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </fieldset>

        {isPetraMember && (
          <div>
            <label className={labelClass} htmlFor="campus">
              Which campus do you attend?
            </label>
            <select
              id="campus"
              className={`${inputClass} appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2220%22 height=%2220%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22black%22 stroke-width=%222%22><path d=%22m6 9 6 6 6-6%22/></svg>')] bg-[length:20px] bg-[right_1rem_center] bg-no-repeat pr-12`}
              value={campus}
              onChange={(e) => setCampus(e.target.value)}
              required
            >
              <option value="" disabled>
                Choose a campus
              </option>
              {PETRA_CAMPUSES.map((campus) => (
                <option key={campus} value={campus}>
                  {campus}
                </option>
              ))}
            </select>
          </div>
        )}

        {shownError && <p className={errorTextClass}>{shownError}</p>}

        <StickyAction>
          <button type="submit" className={primaryButtonClass} disabled={submitting}>
            {submitting ? "Saving…" : submitLabel}
          </button>
        </StickyAction>
      </form>
    </GiveShell>
  );
};
