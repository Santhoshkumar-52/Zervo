import { Spinner as SpinnerIcon } from "@/components/ui/spinner";

// Full-screen loading overlay. Blocks clicks while something important
// (like loading the workspace after login) is in progress.
//
//   {isLoading && <Spinner message="Loading your workspace..." />}
function Spinner({ message = "Loading..." }) {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-background/80 backdrop-blur-sm"
    >
      <SpinnerIcon className="size-10 text-primary" />

      {message && (
        <p className="text-sm font-medium text-muted-foreground">{message}</p>
      )}
    </div>
  );
}

export default Spinner;
