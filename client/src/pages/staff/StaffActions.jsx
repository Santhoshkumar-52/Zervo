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
import { useAuthStore } from "@/store/auth";

/**
 * Row actions for a staff member, shown inside a popover:
 *  - Edit staff
 *  - Delete staff
 *  - Status toggle (active / inactive)
 */
function StaffActions({
  staff,
  onEdit,
  onDelete,
  onToggleStatus,
  isStatusUpdating = false,
}) {
  const [open, setOpen] = useState(false);
  const active = Boolean(staff.is_active);

  // The server blocks deleting / deactivating yourself, so disable it here too.
  const isSelf = useAuthStore((state) => state.user?.id) === staff.id;

  const handleEdit = () => {
    setOpen(false);
    onEdit?.(staff);
  };

  const handleDelete = () => {
    setOpen(false);
    onDelete?.(staff);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Actions for ${staff.full_name}`}
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
          Edit staff
        </Button>

        <Button
          variant="ghost"
          disabled={isSelf}
          className="w-full justify-start text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={handleDelete}
        >
          <Trash2 />
          Delete staff
        </Button>

        <Separator className="my-0.5" />

        <div className="flex items-center justify-between gap-2 px-2.5 py-1.5">
          <span className="text-sm font-medium">
            {active ? "Active" : "Inactive"}
          </span>
          <Switch
            checked={active}
            disabled={isStatusUpdating || isSelf}
            aria-label={`Set ${staff.full_name} ${
              active ? "inactive" : "active"
            }`}
            onCheckedChange={(checked) => onToggleStatus?.(staff, checked)}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default StaffActions;
