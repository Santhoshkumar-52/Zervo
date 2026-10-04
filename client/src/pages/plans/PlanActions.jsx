import { useState } from "react";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";

/**
 * Row actions for a plan, shown inside a popover:
 *  - Edit plan
 *  - Delete plan
 *  - Status toggle (active / inactive)
 */
function PlanActions({ plan, onEdit, onDelete, onToggleStatus }) {
  const [open, setOpen] = useState(false);
  const active = Boolean(plan.is_active);

  const handleEdit = () => {
    setOpen(false);
    onEdit?.(plan);
  };

  const handleDelete = () => {
    setOpen(false);
    onDelete?.(plan);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Actions for ${plan.name}`}
          />
        }
      >
        <MoreHorizontal />
      </PopoverTrigger>

      <PopoverContent align="end" className="w-52 gap-1 p-1.5">
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={handleEdit}
        >
          <Pencil />
          Edit plan
        </Button>

        <Button
          variant="ghost"
          className="w-full justify-start text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={handleDelete}
        >
          <Trash2 />
          Delete plan
        </Button>

        <Separator className="my-0.5" />

        <div className="flex items-center justify-between gap-2 px-2.5 py-1.5">
          <span className="text-sm font-medium">
            {active ? "Active" : "Inactive"}
          </span>
          <Switch
            checked={active}
            aria-label={`Set ${plan.name} ${active ? "inactive" : "active"}`}
            onCheckedChange={(checked) => onToggleStatus?.(plan, checked)}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default PlanActions;
