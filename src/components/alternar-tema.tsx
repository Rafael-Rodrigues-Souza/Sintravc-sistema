"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";

/** Alterna entre os temas claro e escuro. */
export function AlternarTema() {
  const { resolvedTheme, setTheme } = useTheme();
  const escuro = resolvedTheme === "dark";

  return (
    <Button
      variant="secundario"
      size="icone"
      onClick={() => setTheme(escuro ? "light" : "dark")}
      aria-label={escuro ? "Usar tema claro" : "Usar tema escuro"}
      title={escuro ? "Usar tema claro" : "Usar tema escuro"}
    >
      <Sun className="hidden dark:block" aria-hidden />
      <Moon className="block dark:hidden" aria-hidden />
    </Button>
  );
}
