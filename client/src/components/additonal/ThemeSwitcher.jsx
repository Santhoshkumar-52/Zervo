import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Check, Moon, Palette, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "zervo-theme";

// `value` is the class added to <html>. "" = your original neutral theme.
const COLOR_THEMES = [
  { value: "", label: "Default", swatch: "#262626" },
  { value: "theme-ocean", label: "Ocean", swatch: "#2f7fd8" },
  { value: "theme-forest", label: "Forest", swatch: "#2f8f5b" },
  { value: "theme-sunset", label: "Sunset", swatch: "#f0702a" },
  { value: "theme-rose", label: "Rose", swatch: "#e0386a" },
  { value: "theme-violet", label: "Violet", swatch: "#7c4ddb" },
  { value: "theme-slate", label: "Slate", swatch: "#3b4a63" },
  { value: "theme-amber", label: "Amber", swatch: "#f2b01e" },
  { value: "theme-mint", label: "Mint", swatch: "#1fa896" },
];

const THEME_CLASSES = COLOR_THEMES.map((t) => t.value).filter(Boolean);

function readStored() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && typeof saved === "object") {
      return { color: saved.color ?? "", dark: !!saved.dark };
    }
  } catch {
    /* ignore corrupt storage */
  }
  return {
    color: "",
    dark: window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false,
  };
}

function applyToHtml({ color, dark }) {
  const root = document.documentElement;
  root.classList.remove(...THEME_CLASSES);
  if (color) root.classList.add(color);
  root.classList.toggle("dark", dark);
}

export default function ThemeSwitcher() {
  const [theme, setTheme] = useState(readStored);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Update the <html class="..."> tag and remember the choice
  useLayoutEffect(() => {
    applyToHtml(theme);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(theme));
    } catch {
      /* storage unavailable */
    }
  }, [theme]);

  // Close on outside click / Escape
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKeyDown = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="Change theme"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <Palette className="size-4" />
      </Button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border bg-popover p-3 text-popover-foreground shadow-lg">
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            Color
          </p>

          <div className="grid grid-cols-3 gap-2">
            {COLOR_THEMES.map((t) => {
              const selected = theme.color === t.value;
              return (
                <button
                  key={t.label}
                  type="button"
                  onClick={() => setTheme((p) => ({ ...p, color: t.value }))}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-lg border p-2 text-xs transition-colors hover:bg-accent",
                    selected && "border-primary bg-accent"
                  )}
                >
                  <span
                    className="flex size-6 items-center justify-center rounded-full"
                    style={{ backgroundColor: t.swatch }}
                  >
                    {selected && <Check className="size-3.5 text-white" />}
                  </span>
                  {t.label}
                </button>
              );
            })}
          </div>

          <p className="mb-2 mt-3 text-xs font-medium text-muted-foreground">
            Mode
          </p>

          <div className="grid grid-cols-2 gap-2">
            {[
              { dark: false, label: "Light", Icon: Sun },
              { dark: true, label: "Dark", Icon: Moon },
            ].map(({ dark, label, Icon }) => (
              <button
                key={label}
                type="button"
                onClick={() => setTheme((p) => ({ ...p, dark }))}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-lg border p-2 text-sm transition-colors hover:bg-accent",
                  theme.dark === dark && "border-primary bg-accent"
                )}
              >
                <Icon className="size-4" />
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
