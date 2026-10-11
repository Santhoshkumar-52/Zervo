import { SECTION_PADDING } from "./billHelpers";

function BillFooter({ branch = {}, className = "" }) {
  return (
    <footer
      className={`${SECTION_PADDING} bg-muted/40 text-center text-sm text-muted-foreground [print-color-adjust:exact] ${className}`}
    >
      <p className="font-medium text-foreground">
        Thank you for training with {branch.name}.
      </p>
      <p className="mt-1">
        Questions about this bill?{" "}
        {branch.phone ? `Call ${branch.phone}.` : "Ask at the front desk."}
      </p>
      <p className="mt-3 text-xs">
        This is a computer-generated bill and doesn't need a signature.
      </p>
    </footer>
  );
}

export default BillFooter;
