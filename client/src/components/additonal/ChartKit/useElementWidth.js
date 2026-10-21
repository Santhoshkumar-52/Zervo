import { useEffect, useRef, useState } from "react";

// Follows the width of an element, so a chart can fill its parent and stay
// responsive. Attach `ref` to the wrapper:
//   const [ref, width] = useElementWidth();
export function useElementWidth() {
  const ref = useRef(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const element = ref.current;

    if (!element) return undefined;

    const observer = new ResizeObserver(([entry]) => {
      setWidth(entry.contentRect.width);
    });

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  return [ref, width];
}
