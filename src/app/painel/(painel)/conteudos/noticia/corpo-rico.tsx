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
  Check,
  Ellipsis,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Underline,
  Undo2,
  type LucideIcon,
} from "lucide-react";
import { DropdownMenu } from "radix-ui";
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

type Ferramenta =
  | "negrito"
  | "italico"
  | "sublinhado"
  | "estilo"
  | "lista"
  | "numerada"
  | "citacao"
  | "link"
  | "imagem"
  | "desfazer"
  | "refazer";

/** A barra em grupos, na ordem do E51; cada grupo, menos o 1º, vem depois de um separador. */
const GRUPOS: { ferramentas: Ferramenta[]; separador: string }[] = [
  { ferramentas: ["negrito", "italico", "sublinhado"], separador: "" },
  { ferramentas: ["estilo"], separador: "barra-estreita:hidden" },
  { ferramentas: ["lista", "numerada", "citacao"], separador: "barra-estreita:hidden" },
  { ferramentas: ["link", "imagem"], separador: "barra-estreita:hidden" },
  { ferramentas: ["desfazer", "refazer"], separador: "barra-media:hidden" },
];

/**
 * Em que degrau cada ferramenta sai da barra e vai para o ⋯ (E51). Os degraus são container
 * queries na largura da barra (variantes barra-media e barra-estreita; a conta está em globals.css).
 */
const SAI_DA_BARRA: Record<Ferramenta, string> = {
  negrito: "",
  italico: "",
  lista: "",
  link: "",
  estilo: "barra-estreita:hidden",
  imagem: "barra-estreita:hidden",
  sublinhado: "barra-media:hidden",
  numerada: "barra-media:hidden",
  citacao: "barra-media:hidden",
  desfazer: "barra-media:hidden",
  refazer: "barra-media:hidden",
};

/** Os estilos do bloco: o select da barra e a escolha no menu saem daqui. */
const ESTILOS = [
  { valor: "p", nome: "Parágrafo" },
  { valor: "h2", nome: "Subtítulo" },
] as const;
type Estilo = (typeof ESTILOS)[number]["valor"];
const ehEstilo = (valor: string): valor is Estilo => ESTILOS.some((opcao) => opcao.valor === valor);

/** Uma ferramenta com botão (todas menos o estilo, que é um select na barra e uma escolha no menu). */
type Acao = {
  /** Nome acessível, o mesmo na barra e no menu (com o atalho, quando há). */
  rotulo: string;
  /** Texto visível no menu. */
  nome: string;
  atalho?: string;
  icone: LucideIcon;
  /** Liga e desliga: no menu, aparece marcada (✓). */
  alterna?: boolean;
  ligado?: boolean;
  desativado?: boolean;
  /** Por que está travada, no menu. */
  motivo?: string;
  agir: () => void;
};

type Acoes = Record<Exclude<Ferramenta, "estilo">, Acao>;

/**
 * O CSS escondeu a ferramenta (degrau da barra)? O Safari do iPad antes da 17.4 não tem o
 * checkVisibility: lá, o que está com display: none não tem caixas.
 */
function escondidoNaBarra(el: Element) {
  return typeof el.checkVisibility === "function" ? !el.checkVisibility() : el.getClientRects().length === 0;
}

