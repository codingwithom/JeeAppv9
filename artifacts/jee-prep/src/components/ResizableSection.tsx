import { useState, useRef, useEffect, useCallback, ReactNode } from "react";

interface Props {
  storageKey: string;
  defaultHeight?: number;
  defaultWidth?: number;
  minHeight?: number;
  minWidth?: number;
  children: ReactNode;
  className?: string;
  noOverflow?: boolean;
}

type Edge = "top" | "bottom" | "left" | "right" | null;

export function ResizableSection({
  storageKey,
  defaultHeight,
  defaultWidth,
  minHeight = 80,
  minWidth = 120,
  children,
  className = "",
  noOverflow = false,
}: Props) {
  // Use "auto" unless the user has previously saved a manual size
  const [height, setHeight] = useState<number | "auto">(() => {
    try {
      const saved = localStorage.getItem(`jee_resize_h_${storageKey}`);
      if (saved) return Math.max(minHeight, parseInt(saved, 10));
    } catch {}
    return "auto";
  });

  const [width, setWidth] = useState<number | undefined>(() => {
    if (!defaultWidth) return undefined;
    try {
      const saved = localStorage.getItem(`jee_resize_w_${storageKey}`);
      if (saved) return Math.max(minWidth, parseInt(saved, 10));
    } catch {}
    return undefined;
  });

  const [activeEdge, setActiveEdge] = useState<Edge>(null);
  const startPosRef = useRef(0);
  const startSizeRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const startResize = useCallback(
    (edge: Edge, e: React.MouseEvent) => {
      e.preventDefault();
      setActiveEdge(edge);
      if (edge === "top" || edge === "bottom") {
        startPosRef.current = e.clientY;
        // If currently auto, snapshot the rendered height
        const currentH =
          height === "auto"
            ? containerRef.current?.getBoundingClientRect().height ?? (defaultHeight ?? 200)
            : height;
        startSizeRef.current = currentH;
        // Lock to pixel so resize works correctly
        setHeight(currentH);
      } else {
        startPosRef.current = e.clientX;
        startSizeRef.current = width ?? defaultWidth ?? 200;
      }
    },
    [height, width, defaultHeight, defaultWidth]
  );

  useEffect(() => {
    if (!activeEdge) return;

    const onMove = (e: MouseEvent) => {
      if (activeEdge === "bottom") {
        const delta = e.clientY - startPosRef.current;
        setHeight(Math.max(minHeight, startSizeRef.current + delta));
      } else if (activeEdge === "top") {
        const delta = startPosRef.current - e.clientY;
        setHeight(Math.max(minHeight, startSizeRef.current + delta));
      } else if (activeEdge === "right") {
        const delta = e.clientX - startPosRef.current;
        setWidth(Math.max(minWidth, startSizeRef.current + delta));
      } else if (activeEdge === "left") {
        const delta = startPosRef.current - e.clientX;
        setWidth(Math.max(minWidth, startSizeRef.current + delta));
      }
    };

    const onUp = () => {
      setActiveEdge(null);
      setHeight(h => {
        if (h !== "auto") {
          try { localStorage.setItem(`jee_resize_h_${storageKey}`, String(h)); } catch {}
        }
        return h;
      });
      if (defaultWidth) {
        setWidth(w => {
          if (w !== undefined) {
            try { localStorage.setItem(`jee_resize_w_${storageKey}`, String(w)); } catch {}
          }
          return w;
        });
      }
    };

    const cursors: Record<string, string> = {
      top: "ns-resize", bottom: "ns-resize",
      left: "ew-resize", right: "ew-resize",
    };
    document.body.style.cursor = cursors[activeEdge] || "";
    document.body.style.userSelect = "none";

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [activeEdge, storageKey, minHeight, minWidth, defaultWidth]);

  const handleBase = "absolute z-10 select-none";
  const hEdge = `${handleBase} left-2 right-2 h-3 cursor-ns-resize`;
  const vEdge = `${handleBase} top-2 bottom-2 w-3 cursor-ew-resize`;

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-col ${className}`}
      style={{
        height: height === "auto" ? undefined : height,
        ...(width !== undefined ? { width, flexShrink: 0 } : {}),
      }}
    >
      <div
        className={`flex-1 min-h-0 ${noOverflow ? "overflow-hidden" : "overflow-y-auto"}`}
        style={{  }}
      >
        {children}
      </div>

      <div className={`${hEdge} top-0`} onMouseDown={e => startResize("top", e)} />
      <div className={`${hEdge} bottom-0`} onMouseDown={e => startResize("bottom", e)} />
      {defaultWidth !== undefined && (
        <>
          <div className={`${vEdge} left-0`} onMouseDown={e => startResize("left", e)} />
          <div className={`${vEdge} right-0`} onMouseDown={e => startResize("right", e)} />
        </>
      )}
    </div>
  );
}
