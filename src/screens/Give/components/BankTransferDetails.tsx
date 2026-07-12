import { useState } from "react";

interface BankField {
  label: string;
  value: string;
}

interface BankAccount {
  label: string;
  fields: BankField[];
}

const bankAccounts: BankAccount[] = [
  {
    label: "GTBank — Naira (₦)",
    fields: [
      { label: "Account Name", value: "PETRA CHRISTIAN CENTRE PROGRAM" },
      { label: "Account Number", value: "0558726334" },
      { label: "Transfer Description", value: "Rain Conference" },
    ],
  },
  {
    label: "Bank of America — USD ($)",
    fields: [
      { label: "Account Name", value: "Petra Christian Centre" },
      { label: "Account Number", value: "488135397734" },
      { label: "Routing (Paper & Electronic)", value: "111000025" },
      { label: "Routing (Wires)", value: "026009593" },
    ],
  },
];

export const BankTransferDetails = (): JSX.Element => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  function copy(key: string, value: string) {
    navigator.clipboard.writeText(value);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 1500);
  }

  return (
    <div>
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-400">
        Bank transfer
      </h2>
      <div className="flex flex-col gap-4">
        {bankAccounts.map((account) => (
          <div key={account.label} className="rounded-xl border border-slate-200 p-4">
            <p className="mb-3 text-sm font-bold text-[#1c2b3a]">{account.label}</p>
            <div className="flex flex-col gap-2">
              {account.fields.map((field) => {
                const key = `${account.label}-${field.label}`;
                return (
                  <div
                    key={key}
                    className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        {field.label}
                      </p>
                      <p className="truncate text-sm font-semibold text-slate-800">
                        {field.value}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => copy(key, field.value)}
                      className="shrink-0 rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-600 hover:border-[#fa400f] hover:text-[#fa400f]"
                    >
                      {copiedKey === key ? "Copied!" : "Copy"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
