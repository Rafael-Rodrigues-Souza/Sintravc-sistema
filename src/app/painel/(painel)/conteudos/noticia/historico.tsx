"use client";

import { Eye, History, RotateCcw } from "lucide-react";
import Link from "next/link";
import { Dialog as DialogPrimitive } from "radix-ui";
import * as React from "react";

import { IconeFigma } from "@/components/icone-figma";
import { AlertDialog, AlertDialogContent, AlertDialogFooter } from "@/components/ui/alert-dialog";
import { Alerta } from "@/components/ui/alerta";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { quandoNaBahia } from "@/lib/datas";

import { acaoListarVersoes, type VersaoNaTela } from "../acoes-ciclo-de-vida";

type Carga = { tipo: "carregando" } | { tipo: "erro"; mensagem: string } | { tipo: "pronto"; versoes: VersaoNaTela[] };

/**
 * Histórico de versões (N14, E31; Figma 294:43036): painel lateral com as versões publicadas, quem
 * e quando, o que mudou e qual está no site agora. "Ver esta versão" abre a prévia da versão;
 * "Restaurar como rascunho" põe a versão na cópia de trabalho, sem publicar nada (CA-US21.9).
 */
export function HistoricoDeVersoes({
  id,
  aberto,
  comAlteracoes,
  restaurando,
  aoFechar,
  aoRestaurar,
}: {
  id: string;
  aberto: boolean;
  /** A cópia de trabalho tem mudanças que não estão no site: restaurar as substitui. */
  comAlteracoes: boolean;
  restaurando: boolean;
  aoFechar: () => void;
  aoRestaurar: (versao: number) => Promise<boolean>;
}) {
  const [carga, setCarga] = React.useState<Carga>({ tipo: "carregando" });
  const [confirmar, setConfirmar] = React.useState<number | null>(null);

  const carregar = React.useCallback(async () => {
    setCarga({ tipo: "carregando" });
    const r = await acaoListarVersoes({ id }).catch(() => ({
      tipo: "erro" as const,
      mensagem: "Sem conexão com o servidor. Confira a internet e tente de novo.",
    }));
    setCarga(r.tipo === "versoes" ? { tipo: "pronto", versoes: r.versoes } : r);
  }, [id]);

  return (
    <DialogPrimitive.Root
      open={aberto}
      onOpenChange={(valor) => {
        if (!valor && !restaurando) aoFechar();
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-fundo-sobreposicao data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          aria-describedby="historico-descricao"
          onOpenAutoFocus={() => void carregar()}
          className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[480px] flex-col border-l border-borda-padrao bg-fundo-superficie outline-none data-[state=open]:animate-in data-[state=open]:slide-in-from-right motion-reduce:animate-none"
        >
          <header className="flex items-start gap-3 border-b border-borda-padrao px-6 pt-6 pb-5">
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <DialogPrimitive.Title className="texto-titulo-card-grande text-texto-primario">Histórico de versões</DialogPrimitive.Title>
              <DialogPrimitive.Description id="historico-descricao" className="texto-pequeno text-texto-secundario">
                Cada publicação, ou edição de algo já publicado, vira uma versão. O salvamento automático não cria versões.
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close
              type="button"
              aria-label="Fechar"
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-fundo-superficie-alt text-texto-primario outline-none hover:brightness-95 focus-visible:ring-[3px] focus-visible:ring-ring"
            >
              <IconeFigma src="/painel/icone-fechar.svg" tamanho={18} />
            </DialogPrimitive.Close>
          </header>

          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-6 py-6" aria-busy={carga.tipo === "carregando"}>
            {carga.tipo === "carregando" ? (
              [0, 1, 2].map((i) => (
                <div key={i} className="flex flex-col gap-2.5 rounded-[16px] border border-borda-padrao p-4">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-56" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ))
            ) : carga.tipo === "erro" ? (
              <Alerta tipo="erro" titulo="Não foi possível abrir o histórico">
                <div className="flex flex-col items-start gap-2">
                  {carga.mensagem}
                  <Button type="button" variant="secundario" size="pequeno" onClick={() => void carregar()}>
                    Tentar de novo
                  </Button>
                </div>
              </Alerta>
            ) : carga.versoes.length === 0 ? (
              <section className="flex flex-col items-center gap-3 px-2 py-10 text-center">
                <span className="flex size-16 items-center justify-center rounded-full bg-status-neutro-fundo text-texto-secundario">
                  <History aria-hidden className="size-7" />
                </span>
                <h3 className="texto-titulo-card text-texto-primario">Nenhuma versão publicada ainda</h3>
                <p className="max-w-[340px] texto-pequeno text-texto-secundario">
                  A primeira versão aparece aqui quando a notícia for publicada.
                </p>
                <Button type="button" variant="secundario" onClick={aoFechar}>
                  Voltar ao editor
                </Button>
              </section>
            ) : (
              <ol className="flex flex-col gap-3" aria-label="Versões publicadas">
                {carga.versoes.map((v) => (
                  <li
                    key={v.versao}
                    className={
                      v.noAr
                        ? "flex flex-col gap-1.5 rounded-[16px] border border-borda-padrao bg-fundo-superficie-alt p-4"
                        : "flex flex-col gap-1.5 rounded-[16px] border border-borda-padrao p-4"
                    }
                  >
                    <p className="flex flex-wrap items-center gap-2 texto-titulo-card-pequeno text-texto-primario">
                      <span>{v.noAr ? `Versão ${v.versao} · no site agora` : `Versão ${v.versao}`}</span>
                      {v.noAr ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-status-sucesso-fundo px-2.5 py-1 texto-etiqueta text-status-sucesso-texto uppercase">
                          <span aria-hidden className="size-1.5 rounded-full bg-current" />
                          Publicado
                        </span>
                      ) : null}
                    </p>
                    <p className="texto-pequeno text-texto-secundario">
                      {v.criadoPorNome} · {quandoNaBahia(new Date(v.criadoEm))}
                    </p>
                    <p className="texto-corpo text-texto-primario">{v.resumo}</p>
                    <div className="flex flex-wrap gap-x-5 gap-y-1 pt-1">
                      <Link
                        href={`/painel/conteudos/noticia/${id}/previa?versao=${v.versao}`}
                        className="inline-flex items-center gap-1.5 texto-pequeno font-semibold text-destaque-azul outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring"
                      >
                        <Eye aria-hidden className="size-4" />
                        Ver esta versão
                      </Link>
                      {v.noAr ? null : (
                        <button
                          type="button"
                          disabled={restaurando}
                          onClick={() => setConfirmar(v.versao)}
                          className="inline-flex items-center gap-1.5 texto-pequeno font-semibold text-destaque-azul outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring disabled:opacity-50"
                        >
                          <RotateCcw aria-hidden className="size-4" />
                          Restaurar como rascunho
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            )}
            {carga.tipo === "pronto" && carga.versoes.length > 0 ? (
              <Alerta tipo="informacao" titulo="Restaurar não publica nada">
                A versão escolhida vira o rascunho atual. Você revisa e publica quando quiser. Fica registrado em Atividade.
              </Alerta>
            ) : null}
          </div>

          <footer className="flex items-center border-t border-borda-padrao bg-fundo-superficie-alt px-6 py-4">
            <Button type="button" variant="secundario" onClick={aoFechar} disabled={restaurando}>
              Fechar
            </Button>
          </footer>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>

      <AlertDialog open={confirmar !== null} onOpenChange={(a) => (a || restaurando ? null : setConfirmar(null))}>
        <AlertDialogContent
          icone="/painel/icone-restaurar.svg"
          tom={comAlteracoes ? "aviso" : "neutro"}
          titulo={`Restaurar a versão ${confirmar ?? ""} como rascunho?`}
          descricao={
            comAlteracoes
              ? "O texto do editor passa a ser o desta versão. As alterações que ainda não estão no site são substituídas. O site continua igual até você publicar."
              : "O texto do editor passa a ser o desta versão. O site continua igual até você publicar."
          }
        >
          <AlertDialogFooter>
            <Button type="button" variant="secundario" disabled={restaurando} onClick={() => setConfirmar(null)}>
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={restaurando}
              onClick={async () => {
                if (confirmar === null) return;
                const ok = await aoRestaurar(confirmar);
                setConfirmar(null);
                if (ok) aoFechar();
              }}
            >
              {restaurando ? "Restaurando…" : "Restaurar como rascunho"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DialogPrimitive.Root>
  );
}
