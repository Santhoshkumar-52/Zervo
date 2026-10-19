import { format } from "date-fns";

import Field from "@/components/additonal/Field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

import {
  DATE_FORMAT,
  DATE_RANGE_ITEMS,
  DATE_RANGE_PRESETS,
  getDateRangeValue,
} from "./dateRange";

/**
 * Date range filter: a preset dropdown + start / end date inputs.
 *
 *   - Presets (today, yesterday, last 7 days ...): the dropdown sets
 *     start_date and end_date. The two inputs stay hidden and read-only.
 *   - "Custom date": both inputs appear and become editable.
 *
 * The API should always use `value.startDate` and `value.endDate` (the input
 * values), whichever option is selected.
 *
 * Controlled: `value` is { preset, startDate, endDate }, dates are "YYYY-MM-DD".
 *
 *   const [range, setRange] = useState(() => getDateRangeValue("last_7_days"));
 *   <DateRangeFilter value={range} onChange={setRange} />
 */
function DateRangeFilter({ value, onChange, disabled = false, className }) {
  const { preset, startDate, endDate } = value;
  const isCustom = preset === DATE_RANGE_PRESETS.CUSTOM;
  const today = format(new Date(), DATE_FORMAT);

  let error;
  if (isCustom) {
    if (!startDate || !endDate) {
      error = "Select both dates.";
    } else if (startDate > endDate) {
      error = "End date must be on or after the start date.";
    }
  }

  const handlePresetChange = (nextPreset) => {
    if (!nextPreset) return;

    if (nextPreset === DATE_RANGE_PRESETS.CUSTOM) {
      // Keep the dates currently shown, the user edits them from there.
      onChange({ ...value, preset: nextPreset });
      return;
    }

    onChange(getDateRangeValue(nextPreset));
  };

  const handleDateChange = (field) => (event) => {
    onChange({ ...value, preset: DATE_RANGE_PRESETS.CUSTOM, [field]: event.target.value });
  };

  return (
    <div className={cn("flex flex-wrap items-start gap-3", className)}>
      <Field label="Date range" htmlFor="date-range-preset">
        <Select
          items={DATE_RANGE_ITEMS}
          value={preset}
          onValueChange={handlePresetChange}
          disabled={disabled}
        >
          <SelectTrigger id="date-range-preset" className="w-44">
            <SelectValue placeholder="Select a range" />
          </SelectTrigger>
          <SelectContent>
            {DATE_RANGE_ITEMS.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      {/* Always in the DOM so the values are there; only shown for custom. */}
      <div hidden={!isCustom}>
        <Field label="Start date" htmlFor="date-range-start">
          <Input
            id="date-range-start"
            name="start_date"
            type="date"
            value={startDate}
            max={endDate && endDate < today ? endDate : today}
            readOnly={!isCustom}
            disabled={disabled}
            aria-invalid={Boolean(error) || undefined}
            onChange={handleDateChange("startDate")}
            className="w-40"
          />
        </Field>
      </div>

      <div hidden={!isCustom}>
        <Field
          label="End date"
          htmlFor="date-range-end"
          error={error}
        >
          <Input
            id="date-range-end"
            name="end_date"
            type="date"
            value={endDate}
            min={startDate || undefined}
            max={today}
            readOnly={!isCustom}
            disabled={disabled}
            aria-invalid={Boolean(error) || undefined}
            onChange={handleDateChange("endDate")}
            className="w-40"
          />
        </Field>
      </div>
    </div>
  );
}

export default DateRangeFilter;
