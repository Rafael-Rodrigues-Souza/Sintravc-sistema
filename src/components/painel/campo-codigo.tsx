"use client";

import { useRef, useState } from "react";

import { DIGITOS_TOTP } from "@/lib/acesso/opcoes-totp";
import { cn } from "@/lib/utils";

/**
 * Código das duas etapas (DIGITOS_TOTP números) (Figma 169:18895): uma caixa por número, avança sozinho,
 * volta com Backspace e aceita colar o código inteiro. O valor vai no campo oculto `name`.
 */
export function CampoCodigo({ name, invalido }: { name: string; invalido?: boolean }) {
  const [digitos, setDigitos] = useState<string[]>(Array(DIGITOS_TOTP).fill(""));
  const caixas = useRef<(HTMLInputElement | null)[]>([]);

  function preencher(inicio: number, texto: string) {
    const numeros = texto.replace(/\D/g, "").slice(0, DIGITOS_TOTP - inicio).split("");
    if (numeros.length === 0) return;
    const novos = [...digitos];
    numeros.forEach((n, i) => (novos[inicio + i] = n));
    setDigitos(novos);
    caixas.current[Math.min(inicio + numeros.length, DIGITOS_TOTP - 1)]?.focus();
  }

  return (
    <fieldset className="flex w-full gap-2.5">
      <legend className="sr-only">Código de {DIGITOS_TOTP} números</legend>
      <input type="hidden" name={name} value={digitos.join("")} />
      {digitos.map((digito, i) => (
        <input
          key={i}
          ref={(el) => {
            caixas.current[i] = el;
          }}
          aria-label={`Número ${i + 1} de ${DIGITOS_TOTP}`}
          aria-invalid={invalido || undefined}
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          autoFocus={i === 0}
          maxLength={DIGITOS_TOTP}
          value={digito}
          onChange={(e) => {
            if (e.target.value === "") {
              const novos = [...digitos];
              novos[i] = "";
              setDigitos(novos);
            } else {
              preencher(i, e.target.value);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && digito === "" && i > 0) caixas.current[i - 1]?.focus();
          }}
          onPaste={(e) => {
            e.preventDefault();
            preencher(0, e.clipboardData.getData("text"));
          }}
          className={cn(
            "h-16 w-full min-w-0 rounded-[12px] border border-borda-forte bg-fundo-superficie text-center",
            "font-condensed text-[32px] leading-[1.12] font-bold text-texto-primario outline-none",
            "focus-visible:border-destaque-azul focus-visible:shadow-[inset_0_0_0_1px_var(--destaque-azul)]",
            "aria-invalid:border-destaque-vermelho",
          )}
        />
      ))}
    </fieldset>
  );
}
