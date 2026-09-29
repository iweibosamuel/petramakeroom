import { LAST_DUE_DATE, UNIT_VALUE_NGN, type Currency } from "./types";

export function formatNaira(amount: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}

const MONEY_LOCALE: Record<Currency, string> = {
  NGN: "en-NG",
  USD: "en-US",
  GBP: "en-GB",
  EUR: "en-IE",
};

// Whole amounts in any giving currency: ₦50,000, $1,200, £900, €750.
export function formatMoney(amount: number, currency: Currency): string {
  return new Intl.NumberFormat(MONEY_LOCALE[currency], {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNairaWords(amount: number): string {
  if (amount > 0 && amount % 1_000_000_000 === 0) {
    const billions = amount / 1_000_000_000;
    return `₦ ${billions} BILLION`;
  }
  if (amount > 0 && amount % 1_000_000 === 0) {
    const millions = amount / 1_000_000;
    return `₦ ${millions} MILLION`;
  }
  return formatNaira(amount);
}

export function unitsToNaira(units: number): number {
  return Math.round(units * UNIT_VALUE_NGN);
}

export function nairaToUnits(naira: number): number {
  return naira / UNIT_VALUE_NGN;
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

// The latest date a payment can be scheduled for (see LAST_DUE_DATE).
export function maxDeadlineIso(): string {
  return LAST_DUE_DATE;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-NG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
