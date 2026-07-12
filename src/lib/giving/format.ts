import { MAX_DEADLINE_MONTHS, UNIT_VALUE_NGN } from "./types";

export function formatNaira(amount: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
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

export function maxDeadlineIso(fromDate: Date = new Date()): string {
  const d = new Date(fromDate);
  d.setMonth(d.getMonth() + MAX_DEADLINE_MONTHS);
  return d.toISOString().slice(0, 10);
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-NG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
