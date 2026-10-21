import { useEffect, useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { SearchX, Wallet } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { getDueBillList } from "@/api/subscription/subscriptionApi";
import DataTable from "@/components/additonal/Datatable/DataTable";
import ProfileViewer from "@/components/additonal/ProfileViewer";
import MemberEditor from "@/pages/members/MemberEditor";

import { getBalanceReportColumns } from "./BalanceReportColumns";
import BalanceReportTotals from "./BalanceReportTotals";

const EMPTY_STATE = {
  icon: Wallet,
  title: "No balances due",
  description: "Every bill is fully paid, written off or cancelled.",
};

const getNoMatchState = (term) => ({
  icon: SearchX,
  title: "No balances found",
  description: `Nothing matches "${term}". Try a different bill no, member ID or phone.`,
});

const SEARCH_DEBOUNCE_MS = 400;

const NO_ROWS = [];

// Rows are keyed by the bill number.
const getRowId = (row) => String(row.bill_no);

// TanStack passes either the new value or an updater function.
const resolve = (next, previous) =>
  typeof next === "function" ? next(previous) : next;

const getApiError = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback;

/**
 * Balance report: bills that still owe money (part paid, not written off, not
 * cancelled), oldest first. The table runs in server-side (`manual`) mode: the
 * server filters by search and pages the result, so only the current page is
 * ever loaded.
 *
 *   GET /api/subscription/due
 *     page, limit, search  -> from `pagination` and `appliedSearch`
 */
function BalanceReportList() {
  const navigate = useNavigate();

  // `search` is the input text; `appliedSearch` is the debounced value the
  // list is actually fetched with.
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  // Member whose profile modal is open (opened by clicking a name).
  const [profileMemberId, setProfileMemberId] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

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
      "balance-report",
      {
        search: appliedSearch,
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
      },
    ],
    queryFn: () =>
      getDueBillList({
        search: appliedSearch,
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
      }),
    // Keep the current rows on screen while the next page or filter loads.
    placeholderData: keepPreviousData,
  });

  const rows = data?.bills ?? NO_ROWS;
  const total = data?.pagination.total ?? 0;

  const columns = useMemo(
    () =>
      getBalanceReportColumns({
        onView: (bill) => navigate(`/summary-bill?id=${bill.bill_no}`),
        onViewProfile: (memberId) => {
          setProfileMemberId(memberId);
          setProfileOpen(true);
        },
      }),
    [navigate],
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <BalanceReportTotals totals={data?.totals} />
      </div>

      {isError && (
        <p className="text-sm text-destructive" role="alert">
          {getApiError(error, "Failed to load balances")}
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
        isLoading={isLoading}
        isFetching={isFetching}
        emptyState={
          appliedSearch ? getNoMatchState(appliedSearch) : EMPTY_STATE
        }
        searchPlaceholder="Search by bill no, member ID or phone..."
      />

      <ProfileViewer
        open={profileOpen}
        onOpenChange={setProfileOpen}
        memberId={profileMemberId}
        onEdit={() => setEditOpen(true)}
      />

      <MemberEditor
        open={editOpen}
        onOpenChange={setEditOpen}
        memberId={profileMemberId}
      />
    </div>
  );
}

export default BalanceReportList;
