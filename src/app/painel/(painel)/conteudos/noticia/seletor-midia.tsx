"use client";

import { Check, FileText, Search } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { enquadramentoDaImagem } from "@/lib/midia/apresentacao";
import { cn } from "@/lib/utils";

import { BotaoEnviarArquivos, ListaDeEnvios, ProvedorDeEnvios } from "../../midia/envios";
import { acaoBuscarMidia, type ArquivoParaEscolher } from "../acoes";

const SO_IMAGENS = ".jpg,.jpeg,.png,.webp,.heic,.heif,image/jpeg,image/png,image/webp,image/heic,image/heif";

/**
 * Escolher um arquivo da Mídia, ou enviar um novo sem sair do editor (capa, imagem no corpo e
 * anexo). O que acabou de ser enviado já vem selecionado.
 */
export function SeletorDeMidia({
  aberto,
  aoMudarAberto,
  so,
  titulo,
  descricao,
  limites,
  aoEscolher,
}: {
  aberto: boolean;
  aoMudarAberto: (aberto: boolean) => void;
  so: "imagens" | "todos";
  titulo: string;
  descricao: string;
  limites: { tamanhoMaximoBytes: number; mensagemDeTamanho: string };
  aoEscolher: (arquivo: ArquivoParaEscolher) => void;
}) {
  return (
    <Dialog open={aberto} onOpenChange={aoMudarAberto}>
      <DialogContent className="max-w-[880px]">
        {/* Montado só com o diálogo aberto: cada vez começa da primeira página, sem seleção. */}
        <ConteudoDoSeletor
          so={so}
          titulo={titulo}
          descricao={descricao}
          limites={limites}
          aoEscolher={aoEscolher}
          aoFechar={() => aoMudarAberto(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function ConteudoDoSeletor({
  so,
  titulo,
  descricao,
  limites,
  aoEscolher,
  aoFechar,
}: {
  so: "imagens" | "todos";
  titulo: string;
  descricao: string;
  limites: { tamanhoMaximoBytes: number; mensagemDeTamanho: string };
  aoEscolher: (arquivo: ArquivoParaEscolher) => void;
  aoFechar: () => void;
}) {
  const [busca, setBusca] = React.useState("");
  const [itens, setItens] = React.useState<ArquivoParaEscolher[] | null>(null);
  const [total, setTotal] = React.useState(0);
  const [pagina, setPagina] = React.useState(1);
  const [erro, setErro] = React.useState<string | null>(null);
  const [selecionado, setSelecionado] = React.useState<string | null>(null);
  const [carregando, iniciar] = React.useTransition();

  const carregar = React.useCallback(
    (opcoes: { busca: string; pagina: number; selecionar?: string }) => {
      iniciar(async () => {
        const resposta = await acaoBuscarMidia({ so, busca: opcoes.busca, pagina: opcoes.pagina });
        if ("erro" in resposta) {
          setErro(resposta.erro);
          return;
        }
        setErro(null);
        setTotal(resposta.total);
        setPagina(opcoes.pagina);
        setItens((atuais) => (opcoes.pagina === 1 ? resposta.itens : [...(atuais ?? []), ...resposta.itens]));
        if (opcoes.selecionar) setSelecionado(opcoes.selecionar);
      });
    },
    [so],
  );

  React.useEffect(() => {
    carregar({ busca: "", pagina: 1 });
  }, [carregar]);

  const escolhido = itens?.find((item) => item.id === selecionado);

  return (
    <ProvedorDeEnvios
      tamanhoMaximoBytes={limites.tamanhoMaximoBytes}
      mensagemDeTamanho={limites.mensagemDeTamanho}
      aceitos={so === "imagens" ? SO_IMAGENS : undefined}
      aoEnviar={(id) => carregar({ busca: "", pagina: 1, selecionar: id })}
    >
      <DialogHeader titulo={titulo} descricao={descricao} />
      <DialogBody>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <form
            role="search"
            className="flex-1"
            onSubmit={(evento) => {
              evento.preventDefault();
              carregar({ busca, pagina: 1 });
            }}
          >
            <label className="flex h-11 w-full items-center gap-2.5 rounded-[12px] border border-borda-padrao bg-fundo-superficie px-3.5 text-texto-terciario focus-within:ring-[3px] focus-within:ring-ring">
              <Search aria-hidden className="size-[18px]" />
              <span className="sr-only">Buscar na Mídia</span>
              <input
                type="search"
                value={busca}
                onChange={(evento) => setBusca(evento.target.value)}
                placeholder="Buscar pelo nome ou pelo texto alternativo"
                className="min-w-0 flex-1 bg-transparent texto-pequeno text-texto-primario outline-none placeholder:text-texto-terciario"
              />
            </label>
          </form>
          <BotaoEnviarArquivos rotulo={so === "imagens" ? "Enviar imagem" : "Enviar arquivo"} variant="secundario" />
        </div>
        <ListaDeEnvios />
        {erro ? <p className="texto-pequeno text-status-perigo-texto">{erro}</p> : null}
        {itens === null ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} className="h-32 rounded-[12px]" />
            ))}
          </div>
        ) : itens.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-status-neutro-fundo text-texto-secundario">
              <Search aria-hidden className="size-6" />
            </span>
            <p className="texto-titulo-card-pequeno text-texto-primario">Nenhum arquivo encontrado</p>
            <p className="texto-pequeno text-texto-secundario">Envie um arquivo novo ou busque por outro nome.</p>
          </div>
        ) : (
          <ul aria-label="Arquivos da Mídia" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {itens.map((item) => {
              const marcado = item.id === selecionado;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    aria-pressed={marcado}
                    onClick={() => setSelecionado(item.id)}
                    onDoubleClick={() => {
                      aoEscolher(item);
                      aoFechar();
                    }}
                    className={cn(
                      "flex w-full flex-col gap-2 rounded-[12px] bg-fundo-superficie p-1.5 text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring",
                      marcado ? "border-2 border-destaque-azul" : "border border-borda-padrao hover:border-borda-forte",
                    )}
                  >
                    <span
                      className={cn(
                        "relative flex h-24 w-full items-center justify-center overflow-hidden rounded-[8px]",
                        (item.tipo === "imagem" && enquadramentoDaImagem(item.mostrarInteira).fundo) || "bg-fundo-superficie-alt",
                      )}
                    >
                      {item.tipo === "imagem" ? (
                        // PNG e WebP (logos) inteiros e sobre o xadrez, nos dois temas; JPG (foto) preenche (E48).
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.url} alt="" loading="lazy" className={cn("size-full", enquadramentoDaImagem(item.mostrarInteira).imagem)} />
                      ) : (
                        <FileText aria-hidden className="size-8 text-texto-terciario" />
                      )}
                      {marcado ? (
                        <span className="absolute top-1.5 left-1.5 flex size-6 items-center justify-center rounded-full bg-destaque-azul text-texto-invertido">
                          <Check aria-hidden className="size-4" />
                        </span>
                      ) : null}
                    </span>
                    <span className="truncate px-1 pb-1 texto-pequeno text-texto-primario">{item.nomeArquivo}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {itens && itens.length < total ? (
          <Button
            type="button"
            variant="secundario"
            size="pequeno"
            className="self-center"
            disabled={carregando}
            onClick={() => carregar({ busca, pagina: pagina + 1 })}
          >
            Carregar mais
          </Button>
        ) : null}
      </DialogBody>
      <DialogFooter>
        <Button type="button" variant="secundario" onClick={aoFechar}>
          Cancelar
        </Button>
        <Button
          type="button"
          disabled={!escolhido}
          onClick={() => {
            if (!escolhido) return;
            aoEscolher(escolhido);
            aoFechar();
          }}
        >
          Usar este arquivo
        </Button>
      </DialogFooter>
    </ProvedorDeEnvios>
  );
}
