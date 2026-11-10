"use client";

import Image from "@tiptap/extension-image";
import { EditorContent, useEditor, useEditorState, type Editor, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Underline,
  Undo2,
} from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Campo } from "@/components/ui/campo";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { contarPalavras, tempoDeLeitura } from "@/lib/conteudos/corpo";
import { paraJsonSimples } from "@/lib/conteudos/json";
import type { DocCorpo } from "@/lib/conteudos/dados";
import { normalizarEndereco } from "@/lib/conteudos/enderecos";
import { cn } from "@/lib/utils";

import type { ArquivoParaEscolher } from "../acoes";
import { SeletorDeMidia } from "./seletor-midia";

/** Imagem do corpo: só da Mídia, com o id do arquivo guardado no nó (RN16, E40). */
const ImagemDaMidia = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      midiaId: {
        default: null,
        parseHTML: (elemento) => elemento.getAttribute("data-midia-id"),
        renderHTML: (atributos) => (atributos.midiaId ? { "data-midia-id": atributos.midiaId } : {}),
      },
    };
  },
});

/** Só os formatos do Figma 112:1091; o servidor confere de novo (limparCorpo). */
const EXTENSOES = [
  StarterKit.configure({
    heading: { levels: [2] },
    code: false,
    codeBlock: false,
    strike: false,
    horizontalRule: false,
    link: { openOnClick: false, autolink: true, protocols: ["mailto"], defaultProtocol: "https" },
  }),
  ImagemDaMidia.configure({ HTMLAttributes: { class: "imagem-do-corpo" } }),
];

export const MENSAGEM_SEM_INTERNET_MIDIA = "Conecte-se à internet para enviar ou escolher arquivos da Mídia";

export function CorpoRico({
  valor,
  aoMudar,
  aoCriar,
  conectado,
  limites,
  rodape,
}: {
  valor: DocCorpo;
  aoMudar: (doc: DocCorpo) => void;
  /** Entrega o editor para os botões de desfazer e refazer do topo da tela. */
  aoCriar: (editor: Editor | null) => void;
  conectado: boolean;
  limites: { tamanhoMaximoBytes: number; mensagemDeTamanho: string };
  rodape: React.ReactNode;
}) {
  const aoMudarRef = React.useRef(aoMudar);
  React.useEffect(() => {
    aoMudarRef.current = aoMudar;
  });

  const editor = useEditor({
    extensions: EXTENSOES,
    content: valor as JSONContent,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        "aria-label": "Corpo da notícia",
        "aria-multiline": "true",
        role: "textbox",
        class:
          "corpo-da-noticia min-h-[280px] px-5 py-4 texto-corpo text-texto-primario outline-none [&_h2]:mt-5 [&_h2]:mb-2 [&_h2]:texto-titulo-card [&_p]:mb-3 [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:mb-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_blockquote]:mb-3 [&_blockquote]:border-l-4 [&_blockquote]:border-destaque-amarelo [&_blockquote]:pl-4 [&_blockquote]:text-texto-secundario [&_a]:text-destaque-azul [&_a]:underline [&_img]:my-3 [&_img]:max-h-[420px] [&_img]:rounded-[12px] [&_img.ProseMirror-selectednode]:ring-[3px] [&_img.ProseMirror-selectednode]:ring-destaque-azul",
      },
    },
    // Cópia em JSON puro: os atributos do ProseMirror não têm protótipo e não podem ir para o servidor assim.
    onUpdate: ({ editor: atual }) => aoMudarRef.current(paraJsonSimples(atual.getJSON()) as DocCorpo),
  });

  React.useEffect(() => {
    aoCriar(editor);
    return () => aoCriar(null);
  }, [editor, aoCriar]);

  // Conteúdo trocado por fora (ex.: "Usar a versão do servidor" no conflito).
  React.useEffect(() => {
    if (!editor) return;
    if (JSON.stringify(editor.getJSON()) !== JSON.stringify(valor)) {
      editor.commands.setContent(valor as JSONContent, { emitUpdate: false });
    }
  }, [editor, valor]);

  const palavras = contarPalavras(valor);
  const minutos = tempoDeLeitura(palavras);

  return (
    <div className="flex flex-col overflow-hidden rounded-[14px] border border-borda-forte bg-fundo-superficie focus-within:border-destaque-azul">
      <BarraDeFerramentas editor={editor} conectado={conectado} limites={limites} />
      <EditorContent editor={editor} />
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-borda-padrao px-4 py-2.5 texto-pequeno text-texto-terciario">
        <span>
          {palavras} {palavras === 1 ? "palavra" : "palavras"}
          {minutos > 0 ? ` · cerca de ${minutos} min de leitura` : ""}
        </span>
        {rodape}
      </div>
    </div>
  );
}

