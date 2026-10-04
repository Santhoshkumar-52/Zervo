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
 * Row actions for a discount, shown inside a popover:
 *  - Edit discount
 *  - Delete discount
 *  - Status toggle (active / inactive)
 */
function DiscountActions({ discount, onEdit, onDelete, onToggleStatus }) {
  const [open, setOpen] = useState(false);
  const active = Boolean(discount.is_active);

  const handleEdit = () => {
    setOpen(false);
    onEdit?.(discount);
  };

  const handleDelete = () => {
    setOpen(false);
    onDelete?.(discount);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Actions for ${discount.name}`}
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
          Edit discount
        </Button>

        <Button
          variant="ghost"
          className="w-full justify-start text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={handleDelete}
        >
          <Trash2 />
          Delete discount
        </Button>

        <Separator className="my-0.5" />

        <div className="flex items-center justify-between gap-2 px-2.5 py-1.5">
          <span className="text-sm font-medium">
            {active ? "Active" : "Inactive"}
          </span>
          <Switch
            checked={active}
            aria-label={`Set ${discount.name} ${
              active ? "inactive" : "active"
            }`}
            onCheckedChange={(checked) => onToggleStatus?.(discount, checked)}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default DiscountActions;
