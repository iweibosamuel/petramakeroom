import { useState } from "react";
import { ArrowUpRight, Check, Copy, CreditCard, Globe, Landmark, Mail } from "lucide-react";
import type { Currency } from "../../../lib/giving";
import { DetailRow, Divider, pillButtonClass } from "./FlowParts";

interface CopyField {
  label: string;
  value: string;
}

interface OnlinePayment {
  label: string;
  currencies: Currency[];
  description: string;
  href: string;
  icon: JSX.Element;
}

interface BankAccount {
  label: string;
  accountCurrency: Currency;
  currency: string;
  fields: CopyField[];
}

const onlinePayments: OnlinePayment[] = [
  {
    label: "Paystack",
    currencies: ["NGN"],
    description: "Naira cards, bank transfer and USSD",
    href: "https://paystack.shop/pay/aami",
    icon: <CreditCard />,
  },
  {
    label: "Flutterwave",
    currencies: ["USD", "GBP", "EUR"],
    description: "International cards",
    href: "https://www.flutterwave.com/pay/international-giving",
    icon: <Globe />,
  },
];

const bankAccounts: BankAccount[] = [
  {
    label: "GTBank",
    accountCurrency: "NGN",
    currency: "Naira (₦)",
    fields: [
      { label: "Account Name", value: "PETRA CHRISTIAN CENTRE PROGRAM" },
      { label: "Account Number", value: "0558726334" },
      { label: "Transfer Description", value: "Make Room Giving" },
    ],
  },
  {
    label: "Bank of America",
    accountCurrency: "USD",
    currency: "USD ($)",
    fields: [
      { label: "Account Name", value: "Petra Christian Centre" },
      { label: "Account Number", value: "488135397734" },
      { label: "Routing (Paper & Electronic)", value: "111000025" },
      { label: "Routing (Wires)", value: "026009593" },
    ],
  },
];

const zelleEmail = "Finance@petracc.org";

const sectionHeadingClass = "mb-1 text-sm text-slate-500";

// Only the ways to pay that take the pledge's currency (see
// PAYMENT_METHODS_BY_CURRENCY): naira via Paystack or GTBank; dollars via
// Flutterwave, Bank of America or Zelle; pounds and euros via Flutterwave.
export const PaymentMethods = ({ currency }: { currency: Currency }): JSX.Element => {
  const online = onlinePayments.filter((p) => p.currencies.includes(currency));
  const accounts = bankAccounts.filter((a) => a.accountCurrency === currency);
  const showZelle = currency === "USD";

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  function copy(key: string, value: string) {
    navigator.clipboard.writeText(value);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 1500);
  }

  function CopyButton({ copyKey, value, label }: { copyKey: string; value: string; label: string }) {
    const copied = copiedKey === copyKey;
    return (
      <button
        type="button"
        onClick={() => copy(copyKey, value)}
        aria-label={copied ? `${label} copied` : `Copy ${label}`}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black/[0.06] text-black transition-colors hover:bg-black/10"
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h2 className={sectionHeadingClass}>Pay online</h2>
        {online.map((payment, idx) => (
          <div key={payment.href}>
            {idx > 0 && <Divider />}
            <DetailRow
              icon={payment.icon}
              label={payment.description}
              value={payment.label}
              action={
                <a
                  href={payment.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${pillButtonClass} inline-flex items-center gap-1`}
                >
                  Pay <ArrowUpRight className="h-4 w-4" />
                </a>
              }
            />
          </div>
        ))}
      </section>

      {accounts.length > 0 && (
        <section>
          <h2 className={sectionHeadingClass}>Bank transfer</h2>
          {accounts.map((account, idx) => (
            <div key={account.label}>
              {idx > 0 && <Divider />}
              <DetailRow icon={<Landmark />} label={account.currency} value={account.label} />
              <dl className="ml-16 flex flex-col gap-3 pb-4">
                {account.fields.map((field) => {
                  const key = `${account.label}-${field.label}`;
                  return (
                    <div key={key} className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <dt className="text-xs text-slate-500">{field.label}</dt>
                        <dd className="break-words text-base font-semibold text-black">
                          {field.value}
                        </dd>
                      </div>
                      <CopyButton copyKey={key} value={field.value} label={field.label} />
                    </div>
                  );
                })}
              </dl>
            </div>
          ))}
        </section>
      )}

      {showZelle && (
        <section>
          <h2 className={sectionHeadingClass}>Zelle</h2>
          <DetailRow
            icon={<Mail />}
            label="USD ($) · Send to"
            value={zelleEmail}
            action={<CopyButton copyKey="zelle" value={zelleEmail} label="Zelle email" />}
          />
        </section>
      )}
    </div>
  );
};
