// One line in a dropdown list: the name on the left, a short detail on the right.
function OptionRow({ title, detail }) {
  return (
    <span className="flex w-full items-center justify-between gap-3">
      <span className="truncate">{title}</span>
      <span className="shrink-0 text-xs text-muted-foreground">{detail}</span>
    </span>
  );
}

export default OptionRow;
