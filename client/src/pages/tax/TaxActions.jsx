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
 * Row actions for a tax, shown inside a popover:
 *  - Edit tax
 *  - Delete tax
 *  - Status toggle (active / inactive)
 */
function TaxActions({ tax, onEdit, onDelete, onToggleStatus }) {
  const [open, setOpen] = useState(false);
  const active = Boolean(tax.is_active);

  const handleEdit = () => {
    setOpen(false);
    onEdit?.(tax);
  };

  const handleDelete = () => {
    setOpen(false);
    onDelete?.(tax);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Actions for ${tax.name}`}
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
          Edit tax
        </Button>

        <Button
          variant="ghost"
          className="w-full justify-start text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={handleDelete}
        >
          <Trash2 />
          Delete tax
        </Button>

        <Separator className="my-0.5" />

        <div className="flex items-center justify-between gap-2 px-2.5 py-1.5">
          <span className="text-sm font-medium">
            {active ? "Active" : "Inactive"}
          </span>
          <Switch
            checked={active}
            aria-label={`Set ${tax.name} ${active ? "inactive" : "active"}`}
            onCheckedChange={(checked) => onToggleStatus?.(tax, checked)}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default TaxActions;
