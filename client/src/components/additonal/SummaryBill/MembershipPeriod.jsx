import { formatDate, getPeriod, plural } from "./billHelpers";

function DateBlock({ value, align = "start" }) {
  return (
    <div className={align === "end" ? "text-right" : "text-left"}>
      <p className="text-3xl leading-none font-semibold tracking-tight sm:text-5xl">
        {formatDate(value, "d MMM")}
      </p>
      <p className="mt-2 text-sm opacity-80">{formatDate(value, "yyyy")}</p>
    </div>
  );
}

// The one bold moment on the bill: what the member bought is a window of time,
// so the dates lead and a bar shows how much of the window has passed.
// `today` comes from the parent so the bar never disagrees with the text.
function MembershipPeriod({ startDate, endDate, today }) {
  const period = getPeriod(startDate, endDate, today);

  if (!period) return null;

  return (
    <section
      aria-labelledby="bill-period-title"
      className="bg-primary px-5 py-6 text-primary-foreground sm:px-8 sm:py-8 [print-color-adjust:exact]"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 id="bill-period-title" className="text-sm font-medium">
          Membership period
        </h3>
        <p className="text-sm font-medium">{period.message}</p>
      </div>

      <div className="mt-5 flex items-end justify-between gap-4">
        <DateBlock value={period.start} />
        <p className="pb-1 text-sm opacity-80">{plural(period.totalDays, "day")}</p>
        <DateBlock value={period.end} align="end" />
      </div>

      <div
        role="progressbar"
        aria-label="Share of the membership period used"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={period.progress}
        aria-valuetext={period.message}
        className="mt-6 h-1.5 overflow-hidden rounded-full bg-primary-foreground/25"
      >
        <div
          className="h-full rounded-full bg-primary-foreground animate-in slide-in-from-left-full duration-700 motion-reduce:animate-none"
          style={{ width: `${period.progress}%` }}
        />
      </div>
    </section>
  );
}

export default MembershipPeriod;
