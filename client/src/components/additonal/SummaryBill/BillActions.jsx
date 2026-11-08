import { Printer } from "lucide-react";

// Hidden when printing, so the printed bill is just the sheet.
// Plain button with fixed colours: the bill doesn't use the app theme.
function BillActions({ onPrint }) {
  return (
    <div className="flex justify-end print:hidden">
      <button
        type="button"
        onClick={onPrint ?? (() => window.print())}
        className="inline-flex items-center gap-2 rounded-md border border-zinc-400 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
      >
        <Printer aria-hidden="true" className="size-4" />
        Print bill
      </button>
    </div>
  );
}

export default BillActions;
