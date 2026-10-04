import { useEffect, useMemo, useState } from "react";

import AppAlertDialog from "@/components/additonal/AlertDialog";
import DataTable from "@/components/additonal/Datatable/DataTable";
import { usePlanStore } from "@/store/plan";

import EditPlanDialog from "./EditPlanDialog";
import { getPlanColumns } from "./PlanColumns";

const SEARCH_DEBOUNCE_MS = 400;

const getRowId = (row) => String(row.id);

/**
 * Plans screen. Everything it shows comes from the plan store, and every
 * change goes through a store action (API call -> store update -> re-render):
 *
 *   list    fetchPlans      (runs when the page or applied search changes)
 *   edit    fetchPlanById, updatePlan -> row replaced
 *   status  toggleStatus    -> row replaced
 *   delete  deletePlan      -> row removed
 */
function PlansList() {
  // ---- Rendered from the store ---------------------------------------
  const plans = usePlanStore((state) => state.plans);
  const total = usePlanStore((state) => state.total);
  const search = usePlanStore((state) => state.search);
  const pagination = usePlanStore((state) => state.pagination);
  const appliedSearch = usePlanStore((state) => state.appliedSearch);
  const isLoading = usePlanStore((state) => state.isLoading);
  const isFetching = usePlanStore((state) => state.isFetching);
  const error = usePlanStore((state) => state.error);
  const selectedPlan = usePlanStore((state) => state.selectedPlan);
  const isSaving = usePlanStore((state) => state.isSaving);
  const isDeleting = usePlanStore((state) => state.isDeleting);
  const statusUpdatingIds = usePlanStore((state) => state.statusUpdatingIds);

  // ---- Store actions -------------------------------------------------
  const setSearch = usePlanStore((state) => state.setSearch);
  const applySearch = usePlanStore((state) => state.applySearch);
  const setPagination = usePlanStore((state) => state.setPagination);
  const fetchPlans = usePlanStore((state) => state.fetchPlans);
  const selectPlan = usePlanStore((state) => state.selectPlan);
  const fetchPlanById = usePlanStore((state) => state.fetchPlanById);
  const updatePlan = usePlanStore((state) => state.updatePlan);
  const toggleStatus = usePlanStore((state) => state.toggleStatus);
  const deletePlan = usePlanStore((state) => state.deletePlan);

  // ---- Dialog UI state (which dialog is open) ------------------------
  const [editOpen, setEditOpen] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [planToDelete, setPlanToDelete] = useState(null);

  const [statusOpen, setStatusOpen] = useState(false);
  const [statusChange, setStatusChange] = useState(null);

  // Apply the typed search to the list once the user stops typing.
  useEffect(() => {
    const timer = setTimeout(
      () => applySearch(search.trim()),
      SEARCH_DEBOUNCE_MS,
    );

    return () => clearTimeout(timer);
  }, [search, applySearch]);

  // Load the list whenever the page or the applied search changes.
  useEffect(() => {
    fetchPlans();
  }, [fetchPlans, appliedSearch, pagination.pageIndex, pagination.pageSize]);

  const columns = useMemo(
    () =>
      getPlanColumns({
        onEdit: (plan) => {
          // Show the row's data straight away, then refresh it by id.
          selectPlan(plan);
          setEditOpen(true);
          fetchPlanById(plan.id).catch(() => setEditOpen(false));
        },
        onDelete: (plan) => {
          setPlanToDelete(plan);
          setDeleteOpen(true);
        },
        // Ask for confirmation first; the status only changes after confirming.
        onToggleStatus: (plan, isActive) => {
          setStatusChange({ plan, isActive });
          setStatusOpen(true);
        },
      }),
    [selectPlan, fetchPlanById],
  );

  return (
    <div className="space-y-4">
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <DataTable
        manual
        fixedRows={7}
        columns={columns}
        data={plans}
        getRowId={getRowId}
        rowCount={total}
        pagination={pagination}
        onPaginationChange={setPagination}
        globalFilter={search}
        onGlobalFilterChange={setSearch}
        isLoading={isLoading}
        isFetching={isFetching}
        searchPlaceholder="Search by plan name..."
      />

      {/* Edit. The dialog closes only when updatePlan resolves. */}
      <EditPlanDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        plan={selectedPlan}
        isLoading={isSaving}
        onSubmit={(values, plan) => updatePlan(plan.id, values)}
      />

      <AppAlertDialog
        open={statusOpen}
        onOpenChange={setStatusOpen}
        title={`${statusChange?.isActive ? "Activate" : "Deactivate"} ${
          statusChange?.plan.name ?? "plan"
        }?`}
        description={
          statusChange?.isActive
            ? "Members can subscribe to this plan again."
            : "Members will no longer be able to subscribe to this plan."
        }
        confirmText={statusChange?.isActive ? "Activate" : "Deactivate"}
        variant={statusChange?.isActive ? "default" : "destructive"}
        isLoading={
          statusChange
            ? statusUpdatingIds.includes(statusChange.plan.id)
            : false
        }
        onConfirm={() => toggleStatus(statusChange.plan, statusChange.isActive)}
      />

      <AppAlertDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete ${planToDelete?.name ?? "plan"}?`}
        description="This removes the plan from the list. This action cannot be undone."
        confirmText="Delete"
        variant="destructive"
        isLoading={isDeleting}
        onConfirm={() => deletePlan(planToDelete)}
      />
    </div>
  );
}

export default PlansList;
