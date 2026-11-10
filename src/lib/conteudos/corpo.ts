/**
 * Corpo da notícia: JSON do Tiptap. O servidor não confia no que vem da tela: `limparCorpo` deixa
 * só os formatos que o editor oferece (Figma 112:1091 e analise-figma §2.2: parágrafo, negrito,
 * itálico, sublinhado, H2, listas, citação, link e imagem da Mídia). Roda também no navegador.
 */
import { ehUuid } from "@/lib/uuid";

import type { DocCorpo } from "./dados";
import { ehLinkPermitido } from "./enderecos";

type No = { type?: unknown; attrs?: Record<string, unknown>; content?: unknown; marks?: unknown; text?: unknown };
type Marca = { type: string; attrs?: Record<string, unknown> };

const BLOCOS_COM_BLOCOS = new Set(["blockquote", "bulletList", "orderedList", "listItem"]);
const BLOCOS_COM_TEXTO = new Set(["paragraph", "heading"]);
const MARCAS_SIMPLES = new Set(["bold", "italic", "underline"]);

export function limparCorpo(entrada: unknown): DocCorpo {
  const doc = entrada as No | null;
  if (!doc || typeof doc !== "object" || doc.type !== "doc") return { type: "doc", content: [] };
  return { type: "doc", content: blocos(doc.content) };
}

function filhos(content: unknown): No[] {
  return Array.isArray(content) ? content.filter((n): n is No => !!n && typeof n === "object") : [];
}

function ehEmLinha(no: No) {
  return no.type === "text" || no.type === "hardBreak";
}

/** Conteúdo de bloco. Nó desconhecido: os filhos sobem (em linha viram parágrafo). */
function blocos(content: unknown): unknown[] {
  const saida: unknown[] = [];
  for (const no of filhos(content)) {
    const tipo = String(no.type);
    if (tipo === "image") {
      const imagem = limparImagem(no);
      if (imagem) saida.push(imagem);
    } else if (tipo === "paragraph") {
      saida.push(comConteudo({ type: "paragraph" }, emLinha(no.content)));
    } else if (tipo === "heading") {
      saida.push(comConteudo({ type: "heading", attrs: { level: 2 } }, emLinha(no.content)));
    } else if (tipo === "orderedList") {
      const inicio = Number(no.attrs?.start);
      saida.push({ type: "orderedList", attrs: { start: Number.isInteger(inicio) && inicio > 0 ? inicio : 1 }, content: blocos(no.content) });
    } else if (BLOCOS_COM_BLOCOS.has(tipo)) {
      saida.push({ type: tipo, content: blocos(no.content) });
    } else if (!BLOCOS_COM_TEXTO.has(tipo)) {
      const internos = filhos(no.content);
      if (internos.length > 0 && internos.every(ehEmLinha)) {
        saida.push(comConteudo({ type: "paragraph" }, emLinha(internos)));
      } else {
        saida.push(...blocos(internos));
      }
    }
  }
  return saida;
}

function comConteudo(no: Record<string, unknown>, content: unknown[]) {
  return content.length > 0 ? { ...no, content } : no;
}

/** Conteúdo em linha: só texto e quebra de linha. O resto sai, com o que estiver dentro. */
function emLinha(content: unknown): unknown[] {
  const saida: unknown[] = [];
  for (const no of filhos(content)) {
    if (no.type === "hardBreak") saida.push({ type: "hardBreak" });
    if (no.type !== "text" || typeof no.text !== "string" || no.text === "") continue;
    const marcas = limparMarcas(no.marks);
    saida.push(marcas.length > 0 ? { type: "text", text: no.text, marks: marcas } : { type: "text", text: no.text });
  }
  return saida;
}

function limparMarcas(marks: unknown): Marca[] {
  if (!Array.isArray(marks)) return [];
  const saida: Marca[] = [];
  for (const marca of marks as Marca[]) {
    if (MARCAS_SIMPLES.has(marca?.type)) saida.push({ type: marca.type });
    if (marca?.type === "link") {
      const href = String(marca.attrs?.href ?? "").trim();
      if (ehLinkPermitido(href)) saida.push({ type: "link", attrs: { href } });
    }
  }
  return saida;
}

function limparImagem(no: No) {
  const attrs = no.attrs ?? {};
  const midiaId = String(attrs.midiaId ?? "");
  // O endereço é trocado pelo da Mídia no servidor (trocarEnderecosDasImagens); aqui só se guarda o que veio.
  const src = String(attrs.src ?? "");
  if (!ehUuid(midiaId)) return null;
  return {
    type: "image",
    attrs: { midiaId, src, alt: String(attrs.alt ?? ""), title: String(attrs.title ?? "") },
  };
}

/**
 * Troca o endereço de cada imagem pelo do arquivo na Mídia (o servidor não confia no `src` da tela:
 * assim não entra imagem de outro site, como um rastreador). Imagem de arquivo desconhecido sai.
 */
export function trocarEnderecosDasImagens(doc: DocCorpo, enderecoDe: (midiaId: string) => string | undefined): DocCorpo {
  const trocar = (nos: unknown): unknown[] =>
    filhos(nos).flatMap((no) => {
      if (no.type === "image") {
        const src = enderecoDe(String(no.attrs?.midiaId ?? ""));
        return src ? [{ ...no, attrs: { ...no.attrs, src } }] : [];
      }
      return [no.content === undefined ? no : { ...no, content: trocar(no.content) }];
    });
  return { type: "doc", content: trocar(doc.content) };
}

/** Ids da Mídia usados como imagem no corpo, sem repetir. */
export function midiasDoCorpo(doc: DocCorpo): string[] {
  const ids = new Set<string>();
  const visitar = (nos: unknown) => {
    for (const no of filhos(nos)) {
      if (no.type === "image" && typeof no.attrs?.midiaId === "string") ids.add(no.attrs.midiaId);
      visitar(no.content);
    }
  };
  visitar(doc.content);
  return [...ids];
}

/** Texto corrido do corpo, com um espaço entre blocos. */
export function textoDoCorpo(doc: DocCorpo): string {
  const partes: string[] = [];
  const visitar = (nos: unknown) => {
    for (const no of filhos(nos)) {
      if (typeof no.text === "string") partes.push(no.text);
      else {
        partes.push(" ");
        visitar(no.content);
        partes.push(" ");
      }
    }
  };
  visitar(doc.content);
  return partes.join("");
}

export function contarPalavras(doc: DocCorpo): number {
  return textoDoCorpo(doc).split(/\s+/).filter(Boolean).length;
}

/** Minutos de leitura, a 200 palavras por minuto, arredondado para cima. */
export function tempoDeLeitura(palavras: number): number {
  return Math.ceil(palavras / 200);
}

/** A regra única de "imagem sem texto alternativo" (RN15): capa, corpo e a marca no editor. */
export function semTextoAlternativo(alt: unknown): boolean {
  return String(alt ?? "").trim() === "";
}

/** Quantas imagens do corpo estão sem texto alternativo (RN15: obrigatório para publicar). */
export function imagensSemAlt(doc: DocCorpo): number {
  let total = 0;
  const visitar = (nos: unknown) => {
    for (const no of filhos(nos)) {
      if (no.type === "image" && semTextoAlternativo(no.attrs?.alt)) total++;
      visitar(no.content);
    }
  };
  visitar(doc.content);
  return total;
}