function BarraDeFerramentas({
  editor,
  conectado,
  limites,
}: {
  editor: Editor | null;
  conectado: boolean;
  limites: { tamanhoMaximoBytes: number; mensagemDeTamanho: string };
}) {
  const ativo = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      e
        ? {
            negrito: e.isActive("bold"),
            italico: e.isActive("italic"),
            sublinhado: e.isActive("underline"),
            subtitulo: e.isActive("heading", { level: 2 }),
            lista: e.isActive("bulletList"),
            numerada: e.isActive("orderedList"),
            citacao: e.isActive("blockquote"),
            link: e.isActive("link"),
            podeDesfazer: e.can().undo(),
            podeRefazer: e.can().redo(),
          }
        : null,
  });
  const [linkAberto, setLinkAberto] = React.useState(false);
  const [seletorAberto, setSeletorAberto] = React.useState(false);
  const [imagem, setImagem] = React.useState<ArquivoParaEscolher | null>(null);

  if (!editor || !ativo) return <div className="h-[52px] border-b border-borda-padrao bg-fundo-superficie-alt" />;
  const cadeia = () => editor.chain().focus();

  return (
    <div
      role="toolbar"
      aria-label="Formatação do corpo"
      className="flex flex-wrap items-center gap-1 border-b border-borda-padrao bg-fundo-superficie-alt px-2 py-1.5"
    >
      <Botao rotulo="Desfazer (Ctrl+Z)" desativado={!ativo.podeDesfazer} aoClicar={() => cadeia().undo().run()}>
        <Undo2 />
      </Botao>
      <Botao rotulo="Refazer (Ctrl+Shift+Z)" desativado={!ativo.podeRefazer} aoClicar={() => cadeia().redo().run()}>
        <Redo2 />
      </Botao>
      <Separador />
      <label className="sr-only" htmlFor="estilo-do-bloco">
        Estilo do parágrafo
      </label>
      <select
        id="estilo-do-bloco"
        value={ativo.subtitulo ? "h2" : "p"}
        onChange={(evento) =>
          evento.target.value === "h2" ? cadeia().setHeading({ level: 2 }).run() : cadeia().setParagraph().run()
        }
        className="h-9 rounded-[8px] border border-borda-padrao bg-fundo-superficie px-2 texto-pequeno text-texto-primario outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
      >
        <option value="p">Parágrafo</option>
        <option value="h2">Subtítulo</option>
      </select>
      <Separador />
      <Botao rotulo="Negrito (Ctrl+B)" ligado={ativo.negrito} aoClicar={() => cadeia().toggleBold().run()}>
        <Bold />
      </Botao>
      <Botao rotulo="Itálico (Ctrl+I)" ligado={ativo.italico} aoClicar={() => cadeia().toggleItalic().run()}>
        <Italic />
      </Botao>
      <Botao rotulo="Sublinhado (Ctrl+U)" ligado={ativo.sublinhado} aoClicar={() => cadeia().toggleUnderline().run()}>
        <Underline />
      </Botao>
      <Separador />
      <Botao rotulo="Lista" ligado={ativo.lista} aoClicar={() => cadeia().toggleBulletList().run()}>
        <List />
      </Botao>
      <Botao rotulo="Lista numerada" ligado={ativo.numerada} aoClicar={() => cadeia().toggleOrderedList().run()}>
        <ListOrdered />
      </Botao>
      <Botao rotulo="Citação" ligado={ativo.citacao} aoClicar={() => cadeia().toggleBlockquote().run()}>
        <Quote />
      </Botao>
      <Separador />
      <Botao rotulo="Link" ligado={ativo.link} aoClicar={() => setLinkAberto(true)}>
        <Link2 />
      </Botao>
      <Botao
        rotulo={conectado ? "Imagem da Mídia" : MENSAGEM_SEM_INTERNET_MIDIA}
        desativado={!conectado}
        aoClicar={() => setSeletorAberto(true)}
      >
        <ImagePlus />
      </Botao>

      <DialogoLink editor={editor} aberto={linkAberto} aoMudarAberto={setLinkAberto} />
      <SeletorDeMidia
        aberto={seletorAberto}
        aoMudarAberto={setSeletorAberto}
        so="imagens"
        titulo="Imagem no corpo da notícia"
        descricao="Escolha uma imagem da Mídia ou envie uma nova."
        limites={limites}
        aoEscolher={setImagem}
      />
      <DialogoImagem
        imagem={imagem}
        aoFechar={() => setImagem(null)}
        aoInserir={(atributos) => {
          cadeia().setImage(atributos as Parameters<Editor["commands"]["setImage"]>[0]).run();
          setImagem(null);
        }}
      />
    </div>
  );
}

