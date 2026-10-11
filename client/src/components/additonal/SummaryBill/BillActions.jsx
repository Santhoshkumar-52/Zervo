import { Printer } from "lucide-react";

import { Button } from "@/components/ui/button";

// Hidden when printing, so the printed bill is just the sheet.
function BillActions({ onPrint }) {
  return (
    <div className="flex justify-end print:hidden">
      <Button variant="outline" onClick={onPrint ?? (() => window.print())}>
        <Printer data-icon="inline-start" />
        Print bill
      </Button>
    </div>
  );
}

export default BillActions;
