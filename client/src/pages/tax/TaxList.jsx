import { useMemo, useState } from "react";

import AppAlertDialog from "@/components/additonal/AlertDialog";
import DataTable from "@/components/additonal/Datatable/DataTable";

import EditTaxDialog from "./EditTaxDialog";
import { getTaxColumns } from "./TaxColumns";

const getRowId = (row) => String(row.id);

/**
 * Tax table (UI only). Data and handlers come from the parent; this component
 * owns just which dialog is open.
 */
function TaxList({ taxes, onUpdate, onDelete, onToggleStatus }) {
  const [editOpen, setEditOpen] = useState(false);
  const [taxToEdit, setTaxToEdit] = useState(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [taxToDelete, setTaxToDelete] = useState(null);

  const [statusOpen, setStatusOpen] = useState(false);
  const [statusChange, setStatusChange] = useState(null);

  const columns = useMemo(
    () =>
      getTaxColumns({
        onEdit: (tax) => {
          setTaxToEdit(tax);
          setEditOpen(true);
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
    [],
  );

  return (
    <div className="space-y-4">
      <DataTable
        fixedRows={7}
        columns={columns}
        data={taxes}
        getRowId={getRowId}
        searchPlaceholder="Search by tax name or description..."
      />

      <EditTaxDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        tax={taxToEdit}
        onSubmit={(values, tax) => onUpdate(tax.id, values)}
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
        onConfirm={() => onToggleStatus(statusChange.tax, statusChange.isActive)}
      />

      <AppAlertDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete ${taxToDelete?.name ?? "tax"}?`}
        description="This removes the tax from the list. This action cannot be undone."
        confirmText="Delete"
        variant="destructive"
        onConfirm={() => onDelete(taxToDelete)}
      />
    </div>
  );
}

export default TaxList;
