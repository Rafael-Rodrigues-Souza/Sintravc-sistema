import * as React from "react";

import type { DocCorpo } from "@/lib/conteudos/dados";
import { ehLinkPermitido } from "@/lib/conteudos/enderecos";

type No = { type?: string; attrs?: Record<string, unknown>; content?: No[]; marks?: { type: string; attrs?: Record<string, unknown> }[]; text?: string };

/**
 * Corpo da notícia como no site (Figma 100:15159). Lê o JSON do Tiptap que o servidor já limpou
 * (limparCorpo: só parágrafo, H2, listas, citação, marcas simples, link e imagem da Mídia) e monta
 * os elementos do React, sem HTML solto. O que não for conhecido é ignorado.
 */
export function CorpoMateria({ corpo }: { corpo: DocCorpo }) {
  return (
    <div className="flex flex-col gap-5 texto-corpo-materia-mobile text-texto-primario @3xl:texto-corpo-materia">
      {blocos(corpo.content as No[] | undefined)}
    </div>
  );
}

function blocos(nos: No[] | undefined): React.ReactNode[] {
  return (nos ?? []).map((no, i) => bloco(no, i));
}

function bloco(no: No, chave: number): React.ReactNode {
  switch (no.type) {
    case "paragraph":
      return <p key={chave}>{emLinha(no.content)}</p>;
    case "heading":
      return (
        <h2 key={chave} className="mt-3 texto-titulo-destaque-mobile text-texto-primario @3xl:texto-titulo-card-grande">
          {emLinha(no.content)}
        </h2>
      );
    case "bulletList":
      return (
        <ul key={chave} className="flex list-disc flex-col gap-2 pl-6 marker:text-destaque-azul">
          {blocos(no.content)}
        </ul>
      );
    case "orderedList":
      return (
        <ol key={chave} start={Number(no.attrs?.start) || 1} className="flex list-decimal flex-col gap-2 pl-6">
          {blocos(no.content)}
        </ol>
      );
    case "listItem":
      return <li key={chave}>{blocos(no.content)}</li>;
    case "blockquote":
      return (
        <blockquote key={chave} className="border-l-4 border-destaque-amarelo pl-5 texto-lide-mobile font-semibold @3xl:texto-lide">
          {blocos(no.content)}
        </blockquote>
      );
    case "image": {
      const src = String(no.attrs?.src ?? "");
      const legenda = String(no.attrs?.title ?? "");
      if (!src) return null;
      return (
        <figure key={chave} className="flex flex-col gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={String(no.attrs?.alt ?? "")} className="w-full rounded-[16px] object-cover" />
          {legenda ? <figcaption className="texto-pequeno text-texto-secundario">{legenda}</figcaption> : null}
        </figure>
      );
    }
    default:
      return null;
  }
}

function emLinha(nos: No[] | undefined): React.ReactNode[] {
  return (nos ?? []).map((no, i) => {
    if (no.type === "hardBreak") return <br key={i} />;
    if (no.type !== "text" || !no.text) return null;
    let conteudo: React.ReactNode = no.text;
    for (const marca of no.marks ?? []) {
      if (marca.type === "bold") conteudo = <strong>{conteudo}</strong>;
      else if (marca.type === "italic") conteudo = <em>{conteudo}</em>;
      else if (marca.type === "underline") conteudo = <u>{conteudo}</u>;
      else if (marca.type === "link") {
        const href = String(marca.attrs?.href ?? "");
        if (ehLinkPermitido(href)) {
          conteudo = (
            <a href={href} className="text-destaque-azul underline underline-offset-2" rel="noopener noreferrer nofollow">
              {conteudo}
            </a>
          );
        }
      }
    }
    return <React.Fragment key={i}>{conteudo}</React.Fragment>;
  });
}
