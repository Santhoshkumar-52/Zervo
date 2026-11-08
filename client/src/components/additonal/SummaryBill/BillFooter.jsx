function BillFooter({ branch = {}, className = "" }) {
  return (
    <footer
      className={`border-t-2 border-zinc-900 px-5 py-4 text-center text-sm text-zinc-700 sm:px-7 lg:flex lg:items-center lg:justify-between lg:gap-8 lg:text-left ${className}`}
    >
      <div>
        <p className="font-semibold text-zinc-900">
          Thank you for training with {branch.name}.
        </p>
        <p className="mt-0.5">
          Questions about this bill?{" "}
          {branch.phone ? `Call ${branch.phone}.` : "Ask at the front desk."}
        </p>
      </div>

      <p className="mt-2 text-xs text-zinc-600 lg:mt-0 lg:max-w-xs lg:text-right">
        This is a computer-generated bill and doesn't need a signature.
      </p>
    </footer>
  );
}

export default BillFooter;
