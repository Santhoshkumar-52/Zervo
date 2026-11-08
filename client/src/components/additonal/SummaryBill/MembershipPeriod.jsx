import { LABEL } from "./billStyles";
import { formatDate, getPeriod, plural } from "./billHelpers";

function DateBlock({ value, align = "start" }) {
  return (
    <div className={align === "end" ? "text-right" : "text-left"}>
      <p className="text-2xl leading-none font-bold tabular-nums sm:text-3xl">
        {formatDate(value, "d MMM")}
      </p>
      <p className="mt-1.5 text-sm font-medium text-zinc-600">{formatDate(value, "yyyy")}</p>
    </div>
  );
}

// What the member bought is a window of time, so the dates lead and a bar
// shows how much of the window has passed.
// `today` comes from the parent so the bar never disagrees with the text.
function MembershipPeriod({ startDate, endDate, today }) {
  const period = getPeriod(startDate, endDate, today);

  if (!period) return null;

  return (
    <section
      aria-labelledby="bill-period-title"
      className="border-b border-zinc-300 bg-zinc-50 px-5 py-5 sm:px-7 [print-color-adjust:exact]"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 id="bill-period-title" className={LABEL}>
          Membership period
        </h3>
        <p
          className={`text-sm font-semibold ${
            period.state === "expired" ? "text-red-700" : "text-zinc-900"
          }`}
        >
          {period.message}
        </p>
      </div>

      <div className="mt-4 flex items-end justify-between gap-4">
        <DateBlock value={period.start} />
        <p className="pb-1 text-sm font-medium text-zinc-700">{plural(period.totalDays, "day")}</p>
        <DateBlock value={period.end} align="end" />
      </div>

      <div
        role="progressbar"
        aria-label="Share of the membership period used"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={period.progress}
        aria-valuetext={period.message}
        className="mt-5 h-2 overflow-hidden rounded-full bg-zinc-200 [print-color-adjust:exact]"
      >
        <div
          className="h-full rounded-full bg-zinc-900 animate-in slide-in-from-left-full duration-700 motion-reduce:animate-none [print-color-adjust:exact]"
          style={{ width: `${period.progress}%` }}
        />
      </div>
    </section>
  );
}

export default MembershipPeriod;
