import type { ReactNode } from "react";
import { Link } from "react-router-dom";

interface GiveShellProps {
  title: string;
  subtitle?: string;
  backTo?: string;
  backLabel?: string;
  centerText?: boolean;
  children: ReactNode;
}

export const GiveShell = ({
  title,
  subtitle,
  backTo,
  backLabel = "Back",
  centerText = false,
  children,
}: GiveShellProps): JSX.Element => {
  return (
    <main className="relative min-h-screen w-full overflow-hidden px-4 py-10 sm:px-6 sm:py-16">
      <img
        src="/images/petra%20aud.png"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(91,135,148,0.92)_0%,rgba(151,179,178,0.92)_100%)]" />

      <div className="relative z-10 mx-auto flex w-full max-w-[640px] flex-col items-center">
        <Link to="/" className="mb-6 h-24 w-24">
          <img
            src="/images/Petra%20logo.png"
            alt="Petra logo"
            className="h-24 w-24 rounded-full object-cover"
          />
        </Link>

        <div className="w-full rounded-3xl bg-white/95 p-6 shadow-xl sm:p-10">
          {backTo && (
            <Link
              to={backTo}
              className="mb-4 inline-block text-sm font-semibold text-slate-500 hover:text-slate-700"
            >
              ← {backLabel}
            </Link>
          )}

          <h1
            className={`[font-family:'Zalando_Sans_SemiExpanded',Helvetica] text-2xl font-black leading-tight text-[#1c2b3a] sm:text-3xl ${
              centerText ? "text-center" : ""
            }`}
          >
            {title}
          </h1>
          {subtitle && (
            <p
              className={`mt-2 [font-family:'Zalando_Sans',Helvetica] text-sm text-slate-500 sm:text-base ${
                centerText ? "text-center" : ""
              }`}
            >
              {subtitle}
            </p>
          )}
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </main>
  );
};
