import { Info } from "lucide-react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const formatDays = (days) => {
  const value = Number(days);

  return `${value} ${value === 1 ? "day" : "days"}`;
};

// Info icon that shows the details of the selected plan on hover or focus.
function PlanInfo({ plan }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              type="button"
              aria-label={`Details for ${plan.name}`}
              className="rounded-full text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          }
        >
          <Info className="size-3.5" />
        </TooltipTrigger>

        <TooltipContent>
          <div className="flex flex-col gap-0.5">
            <span className="font-medium">{plan.name}</span>
            <span>Duration: {formatDays(plan.duration_days)}</span>
            <span>
              Max freeze:{" "}
              {Number(plan.max_freeze_days) > 0
                ? formatDays(plan.max_freeze_days)
                : "not allowed"}
            </span>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default PlanInfo;
