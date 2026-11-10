import type { Metadata } from "next";
import { forbidden, notFound } from "next/navigation";

import { NoticiaAberta, type NoticiaParaLer } from "@/components/site/noticia-aberta";
import { exigirArea } from "@/lib/acesso/sessao-da-equipe";
import { urlPublica } from "@/lib/armazenamento";
import { carregarNoticia } from "@/lib/conteudos/carregar";
import { contarPalavras, tempoDeLeitura } from "@/lib/conteudos/corpo";
import { listarCategorias } from "@/lib/conteudos/listar";
import { temAlteracoesNaoPublicadas } from "@/lib/conteudos/publicacao";
import { versoesDaNoticia } from "@/lib/conteudos/publicar";
import { quandoNaBahia } from "@/lib/datas";
import { lerEnvArmazenamento } from "@/lib/env";
import { detalharMidia } from "@/lib/midia/listar";
import { pode } from "@/lib/permissoes";
import { ehUuid } from "@/lib/uuid";

import { MolduraPrevia } from "./moldura-previa";

export const metadata: Metadata = { title: "Prévia da notícia" };

/**
 * Pré-visualizar como no site (RF39; Figma 122:5800). Mostra a cópia de trabalho salva no
 * servidor: o editor salva o que estiver pendente antes de abrir esta tela (E42).
 * Com `?versao=N`, mostra uma versão publicada ("Ver esta versão" do Histórico, N14).
 */
export default async function PaginaPrevia({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ versao?: string }>;
}) {
  const { id } = await params;
  const numeroDaVersao = Number.parseInt((await searchParams).versao ?? "", 10);
  const pessoa = await exigirArea("conteudos");
  if (!pode(pessoa.quem, "editar", { tipo: "noticia" })) forbidden();
  if (!ehUuid(id)) notFound();
  const noticia = await carregarNoticia(id, { quem: pessoa.quem });
  if (!noticia) notFound();

  const versao =
    Number.isInteger(numeroDaVersao) && numeroDaVersao > 0 && pode(pessoa.quem, "ver_versoes", { tipo: "noticia" })
      ? (await versoesDaNoticia(id, { quem: pessoa.quem })).find((v) => v.versao === numeroDaVersao)
      : undefined;
  if (Number.isInteger(numeroDaVersao) && !versao) notFound();

  const dados = versao?.dados ?? noticia.dados;
  const env = lerEnvArmazenamento();
  const [categorias, ...arquivos] = await Promise.all([
    listarCategorias(["noticias"], { quem: pessoa.quem }),
    ...[dados.capaMidiaId, ...dados.links.map((l) => l.midiaId)].filter((m): m is string => !!m).map((m) => detalharMidia(m)),
  ]);
  const enderecoDe = new Map(arquivos.filter((a) => !!a).map((a) => [a!.id, urlPublica(a!.chaveR2, env)]));

  const publicada = noticia.estado === "publicado";
  const comAlteracoes = temAlteracoesNaoPublicadas(noticia);
  const capaUrl = dados.capaMidiaId ? enderecoDe.get(dados.capaMidiaId) : undefined;

  const paraLer: NoticiaParaLer = {
    titulo: dados.titulo || "Notícia sem manchete",
    linhaFina: dados.linhaFina,
    lide: dados.lide,
    corpo: dados.corpo,
    capa: capaUrl ? { url: capaUrl, alt: dados.capaAlt, legenda: dados.capaLegenda } : null,
    categoria: categorias.find((c) => c.id === dados.categoriaId)?.nome ?? null,
    assinatura: dados.assinatura || "Redação SINTRAVC",
    local: dados.local,
    publicadoEm: noticia.publicadoEm,
    atualizadoEm: versao ? null : comAlteracoes ? noticia.atualizadoEm : null,
    minutosDeLeitura: Math.max(1, tempoDeLeitura(contarPalavras(dados.corpo))),
    palavrasChave: dados.palavrasChave,
    links: dados.links
      .filter((l) => l.visivel)
      .map((l) => ({ tipo: l.tipo, titulo: l.titulo, href: l.midiaId ? (enderecoDe.get(l.midiaId) ?? "") : (l.url ?? "") }))
      .filter((l) => l.href),
  };

  return (
    <MolduraPrevia
      id={id}
      dados={dados}
      selo={
        versao
          ? `Versão ${versao.versao} · ${versao.noAr ? "no site agora" : `publicada em ${quandoNaBahia(versao.criadoEm)}`}`
          : !publicada
            ? "Prévia · ainda não publicada"
            : comAlteracoes
              ? "Prévia · alterações não publicadas"
              : "Prévia · igual ao site"
      }
      rotuloPublicar={
        versao || noticia.estado === "arquivado" || noticia.estado === "oculto" || !pode(pessoa.quem, "publicar", { tipo: "noticia" })
          ? null
          : !publicada
            ? "Publicar…"
            : comAlteracoes
              ? "Publicar alterações…"
              : null
      }
    >
      <NoticiaAberta noticia={paraLer} />
    </MolduraPrevia>
  );
}
