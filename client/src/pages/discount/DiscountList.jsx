import { useMemo, useState } from "react";

import AppAlertDialog from "@/components/additonal/AlertDialog";
import DataTable from "@/components/additonal/Datatable/DataTable";

import { getDiscountColumns } from "./DiscountColumns";
import EditDiscountDialog from "./EditDiscountDialog";

const getRowId = (row) => String(row.id);

/**
 * Discount table (UI only). Data and handlers come from the parent; this
 * component owns just which dialog is open.
 */
function DiscountList({ discounts, onUpdate, onDelete, onToggleStatus }) {
  const [editOpen, setEditOpen] = useState(false);
  const [discountToEdit, setDiscountToEdit] = useState(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [discountToDelete, setDiscountToDelete] = useState(null);

  const [statusOpen, setStatusOpen] = useState(false);
  const [statusChange, setStatusChange] = useState(null);

  const columns = useMemo(
    () =>
      getDiscountColumns({
        onEdit: (discount) => {
          setDiscountToEdit(discount);
          setEditOpen(true);
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
    [],
  );

  return (
    <div className="space-y-4">
      <DataTable
        fixedRows={7}
        columns={columns}
        data={discounts}
        getRowId={getRowId}
        searchPlaceholder="Search by discount name..."
      />

      <EditDiscountDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        discount={discountToEdit}
        onSubmit={(values, discount) => onUpdate(discount.id, values)}
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
        onConfirm={() =>
          onToggleStatus(statusChange.discount, statusChange.isActive)
        }
      />

      <AppAlertDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete ${discountToDelete?.name ?? "discount"}?`}
        description="This removes the discount from the list. This action cannot be undone."
        confirmText="Delete"
        variant="destructive"
        onConfirm={() => onDelete(discountToDelete)}
      />
    </div>
  );
}

export default DiscountList;
