import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { dataStore, DEFAULT_CAMPAIGN_ID, type CampaignProgress } from "../../lib/giving";
import { formatNairaWords } from "../../lib/giving/format";
import { GiveShell } from "./components/GiveShell";
import { primaryButtonClass, secondaryButtonClass } from "./components/fieldStyles";

export const GiveLanding = (): JSX.Element => {
  const [progress, setProgress] = useState<CampaignProgress | null>(null);

  useEffect(() => {
    dataStore.getCampaignProgress(DEFAULT_CAMPAIGN_ID).then(setProgress);
  }, []);

  return (
    <GiveShell
      title={progress?.campaign.title ?? "Make Room"}
      subtitle={progress?.campaign.description}
      centerText
    >
      {progress && (
        <div className="mb-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Goal
          </p>
          <p className="mt-1 [font-family:'Zalando_Sans_SemiExpanded',Helvetica] text-4xl font-black leading-none text-[#1c2b3a] sm:text-5xl">
            {formatNairaWords(progress.campaign.goalNaira)}
          </p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <Link to="/give/individual" className={primaryButtonClass + " text-center"}>
          Give as an individual
        </Link>
        <Link to="/give/group/new" className={secondaryButtonClass + " text-center"}>
          Give as a group
        </Link>
      </div>

      <p className="mt-6 text-center text-sm text-slate-500">
        Already filled the form?{" "}
        <Link to="/give/my" className="font-semibold text-[#fa400f] hover:underline">
          Track your giving
        </Link>
      </p>
    </GiveShell>
  );
};
