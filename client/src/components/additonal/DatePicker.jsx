import { useState } from "react";
import { format, isValid, parse } from "date-fns";
import { CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const VALUE_FORMAT = "yyyy-MM-dd"; // what the API / forms store
const DISPLAY_FORMAT = "dd MMM yyyy"; // what the user sees

// "2026-01-10" -> local Date (no timezone shift). Invalid / empty -> undefined.
const toDate = (value) => {
  if (!value) return undefined;

  const date = parse(value, VALUE_FORMAT, new Date());

  return isValid(date) ? date : undefined;
};

/**
 * Reusable date picker: shadcn Popover + Calendar.
 * `value` and `onChange` use "YYYY-MM-DD" strings (empty string = no date).
 *
 *   <DatePicker id="joined-on" value={value} onChange={setValue} />
 */
function DatePicker({
  id,
  value,
  onChange,
  placeholder = "Pick a date",
  disabled = false,
  className,
  startYear = 2000,
  endYear = new Date().getFullYear() + 1,
  ...props
}) {
  const [open, setOpen] = useState(false);
  const selected = toDate(value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            id={id}
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn(
              "w-full justify-start font-normal",
              !selected && "text-muted-foreground",
              className,
            )}
            {...props}
          />
        }
      >
        <CalendarIcon />
        {selected ? format(selected, DISPLAY_FORMAT) : placeholder}
      </PopoverTrigger>

      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected}
          captionLayout="dropdown"
          startMonth={new Date(startYear, 0)}
          endMonth={new Date(endYear, 11)}
          onSelect={(date) => {
            onChange?.(date ? format(date, VALUE_FORMAT) : "");
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

export default DatePicker;
