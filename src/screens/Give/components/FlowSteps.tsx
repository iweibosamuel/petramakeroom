import { useEffect, useState, type ReactNode } from "react";
import { HandHeart, Shield, Wallet } from "lucide-react";
import { CURRENCIES, type Currency, type DonorProfile } from "../../../lib/giving";
import {
  CURRENCY_LABELS,
  CURRENCY_SYMBOLS,
  PAYING_WITH_SUMMARY,
  getNgnRates,
  type NgnRates,
} from "../../../lib/giving/currency";
import { formatMoney } from "../../../lib/giving/format";
import { getRememberedEmail } from "../../../lib/giving/rememberedDonor";
import { PETRA_CAMPUSES, type TierConfig } from "../../../lib/giving/tiers";
import { GiveShell } from "./GiveShell";
import { DetailRow, Divider, StickyAction, fitAmountStyle, optionCardClass } from "./FlowParts";
import { errorTextClass, inputClass, labelClass, primaryButtonClass } from "./fieldStyles";
import {
  ScheduleFields,
  buildSchedule,
  type ScheduleDraft,
  type ScheduleResult,
} from "./ScheduleFields";

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// At least 7 digits, allowing spaces, dashes, brackets and a leading +.
export function isValidPhone(value: string): boolean {
  return /^\+?[\d\s()-]+$/.test(value.trim()) && value.replace(/\D/g, "").length >= 7;
}

function parseAmountInput(value: string): number {
  return Number(value.replace(/[^\d]/g, "")) || 0;
}

export interface AmountStepResult {
  amount: number;
  currency: Currency;
  ngnRate: number;
  schedule: ScheduleResult;
  draft: ScheduleDraft;
}

interface AmountStepProps {
  title: string;
  subtitle?: ReactNode;
  tier: TierConfig;
  label: string;
  initialAmount: number;
  initialCurrency: Currency;
  initialSchedule: ScheduleDraft;
  backTo?: string;
  onBack?: () => void;
  onContinue: (result: AmountStepResult) => void;
}

