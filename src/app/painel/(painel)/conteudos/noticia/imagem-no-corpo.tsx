"use client";

import { NodeViewWrapper, type Editor, type ReactNodeViewProps } from "@tiptap/react";
import { CircleAlert, PencilLine } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Campo } from "@/components/ui/campo";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/** Ligado depois que a pessoa tenta publicar: as imagens sem texto alternativo ficam marcadas (CA-US21.3). */
export const MarcarImagensSemAlt = React.createContext(false);

const vazio = (texto: unknown) => String(texto ?? "").trim() === "";

/**
 * Imagem no corpo da notícia, dentro do editor. Ao clicar nela, aparece "Editar texto alternativo e
 * legenda". Depois de tentar publicar, a que estiver sem texto alternativo fica com borda e aviso.
 */
export function ImagemNoCorpo({ node, selected, updateAttributes }: ReactNodeViewProps) {
  const marcar = React.useContext(MarcarImagensSemAlt);
  const [editando, setEditando] = React.useState(false);
  const { src, alt, title } = node.attrs as { src: string; alt: string | null; title: string | null };
  const semAlt = marcar && vazio(alt);
  const idAviso = React.useId();

  return (
    <NodeViewWrapper as="figure" data-imagem-do-corpo="" data-sem-alt={semAlt || undefined} className="relative my-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt ?? ""}
        title={title ?? undefined}
        aria-describedby={semAlt ? idAviso : undefined}
        className={cn(
          "max-h-[420px] rounded-[12px]",
          selected && "ring-[3px] ring-destaque-azul",
          semAlt && "ring-[3px] ring-destaque-vermelho",
        )}
      />
      {semAlt ? (
        <p id={idAviso} contentEditable={false} className="mt-2 flex items-center gap-1.5 texto-pequeno text-status-perigo-texto">
          <CircleAlert aria-hidden className="size-4 shrink-0" />
          Falta o texto alternativo desta imagem.
        </p>
      ) : null}
      {selected || semAlt ? (
        <div contentEditable={false} className="mt-2">
          <Button
            type="button"
            variant="secundario"
            size="pequeno"
            data-editar-imagem=""
            onMouseDown={(evento) => evento.preventDefault()}
            onClick={() => setEditando(true)}
          >
            <PencilLine aria-hidden />
            Editar texto alternativo e legenda
          </Button>
        </div>
      ) : null}
      <DialogoImagem
        aberto={editando}
        url={src}
        inicial={{ alt: alt ?? "", legenda: title ?? "" }}
        rotuloAcao="Salvar"
        aoFechar={() => setEditando(false)}
        aoSalvar={({ alt: novoAlt, legenda }) => {
          updateAttributes({ alt: novoAlt, title: legenda });
          setEditando(false);
        }}
      />
    </NodeViewWrapper>
  );
}

/**
 * Leva a pessoa à primeira imagem do corpo sem texto alternativo: seleciona a imagem e põe o foco no
 * botão de editar. Devolve false se não houver.
 */
export function irParaImagemSemAlt(editor: Editor): boolean {
  let posicao: number | null = null;
  editor.state.doc.descendants((no, pos) => {
    if (posicao !== null) return false;
    if (no.type.name === "image" && vazio(no.attrs.alt)) posicao = pos;
    return true;
  });
  if (posicao === null) return false;
  editor.chain().focus().setNodeSelection(posicao).scrollIntoView().run();
  requestAnimationFrame(() => {
    const figura = editor.view.nodeDOM(posicao!) as HTMLElement | null;
    figura?.scrollIntoView({ block: "center", behavior: "smooth" });
    figura?.querySelector<HTMLElement>("[data-editar-imagem]")?.focus({ preventScroll: true });
  });
  return true;
}

/** Texto alternativo e legenda da imagem: ao inserir (vêm da Mídia) e ao editar depois. */
export function DialogoImagem({
  aberto,
  url,
  inicial,
  rotuloAcao,
  aoFechar,
  aoSalvar,
}: {
  aberto: boolean;
  url: string;
  inicial: { alt: string; legenda: string };
  rotuloAcao: string;
  aoFechar: () => void;
  aoSalvar: (valores: { alt: string; legenda: string }) => void;
}) {
  return (
    <Dialog open={aberto} onOpenChange={(a) => (a ? null : aoFechar())}>
      <DialogContent className="max-w-[560px]">
        <DialogHeader titulo="Imagem no corpo" descricao="O texto alternativo é lido por quem usa leitor de tela." />
        {/* Montado só com o diálogo aberto: o formulário começa com os valores atuais. */}
        {aberto ? <FormularioImagem url={url} inicial={inicial} rotuloAcao={rotuloAcao} aoFechar={aoFechar} aoSalvar={aoSalvar} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function FormularioImagem({
  url,
  inicial,
  rotuloAcao,
  aoFechar,
  aoSalvar,
}: {
  url: string;
  inicial: { alt: string; legenda: string };
  rotuloAcao: string;
  aoFechar: () => void;
  aoSalvar: (valores: { alt: string; legenda: string }) => void;
}) {
  const [alt, setAlt] = React.useState(inicial.alt);
  const [legenda, setLegenda] = React.useState(inicial.legenda);
  return (
    <form
      onSubmit={(evento) => {
        evento.preventDefault();
        aoSalvar({ alt: alt.trim(), legenda: legenda.trim() });
      }}
    >
      <DialogBody>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="" className="max-h-48 w-full rounded-[12px] object-cover" />
        <Campo
          id="alt-da-imagem"
          rotulo="Texto alternativo"
          ajuda="Obrigatório para publicar. Descreva o que aparece na imagem."
          value={alt}
          maxLength={250}
          onChange={(evento) => setAlt(evento.target.value)}
        />
        <div className="flex flex-col gap-2">
          <Label htmlFor="legenda-da-imagem">Legenda e crédito</Label>
          <Input id="legenda-da-imagem" value={legenda} maxLength={300} onChange={(evento) => setLegenda(evento.target.value)} />
        </div>
      </DialogBody>
      <DialogFooter>
        <Button type="button" variant="secundario" onClick={aoFechar}>
          Cancelar
        </Button>
        <Button type="submit">{rotuloAcao}</Button>
      </DialogFooter>
    </form>
  );
}