function Separador() {
  return <span aria-hidden className="mx-1 h-6 w-px bg-borda-padrao" />;
}

function Botao({
  rotulo,
  ligado,
  desativado,
  aoClicar,
  children,
}: {
  rotulo: string;
  ligado?: boolean;
  desativado?: boolean;
  aoClicar: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={rotulo}
      aria-label={rotulo}
      aria-pressed={ligado === undefined ? undefined : ligado}
      // aria-disabled (e não disabled) para a dica continuar aparecendo e ser lida.
      aria-disabled={desativado || undefined}
      onClick={() => {
        if (!desativado) aoClicar();
      }}
      className={cn(
        "flex size-9 items-center justify-center rounded-[8px] text-texto-primario outline-none focus-visible:ring-[3px] focus-visible:ring-ring [&_svg]:size-[18px]",
        ligado ? "bg-fundo-marinho text-texto-invertido" : "hover:bg-fundo-superficie",
        desativado && "cursor-not-allowed opacity-40 hover:bg-transparent",
      )}
    >
      {children}
    </button>
  );
}

function DialogoLink({ editor, aberto, aoMudarAberto }: { editor: Editor; aberto: boolean; aoMudarAberto: (a: boolean) => void }) {
  return (
    <Dialog open={aberto} onOpenChange={aoMudarAberto}>
      <DialogContent className="max-w-[480px]">
        <DialogHeader titulo="Link" descricao="Selecione o texto antes. Deixe vazio para tirar o link." />
        {/* Montado só com o diálogo aberto: o formulário começa com o link atual. */}
        <FormularioLink editor={editor} aoFechar={() => aoMudarAberto(false)} />
      </DialogContent>
    </Dialog>
  );
}

function FormularioLink({ editor, aoFechar }: { editor: Editor; aoFechar: () => void }) {
  const [endereco, setEndereco] = React.useState(() => String(editor.getAttributes("link").href ?? ""));
  const [erro, setErro] = React.useState<string | undefined>();

  const aplicar = () => {
    const texto = endereco.trim();
    if (!texto) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      aoFechar();
      return;
    }
    const href = normalizarEndereco(texto, { aceitarEmail: true });
    if (!href) {
      setErro("Confira o endereço. Ex.: https://www.planalto.gov.br");
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    aoFechar();
  };

  return (
    <form
      onSubmit={(evento) => {
        evento.preventDefault();
        aplicar();
      }}
    >
      <DialogBody>
        <Campo
          id="endereco-do-link"
          rotulo="Endereço"
          value={endereco}
          onChange={(evento) => setEndereco(evento.target.value)}
          placeholder="https://"
          erro={erro}
          autoFocus
        />
      </DialogBody>
      <DialogFooter>
        <Button type="button" variant="secundario" onClick={aoFechar}>
          Cancelar
        </Button>
        <Button type="submit">Aplicar</Button>
      </DialogFooter>
    </form>
  );
}

/** Depois de escolher a imagem: texto alternativo e legenda (vêm da Mídia, podem ser trocados aqui). */
function DialogoImagem({
  imagem,
  aoFechar,
  aoInserir,
}: {
  imagem: ArquivoParaEscolher | null;
  aoFechar: () => void;
  aoInserir: (atributos: { src: string; alt: string; title: string; midiaId: string }) => void;
}) {
  return (
    <Dialog open={!!imagem} onOpenChange={(aberto) => (aberto ? null : aoFechar())}>
      <DialogContent className="max-w-[560px]">
        <DialogHeader titulo="Imagem no corpo" descricao="O texto alternativo é lido por quem usa leitor de tela." />
        {imagem ? <FormularioImagem key={imagem.id} imagem={imagem} aoFechar={aoFechar} aoInserir={aoInserir} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function FormularioImagem({
  imagem,
  aoFechar,
  aoInserir,
}: {
  imagem: ArquivoParaEscolher;
  aoFechar: () => void;
  aoInserir: (atributos: { src: string; alt: string; title: string; midiaId: string }) => void;
}) {
  const [alt, setAlt] = React.useState(imagem.alt);
  const [legenda, setLegenda] = React.useState(imagem.legenda);
  return (
    <form
      onSubmit={(evento) => {
        evento.preventDefault();
        aoInserir({ src: imagem.url, alt: alt.trim(), title: legenda.trim(), midiaId: imagem.id });
      }}
    >
      <DialogBody>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imagem.url} alt="" className="max-h-48 w-full rounded-[12px] object-cover" />
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
        <Button type="submit">Inserir imagem</Button>
      </DialogFooter>
    </form>
  );
}
