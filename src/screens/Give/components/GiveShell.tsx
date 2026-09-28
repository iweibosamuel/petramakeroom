import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

interface GiveShellProps {
  title: string;
  subtitle?: ReactNode;
  backTo?: string;
  onBack?: () => void;
  backLabel?: string;
  children: ReactNode;
}

const backButtonClass =
  "flex h-12 w-12 items-center justify-center rounded-full bg-black/[0.06] text-black transition-colors hover:bg-black/10";

// Full-page layout for the giving flow, modelled on native finance apps:
// round back button, big left-aligned title, content that fills the screen
// so a StickyAction can pin the main button to the bottom.
export const GiveShell = ({
  title,
  subtitle,
  backTo,
  onBack,
  backLabel = "Back",
  children,
}: GiveShellProps): JSX.Element => {
  return (
    <main className="min-h-screen w-full bg-[#fffaf4] [font-family:'Inter',Helvetica] text-[#161b26]">
      <div className="mx-auto flex min-h-screen w-full max-w-[560px] flex-col px-5 pt-5 sm:pt-10">
        <header className="flex items-center justify-between">
          {onBack ? (
            <button type="button" onClick={onBack} aria-label={backLabel} className={backButtonClass}>
              <ArrowLeft className="h-6 w-6" />
            </button>
          ) : backTo ? (
            <Link to={backTo} aria-label={backLabel} className={backButtonClass}>
              <ArrowLeft className="h-6 w-6" />
            </Link>
          ) : (
            <span className="h-12 w-12" />
          )}
          <Link to="/" aria-label="Petra home">
            <img src="/images/Petra%20logo.svg" alt="Petra logo" className="h-11 w-11" />
          </Link>
        </header>

        <h1 className="mt-8 font-drum text-[28px] font-bold leading-[1.1] text-black sm:text-[34px]">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-3 text-base leading-6 text-slate-500">{subtitle}</p>
        )}

        <div className="mt-8 flex flex-1 flex-col pb-8">{children}</div>
      </div>
    </main>
  );
};
