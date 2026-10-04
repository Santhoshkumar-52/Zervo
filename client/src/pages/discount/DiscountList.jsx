import { useEffect, useMemo, useState } from "react";

import AppAlertDialog from "@/components/additonal/AlertDialog";
import DataTable from "@/components/additonal/Datatable/DataTable";
import { useDiscountStore } from "@/store/discount";

import { getDiscountColumns } from "./DiscountColumns";
import EditDiscountDialog from "./EditDiscountDialog";

const SEARCH_DEBOUNCE_MS = 400;

const getRowId = (row) => String(row.id);

/**
 * Discount screen. Everything it shows comes from the discount store, and
 * every change goes through a store action (API call -> store update -> re-render):
 *
 *   list    fetchDiscounts      (runs when the page or applied search changes)
 *   edit    fetchDiscountById, updateDiscount -> row replaced
 *   status  toggleStatus        -> row replaced
 *   delete  deleteDiscount      -> row removed
 */
function DiscountList() {
  // ---- Rendered from the store ---------------------------------------
  const discounts = useDiscountStore((state) => state.discounts);
  const total = useDiscountStore((state) => state.total);
  const search = useDiscountStore((state) => state.search);
  const pagination = useDiscountStore((state) => state.pagination);
  const appliedSearch = useDiscountStore((state) => state.appliedSearch);
  const isLoading = useDiscountStore((state) => state.isLoading);
  const isFetching = useDiscountStore((state) => state.isFetching);
  const error = useDiscountStore((state) => state.error);
  const selectedDiscount = useDiscountStore((state) => state.selectedDiscount);
  const isSaving = useDiscountStore((state) => state.isSaving);
  const isDeleting = useDiscountStore((state) => state.isDeleting);
  const statusUpdatingIds = useDiscountStore(
    (state) => state.statusUpdatingIds,
  );

  // ---- Store actions -------------------------------------------------
  const setSearch = useDiscountStore((state) => state.setSearch);
  const applySearch = useDiscountStore((state) => state.applySearch);
  const setPagination = useDiscountStore((state) => state.setPagination);
  const fetchDiscounts = useDiscountStore((state) => state.fetchDiscounts);
  const selectDiscount = useDiscountStore((state) => state.selectDiscount);
  const fetchDiscountById = useDiscountStore(
    (state) => state.fetchDiscountById,
  );
  const updateDiscount = useDiscountStore((state) => state.updateDiscount);
  const toggleStatus = useDiscountStore((state) => state.toggleStatus);
  const deleteDiscount = useDiscountStore((state) => state.deleteDiscount);

  // ---- Dialog UI state (which dialog is open) ------------------------
  const [editOpen, setEditOpen] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [discountToDelete, setDiscountToDelete] = useState(null);

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
    fetchDiscounts();
  }, [
    fetchDiscounts,
    appliedSearch,
    pagination.pageIndex,
    pagination.pageSize,
  ]);

  const columns = useMemo(
    () =>
      getDiscountColumns({
        onEdit: (discount) => {
          // Show the row's data straight away, then refresh it by id.
          selectDiscount(discount);
          setEditOpen(true);
          fetchDiscountById(discount.id).catch(() => setEditOpen(false));
        },
        onDelete: (discount) => {
          setDiscountToDelete(discount);
          setDeleteOpen(true);
        },
        // Ask for confirmation first; the status only changes after confirming.
        onToggleStatus: (discount, isActive) => {
          setStatusChange({ discount, isActive });
          setStatusOpen(true);
        },
      }),
    [selectDiscount, fetchDiscountById],
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
        data={discounts}
        getRowId={getRowId}
        rowCount={total}
        pagination={pagination}
        onPaginationChange={setPagination}
        globalFilter={search}
        onGlobalFilterChange={setSearch}
        isLoading={isLoading}
        isFetching={isFetching}
        searchPlaceholder="Search by discount name or description..."
      />

      {/* Edit. The dialog closes only when updateDiscount resolves. */}
      <EditDiscountDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        discount={selectedDiscount}
        isLoading={isSaving}
        onSubmit={(values, discount) => updateDiscount(discount.id, values)}
      />

      <AppAlertDialog
        open={statusOpen}
        onOpenChange={setStatusOpen}
        title={`${statusChange?.isActive ? "Activate" : "Deactivate"} ${
          statusChange?.discount.name ?? "discount"
        }?`}
        description={
          statusChange?.isActive
            ? "This discount can be applied again."
            : "This discount can no longer be applied."
        }
        confirmText={statusChange?.isActive ? "Activate" : "Deactivate"}
        variant={statusChange?.isActive ? "default" : "destructive"}
        isLoading={
          statusChange
            ? statusUpdatingIds.includes(statusChange.discount.id)
            : false
        }
        onConfirm={() =>
          toggleStatus(statusChange.discount, statusChange.isActive)
        }
      />

      <AppAlertDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete ${discountToDelete?.name ?? "discount"}?`}
        description="This removes the discount from the list. This action cannot be undone."
        confirmText="Delete"
        variant="destructive"
        isLoading={isDeleting}
        onConfirm={() => deleteDiscount(discountToDelete)}
      />
    </div>
  );
}

export default DiscountList;
