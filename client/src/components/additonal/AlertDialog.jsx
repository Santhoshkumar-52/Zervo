import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/**
 * Reusable confirmation dialog built on the shadcn AlertDialog.
 * Controlled: the parent owns `open`.
 *
 *   <AppAlertDialog
 *     open={open}
 *     onOpenChange={setOpen}
 *     title="Delete staff?"
 *     description="This cannot be undone."
 *     confirmText="Delete"
 *     variant="destructive"
 *     isLoading={deleteMutation.isPending}
 *     onConfirm={() => deleteMutation.mutate(staff)}
 *   />
 *
 * If `onConfirm` returns a promise the dialog stays open until it resolves
 * (and stays open if it rejects). Otherwise it closes right after the click.
 */
function AppAlertDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "default", // "default" | "destructive"
  isLoading = false,
  onConfirm,
  onCancel,
}) {
  const handleConfirm = async () => {
    try {
      await onConfirm?.();
      onOpenChange?.(false);
    } catch {
      // Keep the dialog open; the caller is responsible for showing the error.
    }
  };

  const handleCancel = () => {
    onCancel?.();
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>

          {description && (
            <AlertDialogDescription>{description}</AlertDialogDescription>
          )}
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading} onClick={handleCancel}>
            {cancelText}
          </AlertDialogCancel>

          <AlertDialogAction
            variant={variant}
            disabled={isLoading}
            onClick={handleConfirm}
          >
            {isLoading ? "Please wait..." : confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default AppAlertDialog;
