"use client";

import { Archive, ArchiveRestore, ChevronLeft, Eye } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

import { Alerta } from "@/components/ui/alerta";
import { Button } from "@/components/ui/button";
import { rotuloDaNoticia } from "@/lib/conteudos/dados";

import { ConfirmarAcao, type PedidoDeAcao } from "../ciclo-de-vida";
import { SeloEstado } from "../selos";

/**
 * Notícia arquivada aberta pelo endereço do editor (RN10): fica só para leitura, fora do site e
 * das listas. A única saída é "Restaurar como rascunho"; o servidor também recusa salvar.
 */
export function NoticiaArquivada({
  id,
  titulo,
  podeRestaurar,
  temVersao,
}: {
  id: string;
  titulo: string;
  podeRestaurar: boolean;
  temVersao: boolean;
}) {
  const router = useRouter();
  const [pedido, setPedido] = React.useState<PedidoDeAcao | null>(null);
  const nome = rotuloDaNoticia(titulo);

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
          <p className="texto-pequeno text-texto-secundario">Notícia</p>
        </div>
      </header>

      <Alerta tipo="informacao" titulo="Esta notícia está arquivada">
        <div className="flex flex-col items-start gap-3">
          Ela está fora do site e das listas, com histórico e anexos guardados. Para editar, restaure como rascunho: ela continua
          fora do site até alguém publicar.
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
              <Link href={`/painel/conteudos/noticia/${id}/previa`}>
                <Eye aria-hidden />
                {temVersao ? "Ver como estava" : "Ver o texto"}
              </Link>
            </Button>
          </div>
        </div>
      </Alerta>

      <section className="flex flex-col items-center gap-3 rounded-[16px] border border-dashed border-borda-padrao px-6 py-10 text-center">
        <Archive aria-hidden className="size-8 text-texto-terciario" />
        <p className="max-w-[420px] texto-pequeno text-texto-secundario">O editor volta a abrir quando a notícia for restaurada.</p>
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