/** As ferramentas que o CSS escondeu na barra agora. */
function escondidasNa(barra: HTMLElement | null): ReadonlySet<Ferramenta> {
  const ferramentas = barra?.querySelectorAll<HTMLElement>("[data-ferramenta]") ?? [];
  return new Set([...ferramentas].filter(escondidoNaBarra).map((el) => el.dataset.ferramenta as Ferramenta));
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
  const barra = React.useRef<HTMLDivElement>(null);

  if (!ativo) return <BarraVazia />;
  const cadeia = () => editor.chain().focus();
  const estilo: Estilo = ativo.subtitulo ? "h2" : "p";
  const mudarEstilo = (valor: Estilo) => (valor === "h2" ? cadeia().setHeading({ level: 2 }).run() : cadeia().setParagraph().run());

  const acoes: Acoes = {
    negrito: { rotulo: "Negrito (Ctrl+B)", nome: "Negrito", atalho: "Ctrl+B", icone: Bold, alterna: true, ligado: ativo.negrito, agir: () => cadeia().toggleBold().run() },
    italico: { rotulo: "Itálico (Ctrl+I)", nome: "Itálico", atalho: "Ctrl+I", icone: Italic, alterna: true, ligado: ativo.italico, agir: () => cadeia().toggleItalic().run() },
    sublinhado: {
      rotulo: "Sublinhado (Ctrl+U)",
      nome: "Sublinhado",
      atalho: "Ctrl+U",
      icone: Underline,
      alterna: true,
      ligado: ativo.sublinhado,
      agir: () => cadeia().toggleUnderline().run(),
    },
    lista: { rotulo: "Lista", nome: "Lista", icone: List, alterna: true, ligado: ativo.lista, agir: () => cadeia().toggleBulletList().run() },
    numerada: {
      rotulo: "Lista numerada",
      nome: "Lista numerada",
      icone: ListOrdered,
      alterna: true,
      ligado: ativo.numerada,
      agir: () => cadeia().toggleOrderedList().run(),
    },
    citacao: { rotulo: "Citação", nome: "Citação", icone: Quote, alterna: true, ligado: ativo.citacao, agir: () => cadeia().toggleBlockquote().run() },
    link: { rotulo: "Link", nome: "Link", icone: Link2, ligado: ativo.link, agir: () => setLinkAberto(true) },
    imagem: {
      rotulo: conectado ? "Imagem da Mídia" : MENSAGEM_SEM_INTERNET_MIDIA,
      nome: "Imagem da Mídia",
      icone: ImagePlus,
      desativado: !conectado,
      motivo: "Sem internet",
      agir: () => setSeletorAberto(true),
    },
    desfazer: {
      rotulo: "Desfazer (Ctrl+Z)",
      nome: "Desfazer",
      atalho: "Ctrl+Z",
      icone: Undo2,
      desativado: !ativo.podeDesfazer,
      motivo: "Nada para desfazer",
      agir: () => cadeia().undo().run(),
    },
    refazer: {
      rotulo: "Refazer (Ctrl+Shift+Z)",
      nome: "Refazer",
      atalho: "Ctrl+Shift+Z",
      icone: Redo2,
      desativado: !ativo.podeRefazer,
      motivo: "Nada para refazer",
      agir: () => cadeia().redo().run(),
    },
  };

  return (
    // Numa linha só (E51): o que não cabe sai pelos degraus do container “barra” e vai para o ⋯.
    <div
      ref={barra}
      role="toolbar"
      aria-label="Formatação do corpo"
      className="@container/barra flex flex-nowrap items-center gap-1 border-b border-borda-padrao bg-fundo-superficie-alt px-2 py-1.5 pointer-coarse:vao-toque-9"
    >
      {GRUPOS.map((grupo, i) => (
        <React.Fragment key={grupo.ferramentas[0]}>
          {i > 0 ? <Separador className={grupo.separador} /> : null}
          {grupo.ferramentas.map((ferramenta) =>
            ferramenta === "estilo" ? (
              <React.Fragment key={ferramenta}>
                <label className="sr-only" htmlFor="estilo-do-bloco">
                  Estilo do parágrafo
                </label>
                <select
                  id="estilo-do-bloco"
                  data-ferramenta={ferramenta}
                  value={estilo}
                  onChange={(evento) => {
                    if (ehEstilo(evento.target.value)) mudarEstilo(evento.target.value);
                  }}
                  className={cn(
                    "h-9 shrink-0 rounded-[8px] border border-borda-padrao bg-fundo-superficie px-2 texto-pequeno pointer-coarse:h-(--alvo-toque) text-texto-primario outline-none focus-visible:ring-[3px] focus-visible:ring-ring",
                    SAI_DA_BARRA[ferramenta],
                  )}
                >
                  {ESTILOS.map((opcao) => (
                    <option key={opcao.valor} value={opcao.valor}>
                      {opcao.nome}
                    </option>
                  ))}
                </select>
              </React.Fragment>
            ) : (
              <Botao key={ferramenta} ferramenta={ferramenta} acao={acoes[ferramenta]} className={SAI_DA_BARRA[ferramenta]} />
            ),
          )}
        </React.Fragment>
      ))}
      <MaisFormatacao barra={barra} acoes={acoes} estilo={estilo} aoMudarEstilo={mudarEstilo} />

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

const CLASSE_DO_ITEM =
  "flex cursor-pointer items-center gap-2.5 rounded-[10px] px-3 py-2.5 texto-pequeno text-texto-primario outline-none pointer-coarse:min-h-(--alvo-toque) data-[highlighted]:bg-fundo-superficie-alt data-[disabled]:cursor-not-allowed data-[disabled]:text-texto-terciario";

/**
 * O ⋯ da barra (E51): aparece só abaixo do degrau largo e lista só as ferramentas que o CSS escondeu
 * na barra naquele momento. Não mede nada: lê o resultado das container queries ao abrir. A ação
 * escolhida roda depois de o menu fechar, para o foco voltar ao corpo (ou ir para o diálogo do Link e
 * da Imagem), e não ao ⋯. Fechar sem escolher (Esc, tocar fora) devolve o foco ao ⋯.
 */
function MaisFormatacao({
  barra,
  acoes,
  estilo,
  aoMudarEstilo,
}: {
  barra: React.RefObject<HTMLDivElement | null>;
  acoes: Acoes;
  estilo: Estilo;
  aoMudarEstilo: (valor: Estilo) => void;
}) {
  const [aberto, setAberto] = React.useState(false);
  const [escondidas, setEscondidas] = React.useState<ReadonlySet<Ferramenta>>(() => new Set());
  const gatilho = React.useRef<HTMLButtonElement>(null);
  const depoisDeFechar = React.useRef<(() => void) | null>(null);

  // Girar o tablet ou mudar a janela com o menu aberto: se a barra mudar de degrau (outras ferramentas
  // escondidas, ou nenhuma, e o ⋯ some), o menu fecha, em vez de mostrar uma lista que não vale mais.
  React.useEffect(() => {
    if (!aberto) return;
    const aoMudarTamanho = () => {
      const agora = escondidasNa(barra.current);
      if (agora.size !== escondidas.size || [...agora].some((ferramenta) => !escondidas.has(ferramenta))) setAberto(false);
    };
    window.addEventListener("resize", aoMudarTamanho);
    return () => window.removeEventListener("resize", aoMudarTamanho);
  }, [aberto, barra, escondidas]);

  const escolher = (acao: () => void) => () => {
    depoisDeFechar.current = acao;
  };
  const grupos = GRUPOS.map((grupo) => grupo.ferramentas.filter((f) => escondidas.has(f))).filter((grupo) => grupo.length > 0);

  return (
    <DropdownMenu.Root
      modal={false}
      open={aberto}
      onOpenChange={(abrir) => {
        if (abrir) setEscondidas(escondidasNa(barra.current));
        setAberto(abrir);
      }}
    >
      <DropdownMenu.Trigger asChild>
        <button
          ref={gatilho}
          type="button"
          title="Mais formatação"
          aria-label="Mais formatação"
          className="alvo-toque hidden size-9 shrink-0 items-center justify-center rounded-[8px] text-texto-primario outline-none hover:bg-fundo-superficie focus-visible:ring-[3px] focus-visible:ring-ring data-[state=open]:bg-fundo-superficie barra-media:flex [&_svg]:size-[18px]"
        >
          <Ellipsis aria-hidden />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          collisionPadding={8}
          onCloseAutoFocus={(evento) => {
            const acao = depoisDeFechar.current;
            if (!acao) return;
            evento.preventDefault();
            depoisDeFechar.current = null;
            acao();
          }}
          className="z-50 flex max-h-(--radix-dropdown-menu-content-available-height) min-w-[240px] flex-col gap-0.5 overflow-y-auto rounded-[14px] border border-borda-padrao bg-fundo-superficie p-1.5 shadow-[0_12px_32px_rgb(11_20_36/0.16)]"
        >
          {grupos.map((grupo, i) => (
            <React.Fragment key={grupo[0]}>
              {i > 0 ? <DropdownMenu.Separator className="mx-2 my-1 h-px bg-borda-padrao" /> : null}
              {grupo.map((ferramenta) =>
                ferramenta === "estilo" ? (
                  <DropdownMenu.RadioGroup key={ferramenta} aria-label="Estilo do parágrafo" value={estilo}>
                    {ESTILOS.map((opcao) => (
                      <DropdownMenu.RadioItem
                        key={opcao.valor}
                        value={opcao.valor}
                        onSelect={escolher(() => aoMudarEstilo(opcao.valor))}
                        className={CLASSE_DO_ITEM}
                      >
                        <span className="flex size-4 shrink-0 items-center justify-center">
                          <DropdownMenu.ItemIndicator>
                            <Check aria-hidden className="size-4" />
                          </DropdownMenu.ItemIndicator>
                        </span>
                        {opcao.nome}
                      </DropdownMenu.RadioItem>
                    ))}
                  </DropdownMenu.RadioGroup>
                ) : (
                  <ItemDoMenu key={ferramenta} acao={acoes[ferramenta]} aoEscolher={escolher(acoes[ferramenta].agir)} />
                ),
              )}
            </React.Fragment>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

/** Item do ⋯: ícone, nome, o motivo quando travado, o atalho (só com teclado por perto) e o ✓ dos que ligam e desligam. */
function ItemDoMenu({ acao, aoEscolher }: { acao: Acao; aoEscolher: () => void }) {
  const conteudo = (
    <>
      <acao.icone aria-hidden className="size-4 shrink-0" />
      <span className="flex min-w-0 flex-col">
        {acao.nome}
        {acao.desativado && acao.motivo ? <span className="texto-pequeno text-texto-terciario">{acao.motivo}</span> : null}
      </span>
      {acao.atalho ? <span className="ml-auto pl-4 texto-pequeno text-texto-terciario pointer-coarse:hidden">{acao.atalho}</span> : null}
      {acao.alterna ? (
        <span className={cn("flex size-4 shrink-0 items-center justify-center", !acao.atalho && "ml-auto", "pointer-coarse:ml-auto")}>
          <DropdownMenu.ItemIndicator>
            <Check aria-hidden className="size-4" />
          </DropdownMenu.ItemIndicator>
        </span>
      ) : null}
    </>
  );
  if (acao.alterna) {
    return (
      <DropdownMenu.CheckboxItem aria-label={acao.rotulo} checked={!!acao.ligado} disabled={acao.desativado} onSelect={aoEscolher} className={CLASSE_DO_ITEM}>
        {conteudo}
      </DropdownMenu.CheckboxItem>
    );
  }
  return (
    <DropdownMenu.Item aria-label={acao.rotulo} disabled={acao.desativado} onSelect={aoEscolher} className={CLASSE_DO_ITEM}>
      {conteudo}
    </DropdownMenu.Item>
  );
}

function Separador({ className }: { className?: string }) {
  return <span aria-hidden className={cn("mx-1 h-6 w-px shrink-0 bg-borda-padrao", className)} />;
}

function Botao({ ferramenta, acao, className }: { ferramenta: Ferramenta; acao: Acao; className?: string }) {
  const { rotulo, ligado, desativado, agir, icone: Icone } = acao;
  return (
    <button
      type="button"
      data-ferramenta={ferramenta}
      title={rotulo}
      aria-label={rotulo}
      aria-pressed={ligado === undefined ? undefined : ligado}
      // aria-disabled (e não disabled) para a dica continuar aparecendo e ser lida.
      aria-disabled={desativado || undefined}
      onClick={() => {
        if (!desativado) agir();
      }}
      className={cn(
        "alvo-toque flex size-9 shrink-0 items-center justify-center rounded-[8px] text-texto-primario outline-none focus-visible:ring-[3px] focus-visible:ring-ring [&_svg]:size-[18px]",
        ligado ? "bg-fundo-marinho text-texto-invertido" : "hover:bg-fundo-superficie",
        desativado && "cursor-not-allowed opacity-40 hover:bg-transparent",
        className,
      )}
    >
      <Icone />
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
