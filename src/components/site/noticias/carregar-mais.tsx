"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { acaoMaisNoticias, type PedidoMaisNoticias } from "@/app/(site)/noticias/acoes";
import { Button } from "@/components/ui/button";
import { NOTICIAS_PAGINA } from "@/conteudo/site";
import type { NoticiaDoSite } from "@/lib/noticias-do-site/consultas";
import { cn } from "@/lib/utils";

import { CartaoNoticia } from "./cartao-noticia";

/**
 * “Carregar mais notícias” (Figma 81:995; E59): no celular e no tablet em pé, no lugar da
 * paginação. Acrescenta a página seguinte com os mesmos filtros e a mesma ordem; o foco vai para a
 * primeira notícia nova, e a região viva diz quantas chegaram. Do lg em diante, some (a paginação
 * numerada aparece), mas o que já foi carregado continua na grade.
 */
export function CarregarMais({
  filtros,
  pagina,
  paginas,
  className,
}: {
  filtros: Omit<PedidoMaisNoticias, "pagina">;
  pagina: number;
  paginas: number;
  className?: string;
}) {
  const [extras, setExtras] = useState<NoticiaDoSite[]>([]);
  const [ultima, setUltima] = useState(pagina);
  const [total, setTotal] = useState(paginas);
  const [aviso, setAviso] = useState("");
  const [carregando, iniciar] = useTransition();
  const primeiraNova = useRef<HTMLAnchorElement>(null);
  const [focarEm, setFocarEm] = useState<string | null>(null);

  useEffect(() => {
    if (focarEm) primeiraNova.current?.focus();
  }, [focarEm]);

  function carregar() {
    iniciar(async () => {
      try {
        const r = await acaoMaisNoticias({ ...filtros, pagina: ultima + 1 });
        if (r.tipo !== "ok") throw new Error("pedido recusado");
        setExtras((atuais) => [...atuais, ...r.itens]);
        setUltima((u) => u + 1);
        setTotal(r.paginas);
        setFocarEm(r.itens[0]?.id ?? null);
        setAviso(r.itens.length === 1 ? "Mais 1 notícia carregada." : `Mais ${r.itens.length} notícias carregadas.`);
      } catch {
        toast.error("Não conseguimos carregar mais notícias.", {
          description: "Confira a internet e tente de novo.",
          duration: Infinity,
          closeButton: true,
          action: { label: "Tentar de novo", onClick: carregar },
        });
      }
    });
  }

  return (
    <>
      {extras.length > 0 ? (
        <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {extras.map((n) => (
            <li key={n.id} className="flex">
              <CartaoNoticia noticia={n} refDoLink={n.id === focarEm ? primeiraNova : undefined} className="w-full" />
            </li>
          ))}
        </ul>
      ) : null}
      <p role="status" className="sr-only">
        {aviso}
      </p>
      {ultima < total ? (
        <div className={cn("justify-center", className)}>
          <Button type="button" variant="secundario" onClick={carregar} disabled={carregando} className="w-full sm:w-auto">
            {carregando ? "Carregando…" : NOTICIAS_PAGINA.carregarMais}
          </Button>
        </div>
      ) : null}
    </>
  );
}
