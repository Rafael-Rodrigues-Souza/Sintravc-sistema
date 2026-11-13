"use client";

import { Archive, ArchiveRestore, ChevronLeft, Eye } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

import { Alerta } from "@/components/ui/alerta";
import { Button } from "@/components/ui/button";
import { rotuloDaNoticia } from "@/lib/conteudos/dados";
import { rotuloDoDocumento } from "@/lib/documentos/dados";

import { ConfirmarAcao, type PedidoDeAcao } from "../ciclo-de-vida";
import { SeloEstado } from "../selos";

/**
 * Notícia arquivada aberta pelo endereço do editor (RN10): fica só para leitura, fora do site e
 * das listas. A única saída é "Restaurar como rascunho"; o servidor também recusa salvar.
 */
const PALAVRAS = {
  noticia: { nome: "Notícia", este: "Esta notícia", arquivado: "arquivada", ele: "Ela", o: "a", restaurado: "restaurada" },
  edital: { nome: "Edital", este: "Este edital", arquivado: "arquivado", ele: "Ele", o: "o", restaurado: "restaurado" },
  acordo: { nome: "Acordo ou convenção", este: "Este acordo", arquivado: "arquivado", ele: "Ele", o: "o", restaurado: "restaurado" },
} as const;

export function NoticiaArquivada({
  id,
  titulo,
  podeRestaurar,
  temVersao,
  tipo = "noticia",
}: {
  id: string;
  titulo: string;
  /** Notícia, edital ou acordo: a mesma tela serve aos documentos oficiais (E46). */
  tipo?: "noticia" | "edital" | "acordo";
  podeRestaurar: boolean;
  temVersao: boolean;
}) {
  const router = useRouter();
  const [pedido, setPedido] = React.useState<PedidoDeAcao | null>(null);
  const nome = tipo === "noticia" ? rotuloDaNoticia(titulo) : rotuloDoDocumento(tipo, titulo);
  const familia = tipo === "noticia" ? "noticia" : "documento";
  const p = PALAVRAS[tipo];

  return (
    <div className="flex flex-1 flex-col gap-6 px-5 pt-8 pb-12 lg:px-10">
      <header className="flex items-center gap-3">
        <Link
          href="/painel/conteudos?arquivados=1"
          aria-label="Voltar para Arquivados"
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-fundo-superficie-alt text-texto-primario outline-none hover:brightness-95 focus-visible:ring-[3px] focus-visible:ring-ring"
        >
          <ChevronLeft aria-hidden className="size-5" />
        </Link>
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex items-center gap-2">
            <h1 className="truncate texto-titulo-card text-texto-primario">{nome}</h1>
            <SeloEstado estado="arquivado" />
          </div>
          <p className="texto-pequeno text-texto-secundario">{p.nome}</p>
        </div>
      </header>

      <Alerta tipo="informacao" titulo={`${p.este} está ${p.arquivado}`}>
        <div className="flex flex-col items-start gap-3">
          {p.ele} está fora do site e das listas, com histórico e anexos guardados. Para editar, restaure como rascunho: {p.ele.toLowerCase()}{" "}
          continua fora do site até alguém publicar.
          <div className="flex flex-wrap gap-2">
            {podeRestaurar ? (
              <Button
                type="button"
                size="pequeno"
                onClick={() => setPedido({ acao: "restaurar", alvos: [{ id, titulo: nome, acoes: ["restaurar"] }] })}
              >
                <ArchiveRestore aria-hidden />
                Restaurar como rascunho
              </Button>
            ) : null}
            <Button asChild variant="secundario" size="pequeno">
              <Link href={`/painel/conteudos/${familia}/${id}/previa`}>
                <Eye aria-hidden />
                {temVersao ? "Ver como estava" : "Ver o texto"}
              </Link>
            </Button>
          </div>
        </div>
      </Alerta>

      <section className="flex flex-col items-center gap-3 rounded-[16px] border border-dashed border-borda-padrao px-6 py-10 text-center">
        <Archive aria-hidden className="size-8 text-texto-terciario" />
        <p className="max-w-[420px] texto-pequeno text-texto-secundario">O editor volta a abrir quando {p.o} {p.nome.toLowerCase()} for {p.restaurado}.</p>
      </section>

      <ConfirmarAcao
        pedido={pedido}
        aoFechar={() => setPedido(null)}
        aoConcluir={(_acao, feitos) => {
          if (feitos.length > 0) router.refresh();
        }}
      />
    </div>
  );
}
