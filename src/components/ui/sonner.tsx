"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

/** Avisos (padrão do E23). Somem em 6 s (critérios gerais §4). */
function Toaster(props: ToasterProps) {
  const { resolvedTheme } = useTheme();

  return (
    <Sonner
      theme={(resolvedTheme as ToasterProps["theme"]) ?? "system"}
      duration={6000}
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
}

export { Toaster };