// First step of every flow: the amount, in the currency the giver chooses,
// and when it'll be paid, on the same page. Tier limits are set in naira and
// converted at today's rate for other currencies.
export const AmountStep = ({
  title,
  subtitle,
  tier,
  label,
  initialAmount,
  initialCurrency,
  initialSchedule,
  backTo,
  onBack,
  onContinue,
}: AmountStepProps): JSX.Element => {
  const [currency, setCurrency] = useState<Currency>(initialCurrency);
  const [rates, setRates] = useState<NgnRates | null>(null);
  const [ratesError, setRatesError] = useState(false);
  const rate = currency === "NGN" ? 1 : rates?.[currency];

  useEffect(() => {
    if (currency === "NGN" || rates) return;
    let cancelled = false;
    setRatesError(false);
    getNgnRates()
      .then((r) => !cancelled && setRates(r))
      .catch(() => !cancelled && setRatesError(true));
    return () => {
      cancelled = true;
    };
  }, [currency, rates]);

  const hasMinimum = tier.minNaira > 1;
  // A naira figure in the chosen currency. Other currencies round up to the
  // nearest 10 (₦10m ≈ $7,549.41 → $7,550), so a converted minimum never
  // falls below the naira one.
  const fromNaira = (naira: number): number | undefined =>
    !rate ? undefined : currency === "NGN" ? naira : Math.ceil(naira / rate / 10) * 10;
  const minAmount = hasMinimum ? fromNaira(tier.minNaira) : rate ? 1 : undefined;
  const maxAmount = tier.maxNaira ? fromNaira(tier.maxNaira) : undefined;
  const quickPicks = rate && tier.quickAmountsNaira ? tier.quickAmountsNaira.map((n) => fromNaira(n)!) : [];

  // Tiers with a minimum (Centurion) start at that minimum, so the amount is
  // never below it unless the giver is mid-edit.
  const [amount, setAmount] = useState(() => initialAmount || (hasMinimum && initialCurrency === "NGN" ? tier.minNaira : 0));
  const [schedule, setSchedule] = useState(initialSchedule);
  const [error, setError] = useState<string | null>(null);
  const symbol = CURRENCY_SYMBOLS[currency];
  const amountText = amount ? amount.toLocaleString("en-NG") : "";
  const belowMinimum = hasMinimum && minAmount !== undefined && amount > 0 && amount < minAmount;
  const aboveMaximum = maxAmount !== undefined && amount > maxAmount;
  const canContinue = Boolean(rate) && amount > 0 && !belowMinimum && !aboveMaximum;

  // A Centurion giver switching currency starts at the new minimum.
  useEffect(() => {
    if (hasMinimum && minAmount !== undefined && amount === 0) setAmount(minAmount);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minAmount]);

  function changeCurrency(next: Currency) {
    if (next === currency) return;
    setCurrency(next);
    setAmount(0);
    setError(null);
  }

  // Leaving the field with an out-of-range amount snaps it back into range.
  function clampAmount() {
    if (belowMinimum && minAmount !== undefined) setAmount(minAmount);
    else if (aboveMaximum && maxAmount !== undefined) setAmount(maxAmount);
  }

  function rangeText(): string {
    if (minAmount === undefined) return "";
    const range = maxAmount
      ? `${formatMoney(minAmount, currency)} to ${formatMoney(maxAmount, currency)}`
      : `Minimum ${formatMoney(minAmount, currency)}`;
    return range;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!rate) {
      setError("We couldn't load this currency right now. Please try again, or give in naira.");
      return;
    }
    if (amount <= 0) {
      setError("Please enter the amount you'd like to give.");
      return;
    }
    if (minAmount !== undefined && amount < minAmount) {
      setError(`${tier.name} seeds start at ${formatMoney(minAmount, currency)}.`);
      return;
    }
    if (maxAmount !== undefined && amount > maxAmount) {
      setError(`${tier.name} seeds go up to ${formatMoney(maxAmount, currency)}.`);
      return;
    }
    const built = buildSchedule(amount, currency, schedule);
    if ("error" in built) {
      setError(built.error);
      return;
    }
    setError(null);
    onContinue({ amount, currency, ngnRate: rate, schedule: built.result, draft: schedule });
  }

  const paying = PAYING_WITH_SUMMARY[currency];

  return (
    <GiveShell title={title} subtitle={subtitle} backTo={backTo} onBack={onBack}>
      <form onSubmit={handleSubmit} className="flex flex-1 flex-col">

        <label htmlFor="amount" className="text-base text-slate-500">
          {label}
        </label>
        <div className="mt-2 [container-type:inline-size]">
          <div
            className="flex items-baseline whitespace-nowrap font-drum font-bold leading-none text-black"
            style={fitAmountStyle(`${symbol}${amountText || "0"}`)}
          >
            <span aria-hidden="true">{symbol}</span>
            <input
              id="amount"
              type="text"
              inputMode="numeric"
              autoFocus
              placeholder="0"
              className="w-full min-w-0 bg-transparent placeholder:text-black/20 focus:outline-none"
              value={amountText}
              onChange={(e) => {
                setError(null);
                setAmount(parseAmountInput(e.target.value));
              }}
              onBlur={clampAmount}
              aria-describedby="amount-note"
              aria-invalid={belowMinimum || aboveMaximum}
            />
          </div>
        </div>
        <fieldset className="mt-6">
          <legend className="text-base text-slate-500">Currency</legend>
          <div className="mt-2 grid grid-cols-4 gap-2">
            {CURRENCIES.map((c) => {
              const selected = c === currency;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => changeCurrency(c)}
                  aria-pressed={selected}
                  title={CURRENCY_LABELS[c]}
                  className={`flex h-12 items-center justify-center gap-1.5 rounded-full text-sm font-bold transition-colors ${
                    selected ? "bg-black text-white" : "bg-black/[0.06] text-black hover:bg-black/10"
                  }`}
                >
                  <span aria-hidden="true">{CURRENCY_SYMBOLS[c]}</span>
                  {c}
                </button>
              );
            })}
          </div>
        </fieldset>
        <div id="amount-note" className="mt-3 flex flex-col gap-1 text-sm font-semibold">
          {/* The rate itself isn't shown; it's only used behind the scenes
              for tier limits and the campaign total. */}
          {currency !== "NGN" && (ratesError || !rate) && (
            <p className={ratesError ? "text-red-600" : "text-slate-500"}>
              {ratesError
                ? "We couldn't load this currency right now. Check your connection, or give in naira."
                : "Loading…"}
            </p>
          )}
          {hasMinimum && rate && (
            <p className={belowMinimum || aboveMaximum ? "text-red-600" : "text-slate-500"}>
              {belowMinimum && minAmount !== undefined
                ? `${tier.name} seeds start at ${formatMoney(minAmount, currency)}`
                : aboveMaximum && maxAmount !== undefined
                  ? `${tier.name} seeds go up to ${formatMoney(maxAmount, currency)}`
                  : rangeText()}
            </p>
          )}
        </div>

        {hasMinimum && quickPicks.length > 0 && (
          <fieldset className="mt-8">
            <legend className="text-sm text-slate-500">Quick pick</legend>
            <div
              className={`mt-3 grid gap-2 ${currency === "NGN" ? "grid-cols-5" : "grid-cols-3 sm:grid-cols-5"}`}
            >
              {quickPicks.map((quick) => {
                const selected = quick === amount;
                return (
                  <button
                    key={quick}
                    type="button"
                    onClick={() => setAmount(quick)}
                    aria-pressed={selected}
                    className={`h-12 rounded-full text-[13px] font-bold transition-colors sm:text-sm ${
                      selected ? "text-white" : "bg-black/[0.06] text-black hover:bg-black/10"
                    }`}
                    style={selected ? { backgroundColor: tier.accent } : undefined}
                  >
                    {currency === "NGN" ? `₦${quick / 1_000_000}m` : formatMoney(quick, currency)}
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}

        <div className="mt-8">
          <ScheduleFields
            totalAmount={amount}
            currency={currency}
            value={schedule}
            onChange={(next) => {
              setError(null);
              setSchedule(next);
            }}
          />
        </div>

        <div className="mt-8">
          <Divider />
          <DetailRow
            icon={tier.id === "centurion" ? <Shield /> : <HandHeart />}
            label="Giving as"
            value={tier.name}
            hint={hasMinimum ? tier.amountHint : "Any amount, as you are led"}
          />
          <Divider />
          <DetailRow icon={<Wallet />} label="Payment methods" value={paying.value} hint={paying.hint} />
          <Divider />
        </div>

        {error && <p className={errorTextClass}>{error}</p>}

        <StickyAction>
          <button type="submit" className={primaryButtonClass} disabled={!canContinue}>
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
  backTo?: string;
  onBack?: () => void;
  onContinue: (details: DonorDetails) => void;
}

// First step of every flow: who the giver is. Every field is required.
export const DetailsStep = ({
  title = "Your details",
  subtitle = "So we can send your giving schedule and receipts.",
  initial,
  submitLabel = "Continue",
  submitting = false,
  error: externalError,
  backTo,
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
    if (!EMAIL_PATTERN.test(email.trim())) {
      setError("Please check your email address.");
      return;
    }
    if (!isValidPhone(phone)) {
      setError("Please enter a valid phone number.");
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
    <GiveShell title={title} subtitle={subtitle} backTo={backTo} onBack={onBack}>
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
