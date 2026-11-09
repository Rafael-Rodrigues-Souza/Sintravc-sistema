"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { cn } from "@/lib/utils";

type Opcao = { valor: string; rotulo: string };

/**
 * Filtro da lista que muda a URL na hora (os filtros ficam no endereço: o link pode ser
 * compartilhado e o Voltar do navegador mantém o filtro).
 */
export function FiltroSelect({ nome, rotulo, valor, opcoes }: { nome: string; rotulo: string; valor: string; opcoes: Opcao[] }) {
  const router = useRouter();
  const caminho = usePathname();
  const parametros = useSearchParams();
  const [pendente, iniciar] = useTransition();

  return (
    <label
      className={cn(
        "flex h-11 items-center gap-1.5 rounded-[12px] border border-borda-padrao bg-fundo-superficie pr-2 pl-3.5 focus-within:ring-[3px] focus-within:ring-ring",
        pendente && "opacity-70",
      )}
    >
      <span className="texto-pequeno text-texto-secundario">{rotulo}:</span>
      <select
        name={nome}
        value={valor}
        onChange={(evento) => {
          const consulta = new URLSearchParams(parametros);
          if (evento.target.value) consulta.set(nome, evento.target.value);
          else consulta.delete(nome);
          consulta.delete("pagina");
          iniciar(() => router.push(`${caminho}${consulta.size ? `?${consulta}` : ""}`));
        }}
        className="min-w-0 cursor-pointer bg-transparent texto-titulo-card-pequeno text-texto-primario outline-none"
      >
        {opcoes.map((opcao) => (
          <option key={opcao.valor} value={opcao.valor}>
            {opcao.rotulo}
          </option>
        ))}
      </select>
    </label>
  );
}
