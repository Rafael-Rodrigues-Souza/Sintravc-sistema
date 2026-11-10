import { CircleAlert, CircleCheck } from "lucide-react";

import type { DadosNoticia } from "@/lib/conteudos/dados";
import { faltasParaPublicar, type CampoObrigatorio } from "@/lib/conteudos/obrigatorios";
import { cn } from "@/lib/utils";

/** Itens conferidos, na ordem da tela (Figma 112:1091, card "Antes de publicar"; E42). */
const ITENS: { rotulo: string; campos: CampoObrigatorio[] }[] = [
  { rotulo: "Manchete", campos: ["titulo"] },
  { rotulo: "Lide e corpo da notícia", campos: ["lide", "corpo"] },
  { rotulo: "Texto alternativo das imagens", campos: ["capaAlt", "imagensDoCorpo"] },
  { rotulo: "Assinatura e categoria", campos: ["assinatura", "categoriaId"] },
];

/** Lista que se confere sozinha enquanto a pessoa escreve. A regra é a mesma do servidor. */
export function ListaAntesDePublicar({ dados, className }: { dados: DadosNoticia; className?: string }) {
  const faltando = new Set(faltasParaPublicar(dados).map((f) => f.campo));
  return (
    <ul className={cn("flex flex-col gap-2.5", className)}>
      {ITENS.map((item) => {
        const ok = item.campos.every((c) => !faltando.has(c));
        const Icone = ok ? CircleCheck : CircleAlert;
        return (
          <li key={item.rotulo} className="flex items-center gap-2.5 texto-pequeno text-texto-secundario">
            <Icone aria-hidden className={cn("size-[18px] shrink-0", ok ? "text-status-sucesso-texto" : "text-status-aviso-texto")} />
            <span>
              {item.rotulo}
              <span className="sr-only">{ok ? ": conferido" : ": falta preencher"}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
