import { Link } from "react-router-dom";
import { ChevronRight, User, Users } from "lucide-react";
import type { GivingTier } from "../../lib/giving";
import { TIERS } from "../../lib/giving/tiers";
import { GiveShell } from "./components/GiveShell";
import { DetailRow, Divider } from "./components/FlowParts";

export const TierHome = ({ tier: tierId }: { tier: GivingTier }): JSX.Element => {
  const tier = TIERS[tierId];
  const options = [
    {
      to: `/give/${tier.slug}/individual`,
      icon: <User />,
      label: "Just me",
      value: "Give as an individual",
    },
    {
      to: `/give/${tier.slug}/group/new`,
      icon: <Users />,
      label: "With others",
      value: "Give as a group",
    },
  ];

  return (
    <GiveShell title={tier.name} subtitle={tier.description} backTo="/give">
      <p className="text-sm text-slate-500">How would you like to give?</p>
      <div className="mt-2">
        {options.map((option, idx) => (
          <div key={option.to}>
            {idx > 0 && <Divider />}
            <Link
              to={option.to}
              className="-mx-3 block rounded-2xl px-3 transition-colors hover:bg-black/[0.04]"
            >
              <DetailRow
                icon={option.icon}
                label={option.label}
                value={option.value}
                action={<ChevronRight className="h-5 w-5 text-black" />}
              />
            </Link>
          </div>
        ))}
      </div>
    </GiveShell>
  );
};
