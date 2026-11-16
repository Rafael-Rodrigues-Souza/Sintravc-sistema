"use client";

import Image from "@tiptap/extension-image";
import { EditorState } from "@tiptap/pm/state";
import {
  createDocument,
  EditorContent,
  ReactNodeViewRenderer,
  useEditor,
  useEditorState,
  type Editor,
  type JSONContent,
} from "@tiptap/react";
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
import { contarPalavras, tempoDeLeitura } from "@/lib/conteudos/corpo";
import { paraJsonSimples } from "@/lib/conteudos/json";
import type { DocCorpo } from "@/lib/conteudos/dados";
import { normalizarEndereco } from "@/lib/conteudos/enderecos";
import { cn } from "@/lib/utils";

import type { ArquivoParaEscolher } from "../acoes";
import { DialogoImagem, ImagemNoCorpo, MarcarImagensSemAlt } from "./imagem-no-corpo";
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
  // Na tela do editor: "Editar texto alternativo e legenda" e a marca de erro (CA-US21.3).
  addNodeView() {
    return ReactNodeViewRenderer(ImagemNoCorpo);
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

/** Lugar da barra de formatação enquanto o editor não está pronto. */
const BarraVazia = () => <div className="h-[52px] border-b border-borda-padrao bg-fundo-superficie-alt" />;

export const MENSAGEM_SEM_INTERNET_MIDIA = "Conecte-se à internet para enviar ou escolher arquivos da Mídia";

/**
 * Troca do corpo feita pelo sistema, não pela pessoa (#50).
 * - `sempre`: descartar, usar a versão do servidor e restaurar versão. O histórico zera mesmo com o
 *   corpo igual: desfazer um passo antigo tiraria a cópia de trabalho do que o sistema acabou de pôr.
 * - `se-diferente`: cópia do navegador e “Manter a minha versão”. Com o corpo igual, nada muda e o
 *   histórico da pessoa continua.
 */
/** `contador` sobe a cada troca: o CorpoRico aplica cada valor uma vez só. */
export type TrocaDoCorpo = { contador: number; modo: "sempre" | "se-diferente" };

/**
 * Põe o documento no editor com o histórico vazio, sem disparar o onUpdate. Compara pelo documento
 * do ProseMirror (estrutura e atributos), não pelo texto do JSON: o jsonb do banco muda a ordem das chaves.
 */
function trocarSemHistorico(editor: Editor, valor: DocCorpo, modo: TrocaDoCorpo["modo"]) {
  const doc = createDocument(valor as JSONContent, editor.schema);
  if (modo === "se-diferente" && doc.eq(editor.state.doc)) return;
  editor.view.updateState(EditorState.create({ doc, plugins: editor.state.plugins }));
  // Transação vazia, fora do histórico e sem onUpdate, só para os botões (useEditorState) se atualizarem.
  editor.view.dispatch(editor.state.tr.setMeta("addToHistory", false).setMeta("preventUpdate", true));
}

export function CorpoRico({
  valor,
  aoMudar,
  aoCriar,
  conectado,
  limites,
  rodape,
  marcarImagensSemAlt = false,
  troca,
}: {
  valor: DocCorpo;
  aoMudar: (doc: DocCorpo) => void;
  /** Cada `contador` novo é uma troca do corpo feita pelo sistema; veja `TrocaDoCorpo`. */
  troca: TrocaDoCorpo;
  /** Entrega o editor para os botões de desfazer e refazer do topo da tela. */
  aoCriar: (editor: Editor | null) => void;
  conectado: boolean;
  limites: { tamanhoMaximoBytes: number; mensagemDeTamanho: string };
  rodape: React.ReactNode;
  /** Depois de tentar publicar: marca as imagens sem texto alternativo. */
  marcarImagensSemAlt?: boolean;
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

  // Corpo trocado pelo sistema (descartar, conflito, restaurar versão, cópia do navegador): não entra
  // no histórico do Desfazer (#50). O que a pessoa digita volta pelo onUpdate e não passa por aqui.
  const valorRef = React.useRef(valor);
  const trocaAplicada = React.useRef(troca.contador);
  React.useEffect(() => {
    valorRef.current = valor;
  });
  React.useEffect(() => {
    if (!editor || trocaAplicada.current === troca.contador) return;
    trocaAplicada.current = troca.contador;
    trocarSemHistorico(editor, valorRef.current, troca.modo);
  }, [editor, troca]);

  const palavras = contarPalavras(valor);
  const minutos = tempoDeLeitura(palavras);

  return (
    <div className="flex flex-col overflow-hidden rounded-[14px] border border-borda-forte bg-fundo-superficie focus-within:border-destaque-azul">
      {editor ? (
        <BarraDeFerramentas editor={editor} conectado={conectado} limites={limites} />
      ) : (
        <BarraVazia />
      )}
      <MarcarImagensSemAlt.Provider value={marcarImagensSemAlt}>
        <EditorContent editor={editor} />
      </MarcarImagensSemAlt.Provider>
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

/**
 * Só é montada com o editor pronto: o useEditorState guarda o editor que recebe na montagem e só
 * refaz a leitura na próxima transação, então montado com `null` ficaria com o estado antigo (#50).
 */
function BarraDeFerramentas({
  editor,
  conectado,
  limites,
}: {
  editor: Editor;
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

  if (!ativo) return <BarraVazia />;
  const cadeia = () => editor.chain().focus();

  return (
    <div
      role="toolbar"
      aria-label="Formatação do corpo"
      className="flex flex-wrap items-center gap-1 border-b border-borda-padrao bg-fundo-superficie-alt px-2 py-1.5 pointer-coarse:vao-toque-9"
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
        className="h-9 rounded-[8px] border border-borda-padrao bg-fundo-superficie px-2 texto-pequeno pointer-coarse:h-(--alvo-toque) text-texto-primario outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
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
        aberto={!!imagem}
        url={imagem?.url ?? ""}
        inicial={{ alt: imagem?.alt ?? "", legenda: imagem?.legenda ?? "" }}
        rotuloAcao="Inserir imagem"
        aoFechar={() => setImagem(null)}
        aoSalvar={({ alt, legenda }) => {
          if (!imagem) return;
          const atributos = { src: imagem.url, alt, title: legenda, midiaId: imagem.id };
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
        "alvo-toque flex size-9 items-center justify-center rounded-[8px] text-texto-primario outline-none focus-visible:ring-[3px] focus-visible:ring-ring [&_svg]:size-[18px]",
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
