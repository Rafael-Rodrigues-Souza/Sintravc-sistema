"use client";

import { ArrowDown, ArrowUp, Download, Link2, Plus, X } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Campo } from "@/components/ui/campo";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import type { LinkDaNoticia } from "@/lib/conteudos/dados";
import { cn } from "@/lib/utils";

import { MENSAGEM_SEM_INTERNET_MIDIA } from "./corpo-rico";
import { SeletorDeMidia } from "./seletor-midia";

export type ArquivoConhecido = { nomeArquivo: string; url: string };

function dominio(url: string | null) {
  try {
    return url ? new URL(url).hostname.replace(/^www\./, "") : "";
  } catch {
    return url ?? "";
  }
}

/**
 * Fontes, links e anexos (Figma 112:1091). "Adicionar link" grava uma fonte; "Adicionar anexo",
 * um arquivo da Mídia (E40). A ordem muda com os botões subir e descer, que funcionam pelo teclado.
 */
export function FontesEAnexos({
  links,
  aoMudar,
  arquivos,
  aoConhecerArquivo,
  conectado,
  limites,
}: {
  links: LinkDaNoticia[];
  aoMudar: (links: LinkDaNoticia[]) => void;
  arquivos: Record<string, ArquivoConhecido>;
  aoConhecerArquivo: (id: string, arquivo: ArquivoConhecido) => void;
  conectado: boolean;
  limites: { tamanhoMaximoBytes: number; mensagemDeTamanho: string };
}) {
  const [linkAberto, setLinkAberto] = React.useState(false);
  const [seletorAberto, setSeletorAberto] = React.useState(false);

  const mover = (de: number, para: number) => {
    const novos = [...links];
    const [item] = novos.splice(de, 1);
    novos.splice(para, 0, item!);
    aoMudar(novos);
  };

  return (
    <div className="flex flex-col gap-3">
      {links.length > 0 ? (
        <ul aria-label="Fontes, links e anexos" className="flex flex-col gap-2.5">
          {links.map((link, indice) => {
            const arquivo = link.midiaId ? arquivos[link.midiaId] : undefined;
            const anexo = link.tipo === "anexo";
            const nome = link.titulo || arquivo?.nomeArquivo || link.url || "Sem título";
            return (
              <li
                key={`${link.tipo}-${link.midiaId ?? link.url}-${indice}`}
                className="flex flex-col gap-3 rounded-[12px] bg-fundo-superficie-alt p-3 sm:flex-row sm:items-center"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-fundo-superficie text-destaque-azul">
                    {anexo ? <Download aria-hidden className="size-4" /> : <Link2 aria-hidden className="size-4" />}
                  </span>
                  <div className="flex min-w-0 flex-col">
                    <p className="truncate texto-titulo-card-pequeno text-texto-primario">{nome}</p>
                    <p className="truncate texto-pequeno text-texto-terciario">
                      {anexo ? `${arquivo?.nomeArquivo ?? "Arquivo da Mídia"} · Anexo` : `${dominio(link.url)} · Fonte`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 self-end sm:self-auto">
                  <label className="mr-2 flex cursor-pointer items-center gap-2 texto-pequeno text-texto-secundario">
                    <input
                      type="checkbox"
                      role="switch"
                      checked={link.visivel}
                      onChange={(evento) =>
                        aoMudar(links.map((l, i) => (i === indice ? { ...l, visivel: evento.target.checked } : l)))
                      }
                      className="peer sr-only"
                    />
                    Visível no site
                    <span
                      aria-hidden
                      className={cn(
                        "relative h-6 w-10 rounded-full transition-colors peer-focus-visible:ring-[3px] peer-focus-visible:ring-ring",
                        link.visivel ? "bg-destaque-azul" : "bg-borda-forte",
                      )}
                    >
                      <span
                        className={cn(
                          "absolute top-0.5 size-5 rounded-full bg-fundo-superficie transition-[left]",
                          link.visivel ? "left-[18px]" : "left-0.5",
                        )}
                      />
                    </span>
                  </label>
                  <BotaoIcone rotulo={`Subir “${nome}”`} desativado={indice === 0} aoClicar={() => mover(indice, indice - 1)}>
                    <ArrowUp />
                  </BotaoIcone>
                  <BotaoIcone
                    rotulo={`Descer “${nome}”`}
                    desativado={indice === links.length - 1}
                    aoClicar={() => mover(indice, indice + 1)}
                  >
                    <ArrowDown />
                  </BotaoIcone>
                  <BotaoIcone rotulo={`Tirar “${nome}”`} aoClicar={() => aoMudar(links.filter((_, i) => i !== indice))}>
                    <X />
                  </BotaoIcone>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <button
          type="button"
          onClick={() => setLinkAberto(true)}
          className="inline-flex items-center gap-1.5 texto-titulo-card-pequeno text-destaque-azul outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring"
        >
          <Plus aria-hidden className="size-4" />
          Adicionar link
        </button>
        <button
          type="button"
          aria-disabled={!conectado || undefined}
          aria-describedby={conectado ? undefined : "dica-anexo-sem-internet"}
          onClick={() => conectado && setSeletorAberto(true)}
          className={cn(
            "inline-flex items-center gap-1.5 texto-titulo-card-pequeno text-destaque-azul outline-none focus-visible:ring-[3px] focus-visible:ring-ring",
            conectado ? "hover:underline" : "cursor-not-allowed opacity-50",
          )}
        >
          <Plus aria-hidden className="size-4" />
          Adicionar anexo
        </button>
        {conectado ? null : (
          <p id="dica-anexo-sem-internet" className="texto-pequeno text-texto-terciario">
            {MENSAGEM_SEM_INTERNET_MIDIA}
          </p>
        )}
      </div>

      <DialogoFonte
        aberto={linkAberto}
        aoMudarAberto={setLinkAberto}
        aoAdicionar={(fonte) => aoMudar([...links, { tipo: "fonte", midiaId: null, visivel: true, ...fonte }])}
      />
      <SeletorDeMidia
        aberto={seletorAberto}
        aoMudarAberto={setSeletorAberto}
        so="todos"
        titulo="Adicionar anexo"
        descricao="Escolha um arquivo da Mídia ou envie um novo. Ele aparece para baixar no fim da notícia."
        limites={limites}
        aoEscolher={(arquivo) => {
          aoConhecerArquivo(arquivo.id, { nomeArquivo: arquivo.nomeArquivo, url: arquivo.url });
          aoMudar([...links, { tipo: "anexo", titulo: arquivo.nomeArquivo, url: null, midiaId: arquivo.id, visivel: true }]);
        }}
      />
    </div>
  );
}

function BotaoIcone({
  rotulo,
  desativado,
  aoClicar,
  children,
}: {
  rotulo: string;
  desativado?: boolean;
  aoClicar: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={rotulo}
      title={rotulo}
      disabled={desativado}
      onClick={aoClicar}
      className="flex size-9 items-center justify-center rounded-[8px] text-texto-secundario outline-none hover:bg-fundo-superficie hover:text-texto-primario focus-visible:ring-[3px] focus-visible:ring-ring disabled:opacity-30 [&_svg]:size-4"
    >
      {children}
    </button>
  );
}

function DialogoFonte({
  aberto,
  aoMudarAberto,
  aoAdicionar,
}: {
  aberto: boolean;
  aoMudarAberto: (a: boolean) => void;
  aoAdicionar: (fonte: { titulo: string; url: string }) => void;
}) {
  return (
    <Dialog open={aberto} onOpenChange={aoMudarAberto}>
      <DialogContent className="max-w-[520px]">
        <DialogHeader titulo="Adicionar link" descricao="Fonte da informação ou link para um documento oficial." />
        {/* Montado só com o diálogo aberto: cada vez começa vazio. */}
        <FormularioFonte aoFechar={() => aoMudarAberto(false)} aoAdicionar={aoAdicionar} />
      </DialogContent>
    </Dialog>
  );
}

function FormularioFonte({
  aoFechar,
  aoAdicionar,
}: {
  aoFechar: () => void;
  aoAdicionar: (fonte: { titulo: string; url: string }) => void;
}) {
  const [titulo, setTitulo] = React.useState("");
  const [url, setUrl] = React.useState("");
  const [erro, setErro] = React.useState<string | undefined>();

  return (
    <form
      onSubmit={(evento) => {
        evento.preventDefault();
        const endereco = /^https?:\/\//i.test(url.trim()) ? url.trim() : `https://${url.trim()}`;
        if (!url.trim() || !/^https?:\/\/[^\s]+\.[^\s]+$/i.test(endereco)) {
          setErro("Confira o endereço. Ex.: https://www.planalto.gov.br");
          return;
        }
        aoAdicionar({ titulo: titulo.trim(), url: endereco });
        aoFechar();
      }}
    >
      <DialogBody>
        <Campo
          id="titulo-da-fonte"
          rotulo="Título"
          placeholder="Ex.: Lei nº 13.467/2017 — Reforma trabalhista"
          value={titulo}
          maxLength={200}
          onChange={(evento) => setTitulo(evento.target.value)}
          autoFocus
        />
        <Campo
          id="endereco-da-fonte"
          rotulo="Endereço"
          placeholder="https://"
          value={url}
          onChange={(evento) => setUrl(evento.target.value)}
          erro={erro}
        />
      </DialogBody>
      <DialogFooter>
        <Button type="button" variant="secundario" onClick={aoFechar}>
          Cancelar
        </Button>
        <Button type="submit">Adicionar link</Button>
      </DialogFooter>
    </form>
  );
}
