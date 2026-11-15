"use client";

import { ListFilter } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Drawer, DrawerBody, DrawerContent, DrawerHeader } from "@/components/ui/drawer";
import { cn } from "@/lib/utils";

type Opcao = { valor: string; rotulo: string };
export type Filtro = { nome: string; rotulo: string; valor: string; opcoes: Opcao[] };

/**
 * Filtro da lista que muda a URL na hora (os filtros ficam no endereço: o link pode ser
 * compartilhado e o Voltar do navegador mantém o filtro).
 */
export function FiltroSelect({ nome, rotulo, valor, opcoes, className }: Filtro & { className?: string }) {
  const router = useRouter();
  const caminho = usePathname();
  const parametros = useSearchParams();
  const [pendente, iniciar] = useTransition();

  return (
    <label
      className={cn(
        "flex h-11 items-center gap-1.5 rounded-[12px] border border-borda-padrao bg-fundo-superficie pr-2 pl-3.5 focus-within:ring-[3px] focus-within:ring-ring",
        pendente && "opacity-70",
        className,
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

/**
 * Filtros no celular e no tablet em pé (E49; Figma M 120:3650): o ícone dentro da busca abre uma
 * folha com os mesmos filtros da linha do desktop. A escolha vale na hora (a lista atrás já muda) e o
 * ícone mostra quantos estão ativos.
 */
export function FolhaDeFiltros({ filtros, hrefLimpar }: { filtros: Filtro[]; hrefLimpar: string }) {
  const [aberta, setAberta] = useState(false);
  const ativos = filtros.filter((f) => f.valor).length;
  return (
    <Drawer open={aberta} onOpenChange={setAberta}>
      <button
        type="button"
        onClick={() => setAberta(true)}
        aria-label={ativos ? `Filtros, ${ativos} ${ativos === 1 ? "ativo" : "ativos"}` : "Filtros"}
        className="alvo-toque relative inline-flex size-9 shrink-0 items-center justify-center rounded-[10px] text-texto-secundario outline-none hover:bg-fundo-superficie-alt hover:text-texto-primario focus-visible:ring-[3px] focus-visible:ring-ring lg:hidden"
      >
        <ListFilter aria-hidden className="size-5" />
        {ativos ? (
          <span aria-hidden className="absolute -top-0.5 -right-0.5 flex size-[18px] items-center justify-center rounded-full bg-destaque-amarelo texto-etiqueta text-destaque-marinho-fixo">
            {ativos}
          </span>
        ) : null}
      </button>
      <DrawerContent>
        <DrawerHeader titulo="Filtros" descricao="A lista muda assim que você escolhe." />
        <DrawerBody className="gap-3 px-5">
          {filtros.map((f) => (
            <FiltroSelect key={f.nome} {...f} className="w-full [&_select]:flex-1" />
          ))}
          <div className="flex flex-col gap-2.5 pt-2">
            <Button type="button" onClick={() => setAberta(false)}>
              Ver resultados
            </Button>
            {ativos ? (
              <Button asChild variant="secundario">
                <Link href={hrefLimpar} onClick={() => setAberta(false)}>
                  Limpar filtros
                </Link>
              </Button>
            ) : null}
          </div>
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}
