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

// Only the ways to pay that take this currency. Every currency has
// Flutterwave and its own GTBank account.
export const PAYMENT_METHODS_BY_CURRENCY: Record<Currency, PaymentMethod[]> = {
  NGN: ["Paystack", "Flutterwave", "GTBank transfer"],
  USD: ["Paystack", "Flutterwave", "GTBank transfer", "Bank of America transfer", "Zelle"],
  GBP: ["Flutterwave", "GTBank transfer"],
  EUR: ["Flutterwave", "GTBank transfer"],
};

export const PAYING_WITH_SUMMARY: Record<Currency, { value: string; hint: string }> = {
  NGN: { value: "Card, transfer or USSD", hint: "Paystack, Flutterwave or GTBank transfer" },
  USD: { value: "Card, bank transfer or Zelle", hint: "Paystack, Flutterwave, GTBank, Bank of America or Zelle" },
  GBP: { value: "Card or bank transfer", hint: "Flutterwave or GTBank transfer" },
  EUR: { value: "Card or bank transfer", hint: "Flutterwave or GTBank transfer" },
};

export type NgnRates = Record<Currency, number>;

// Live exchange rates as the naira value of 1 unit of each currency, from
// open.er-api.com (free, no key, updated daily). Fetched once per page
// load; a failed fetch is retried on the next call.
const RATES_URL = "https://open.er-api.com/v6/latest/USD";
let ratesPromise: Promise<NgnRates> | null = null;

const LAST_RATES_KEY = "petra_ngn_rates_v1";

// Approximate rates (29 Sep 2026) used only if the rates service is down
// and this browser has never fetched one, so the progress bar still shows.
const BACKUP_NGN_RATES: NgnRates = { NGN: 1, USD: 1330, GBP: 1760, EUR: 1510 };

// Today's rates, or the last ones this browser fetched, or the backup above.
export async function getNgnRatesOrLast(): Promise<NgnRates> {
  try {
    return await getNgnRates();
  } catch {
    try {
      const saved = JSON.parse(localStorage.getItem(LAST_RATES_KEY) ?? "null");
      if (saved?.USD > 0) return saved as NgnRates;
    } catch {
      // Fall through to the backup.
    }
    return BACKUP_NGN_RATES;
  }
}

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
        const rates: NgnRates = { NGN: 1, USD: r.NGN, GBP: r.NGN / r.GBP, EUR: r.NGN / r.EUR };
        try {
          localStorage.setItem(LAST_RATES_KEY, JSON.stringify(rates));
        } catch {
          // Storage unavailable; the fallback just won't be there next time.
        }
        return rates;
      })
      .catch((err) => {
        ratesPromise = null;
        throw err;
      });
  }
  return ratesPromise;
}
