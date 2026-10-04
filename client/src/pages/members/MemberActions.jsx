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
 * Row actions for a member, shown inside a popover:
 *  - Edit member
 *  - Delete member
 *  - Status toggle (active / inactive)
 */
function MemberActions({
  member,
  onEdit,
  onDelete,
  onToggleStatus,
  isStatusUpdating = false,
}) {
  const [open, setOpen] = useState(false);
  const active = Boolean(member.is_active);

  const handleEdit = () => {
    setOpen(false);
    onEdit?.(member);
  };

  const handleDelete = () => {
    setOpen(false);
    onDelete?.(member);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Actions for ${member.member_name}`}
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
          Edit member
        </Button>

        <Button
          variant="ghost"
          className="w-full justify-start text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={handleDelete}
        >
          <Trash2 />
          Delete member
        </Button>

        <Separator className="my-0.5" />

        <div className="flex items-center justify-between gap-2 px-2.5 py-1.5">
          <span className="text-sm font-medium">
            {active ? "Active" : "Inactive"}
          </span>
          <Switch
            checked={active}
            disabled={isStatusUpdating}
            aria-label={`Set ${member.member_name} ${
              active ? "inactive" : "active"
            }`}
            onCheckedChange={(checked) => onToggleStatus?.(member, checked)}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default MemberActions;
