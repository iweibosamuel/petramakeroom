import type { ReactNode } from "react";

interface DetailRowProps {
  icon: ReactNode;
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  action?: ReactNode;
}

// "Paying with / Arrives" style row: round icon, grey label, bold value,
// optional pill action on the right.
export const DetailRow = ({
  icon,
  label,
  value,
  hint,
  action,
}: DetailRowProps): JSX.Element => (
  <div className="flex items-center gap-4 py-4">
    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-black/10 text-black [&>svg]:h-5 [&>svg]:w-5">
      {icon}
    </span>
    <div className="min-w-0 flex-1">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="break-words text-lg font-bold leading-snug text-black">{value}</p>
      {hint && <p className="mt-0.5 text-sm text-slate-500">{hint}</p>}
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);

export const Divider = (): JSX.Element => <hr className="my-2 border-black/10" />;

// Pins the main action to the bottom of the screen. The surrounding form or
// container must be `flex flex-1 flex-col` so this sits at the bottom even
// when the content is short.
export const StickyAction = ({ children }: { children: ReactNode }): JSX.Element => (
  <div className="sticky bottom-0 -mx-5 mt-auto bg-[linear-gradient(to_top,#fffaf4_70%,rgba(255,250,244,0))] px-5 pb-5 pt-8">
    {children}
  </div>
);

export const pillButtonClass =
  "rounded-full bg-black/[0.06] px-4 py-2 text-sm font-bold text-black transition-colors hover:bg-black/10";

export function optionCardClass(selected: boolean): string {
  return `w-full rounded-2xl border-2 px-4 py-4 text-left transition-colors ${
    selected
      ? "border-black bg-white"
      : "border-transparent bg-black/[0.05] hover:bg-black/[0.08]"
  }`;
}

// Big headline amount that shrinks to fit its line, so long figures like
// ₦100,000,000 never overflow on a phone. Width is measured with container
// query units on the wrapper.
export function fitAmountStyle(text: string): { fontSize: string } {
  const chars = Math.max(text.length, 5);
  return { fontSize: `min(3.5rem, calc(100cqw / ${(chars * 1.05).toFixed(2)}))` };
}

export const BigAmount = ({ text }: { text: string }): JSX.Element => (
  <div className="[container-type:inline-size]">
    <p
      className="whitespace-nowrap font-drum font-bold leading-none text-black"
      style={fitAmountStyle(text)}
    >
      {text}
    </p>
  </div>
);
