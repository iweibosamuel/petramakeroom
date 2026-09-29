import type { Currency, PaymentMethod } from "./types";

export const CURRENCY_LABELS: Record<Currency, string> = {
  NGN: "Naira (₦)",
  USD: "US dollars ($)",
  GBP: "Pounds (£)",
  EUR: "Euros (€)",
};

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  NGN: "₦",
  USD: "$",
  GBP: "£",
  EUR: "€",
};

// Only the ways to pay that take this currency. Pounds and euros go through
// Flutterwave's international card checkout; there are no GBP/EUR accounts.
export const PAYMENT_METHODS_BY_CURRENCY: Record<Currency, PaymentMethod[]> = {
  NGN: ["Paystack", "GTBank transfer"],
  USD: ["Flutterwave", "Bank of America transfer", "Zelle"],
  GBP: ["Flutterwave"],
  EUR: ["Flutterwave"],
};

export const PAYING_WITH_SUMMARY: Record<Currency, { value: string; hint: string }> = {
  NGN: { value: "Card, transfer or USSD", hint: "Paystack or GTBank transfer" },
  USD: { value: "Card, bank transfer or Zelle", hint: "Flutterwave, Bank of America or Zelle" },
  GBP: { value: "Card", hint: "Flutterwave international checkout" },
  EUR: { value: "Card", hint: "Flutterwave international checkout" },
};

export type NgnRates = Record<Currency, number>;

// Live exchange rates as the naira value of 1 unit of each currency, from
// open.er-api.com (free, no key, updated daily). Fetched once per page
// load; a failed fetch is retried on the next call.
const RATES_URL = "https://open.er-api.com/v6/latest/USD";
let ratesPromise: Promise<NgnRates> | null = null;

export function getNgnRates(): Promise<NgnRates> {
  if (!ratesPromise) {
    ratesPromise = fetch(RATES_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`Exchange rates unavailable (${res.status})`);
        return res.json();
      })
      .then((data: { result?: string; rates?: Record<string, number> }) => {
        const r = data.rates;
        if (data.result !== "success" || !r?.NGN || !r.GBP || !r.EUR) {
          throw new Error("Exchange rates unavailable");
        }
        return { NGN: 1, USD: r.NGN, GBP: r.NGN / r.GBP, EUR: r.NGN / r.EUR };
      })
      .catch((err) => {
        ratesPromise = null;
        throw err;
      });
  }
  return ratesPromise;
}
