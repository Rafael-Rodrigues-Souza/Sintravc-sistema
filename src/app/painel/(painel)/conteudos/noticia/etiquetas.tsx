"use client";

import { X } from "lucide-react";
import * as React from "react";

/**
 * Palavras-chave como etiquetas (Figma 112:1091): Enter ou vírgula acrescenta; × ou Backspace
 * (com o campo vazio) tira a última. Ajudam na busca do site.
 */
export function Etiquetas({ id, valor, aoMudar }: { id: string; valor: string[]; aoMudar: (novas: string[]) => void }) {
  const [texto, setTexto] = React.useState("");
  const entrada = React.useRef<HTMLInputElement>(null);

  const acrescentar = (bruto: string) => {
    const novas = bruto
      .split(",")
      .map((p) => p.trim().slice(0, 50))
      .filter((p) => p && !valor.includes(p));
    if (novas.length > 0) aoMudar([...valor, ...novas].slice(0, 20));
    setTexto("");
  };

  return (
    <div
      className="flex min-h-[52px] flex-wrap items-center gap-2 rounded-[14px] border border-borda-forte bg-fundo-superficie px-3 py-2 focus-within:border-destaque-azul focus-within:shadow-[inset_0_0_0_1px_var(--destaque-azul),0_0_0_4px_color-mix(in_srgb,var(--destaque-azul)_16%,transparent)]"
      onClick={() => entrada.current?.focus()}
    >
      <ul aria-label="Palavras-chave escolhidas" className="contents">
        {valor.map((palavra) => (
          <li
            key={palavra}
            className="inline-flex items-center gap-1 rounded-full bg-destaque-azul-suave py-1 pr-1.5 pl-3 texto-pequeno text-destaque-azul"
          >
            {palavra}
            <button
              type="button"
              aria-label={`Tirar “${palavra}”`}
              onClick={() => aoMudar(valor.filter((p) => p !== palavra))}
              className="flex size-5 items-center justify-center rounded-full outline-none hover:bg-destaque-azul/15 focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X aria-hidden className="size-3.5" />
            </button>
          </li>
        ))}
      </ul>
      <input
        ref={entrada}
        id={id}
        value={texto}
        onChange={(evento) => {
          const novo = evento.target.value;
          if (novo.includes(",")) acrescentar(novo);
          else setTexto(novo);
        }}
        onKeyDown={(evento) => {
          if (evento.key === "Enter") {
            evento.preventDefault();
            acrescentar(texto);
          } else if (evento.key === "Backspace" && texto === "" && valor.length > 0) {
            aoMudar(valor.slice(0, -1));
          }
        }}
        onBlur={() => texto.trim() && acrescentar(texto)}
        placeholder={valor.length === 0 ? "Digite e tecle Enter" : ""}
        className="min-w-[140px] flex-1 bg-transparent texto-pequeno text-texto-primario outline-none placeholder:text-texto-terciario"
      />
    </div>
  );
}
