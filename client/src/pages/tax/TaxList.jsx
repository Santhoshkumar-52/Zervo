import { useEffect, useMemo, useState } from "react";

import AppAlertDialog from "@/components/additonal/AlertDialog";
import DataTable from "@/components/additonal/Datatable/DataTable";
import { useTaxStore } from "@/store/tax";

import EditTaxDialog from "./EditTaxDialog";
import { getTaxColumns } from "./TaxColumns";

const SEARCH_DEBOUNCE_MS = 400;

const getRowId = (row) => String(row.id);

/**
 * Tax screen. Everything it shows comes from the tax store, and every change
 * goes through a store action (API call -> store update -> re-render):
 *
 *   list    fetchTaxes      (runs when the page or applied search changes)
 *   edit    fetchTaxById, updateTax -> row replaced
 *   status  toggleStatus    -> row replaced
 *   delete  deleteTax       -> row removed
 */
function TaxList() {
  // ---- Rendered from the store ---------------------------------------
  const taxes = useTaxStore((state) => state.taxes);
  const total = useTaxStore((state) => state.total);
  const search = useTaxStore((state) => state.search);
  const pagination = useTaxStore((state) => state.pagination);
  const appliedSearch = useTaxStore((state) => state.appliedSearch);
  const isLoading = useTaxStore((state) => state.isLoading);
  const isFetching = useTaxStore((state) => state.isFetching);
  const error = useTaxStore((state) => state.error);
  const selectedTax = useTaxStore((state) => state.selectedTax);
  const isSaving = useTaxStore((state) => state.isSaving);
  const isDeleting = useTaxStore((state) => state.isDeleting);
  const statusUpdatingIds = useTaxStore((state) => state.statusUpdatingIds);

  // ---- Store actions -------------------------------------------------
  const setSearch = useTaxStore((state) => state.setSearch);
  const applySearch = useTaxStore((state) => state.applySearch);
  const setPagination = useTaxStore((state) => state.setPagination);
  const fetchTaxes = useTaxStore((state) => state.fetchTaxes);
  const selectTax = useTaxStore((state) => state.selectTax);
  const fetchTaxById = useTaxStore((state) => state.fetchTaxById);
  const updateTax = useTaxStore((state) => state.updateTax);
  const toggleStatus = useTaxStore((state) => state.toggleStatus);
  const deleteTax = useTaxStore((state) => state.deleteTax);

  // ---- Dialog UI state (which dialog is open) ------------------------
  const [editOpen, setEditOpen] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [taxToDelete, setTaxToDelete] = useState(null);

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
    fetchTaxes();
  }, [fetchTaxes, appliedSearch, pagination.pageIndex, pagination.pageSize]);

  const columns = useMemo(
    () =>
      getTaxColumns({
        onEdit: (tax) => {
          // Show the row's data straight away, then refresh it by id.
          selectTax(tax);
          setEditOpen(true);
          fetchTaxById(tax.id).catch(() => setEditOpen(false));
        },
        onDelete: (tax) => {
          setTaxToDelete(tax);
          setDeleteOpen(true);
        },
        // Ask for confirmation first; the status only changes after confirming.
        onToggleStatus: (tax, isActive) => {
          setStatusChange({ tax, isActive });
          setStatusOpen(true);
        },
      }),
    [selectTax, fetchTaxById],
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
        data={taxes}
        getRowId={getRowId}
        rowCount={total}
        pagination={pagination}
        onPaginationChange={setPagination}
        globalFilter={search}
        onGlobalFilterChange={setSearch}
        isLoading={isLoading}
        isFetching={isFetching}
        searchPlaceholder="Search by tax name or description..."
      />

      {/* Edit. The dialog closes only when updateTax resolves. */}
      <EditTaxDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        tax={selectedTax}
        isLoading={isSaving}
        onSubmit={(values, tax) => updateTax(tax.id, values)}
      />

      <AppAlertDialog
        open={statusOpen}
        onOpenChange={setStatusOpen}
        title={`${statusChange?.isActive ? "Activate" : "Deactivate"} ${
          statusChange?.tax.name ?? "tax"
        }?`}
        description={
          statusChange?.isActive
            ? "This tax will be applied to new payments."
            : "This tax will no longer be applied to new payments."
        }
        confirmText={statusChange?.isActive ? "Activate" : "Deactivate"}
        variant={statusChange?.isActive ? "default" : "destructive"}
        isLoading={
          statusChange
            ? statusUpdatingIds.includes(statusChange.tax.id)
            : false
        }
        onConfirm={() => toggleStatus(statusChange.tax, statusChange.isActive)}
      />

      <AppAlertDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete ${taxToDelete?.name ?? "tax"}?`}
        description="This removes the tax from the list. This action cannot be undone."
        confirmText="Delete"
        variant="destructive"
        isLoading={isDeleting}
        onConfirm={() => deleteTax(taxToDelete)}
      />
    </div>
  );
}

export default TaxList;
