import { useEffect, useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import { CalendarCheck, SearchX } from "lucide-react";

import { getAttendanceReport } from "@/api/report/reportApi";
import DatePicker from "@/components/additonal/DatePicker";
import DataTable from "@/components/additonal/Datatable/DataTable";
import ProfileViewer from "@/components/additonal/ProfileViewer";
import { Label } from "@/components/ui/label";

import { getAttendanceReportColumns } from "./AttendanceReportColumns";

const EMPTY_STATE = {
  icon: CalendarCheck,
  title: "No check-ins found",
  description: "No members checked in during the selected date range.",
};

const getNoMatchState = (term) => ({
  icon: SearchX,
  title: "No check-ins found",
  description: `Nothing matches "${term}". Try a different member ID, name or phone.`,
});

const DATE_VALUE_FORMAT = "yyyy-MM-dd";
const DEFAULT_RANGE_DAYS = 30;
const SEARCH_DEBOUNCE_MS = 400;

const NO_ROWS = [];

const getRowId = (row) => String(row.id);

// TanStack passes either the new value or an updater function.
const resolve = (next, previous) =>
  typeof next === "function" ? next(previous) : next;

const getApiError = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback;

/**
 * Attendance report. The table runs in server-side (`manual`) mode: the
 * server filters by check-in date range and search, and pages the result, so
 * only the current page is ever loaded.
 *
 *   GET /api/report/attendance
 *     start_date, end_date  -> the check-in date range
 *     page, limit, search   -> from `pagination` and `appliedSearch`
 */
function AttendanceReportList() {
  const [startDate, setStartDate] = useState(() =>
    format(subDays(new Date(), DEFAULT_RANGE_DAYS - 1), DATE_VALUE_FORMAT),
  );
  const [endDate, setEndDate] = useState(() =>
    format(new Date(), DATE_VALUE_FORMAT),
  );

  // `search` is the input text; `appliedSearch` is the debounced value the
  // list is actually fetched with.
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  // Member whose profile modal is open (opened by clicking a name).
  const [profileMemberId, setProfileMemberId] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);

  const isRangeInvalid = Boolean(startDate && endDate && startDate > endDate);

  // The server needs both dates, so wait until they are set and in order.
  const canFetch = Boolean(startDate && endDate) && !isRangeInvalid;

  // Apply the typed search once the user stops typing. A new search always
  // starts again from the first page.
  useEffect(() => {
    const timer = setTimeout(() => {
      const next = search.trim();

      if (next === appliedSearch) return;

      setAppliedSearch(next);
      setPagination((current) => ({ ...current, pageIndex: 0 }));
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [search, appliedSearch]);

  const { data, isLoading, isFetching, isError, error } = useQuery({
    queryKey: [
      "attendance-report",
      {
        startDate,
        endDate,
        search: appliedSearch,
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
      },
    ],
    queryFn: () =>
      getAttendanceReport({
        start_date: startDate,
        end_date: endDate,
        search: appliedSearch,
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
      }),
    enabled: canFetch,
    // Keep the current rows on screen while the next page or filter loads.
    placeholderData: keepPreviousData,
  });

  const rows = canFetch ? (data?.records ?? NO_ROWS) : NO_ROWS;
  const total = canFetch ? (data?.pagination.total ?? 0) : 0;

  // Any change to the date range starts again from the first page.
  const goToFirstPage = () =>
    setPagination((previous) => ({ ...previous, pageIndex: 0 }));

  const handleStartDate = (value) => {
    setStartDate(value);
    goToFirstPage();
  };

  const handleEndDate = (value) => {
    setEndDate(value);
    goToFirstPage();
  };

  const columns = useMemo(
    () =>
      getAttendanceReportColumns({
        onViewProfile: (memberId) => {
          setProfileMemberId(memberId);
          setProfileOpen(true);
        },
      }),
    [],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="attendance-start-date">From</Label>
          <DatePicker
            id="attendance-start-date"
            value={startDate}
            onChange={handleStartDate}
            placeholder="Start date"
            className="w-44"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="attendance-end-date">To</Label>
          <DatePicker
            id="attendance-end-date"
            value={endDate}
            onChange={handleEndDate}
            placeholder="End date"
            className="w-44"
          />
        </div>

        {isRangeInvalid && (
          <p className="pb-2 text-sm text-destructive" role="alert">
            End date cannot be before the start date.
          </p>
        )}
      </div>

      {isError && (
        <p className="text-sm text-destructive" role="alert">
          {getApiError(error, "Failed to load attendance report")}
        </p>
      )}

      <DataTable
        manual
        fixedRows={7}
        columns={columns}
        data={rows}
        getRowId={getRowId}
        rowCount={total}
        pagination={pagination}
        onPaginationChange={(next) =>
          setPagination((previous) => resolve(next, previous))
        }
        globalFilter={search}
        onGlobalFilterChange={(next) =>
          setSearch((previous) => resolve(next, previous))
        }
        isLoading={canFetch && isLoading}
        isFetching={canFetch && isFetching}
        emptyState={
          appliedSearch ? getNoMatchState(appliedSearch) : EMPTY_STATE
        }
        searchPlaceholder="Search by member ID, name or phone..."
      />

      <ProfileViewer
        open={profileOpen}
        onOpenChange={setProfileOpen}
        memberId={profileMemberId}
      />
    </div>
  );
}

export default AttendanceReportList;
