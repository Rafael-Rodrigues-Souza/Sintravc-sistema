import type { Metadata } from "next";
import { forbidden, notFound } from "next/navigation";

import { CartaoDocumento } from "@/components/site/cartao-documento";
import { exigirArea } from "@/lib/acesso/sessao-da-equipe";
import { temAlteracoesNaoPublicadas } from "@/lib/conteudos/publicacao";
import { seloDaPrevia } from "@/lib/conteudos/selo-da-previa";
import { carregarDocumento } from "@/lib/documentos/carregar";
import { cartaoDoDocumento } from "@/lib/documentos/cartao";
import { faltasParaPublicarDocumento } from "@/lib/documentos/obrigatorios";
import { versoesDoDocumento } from "@/lib/documentos/versoes";
import { pode } from "@/lib/permissoes";
import { ehUuid } from "@/lib/uuid";

import { MolduraPrevia } from "../../../noticia/[id]/previa/moldura-previa";

export const metadata: Metadata = { title: "Prévia do documento" };

/**
 * Pré-visualizar o documento como no site (E46): o cartão da página Documentos (Figma 73:629 e
 * 75:1438). Mostra a cópia de trabalho salva; com `?versao=N`, uma versão publicada (N14).
 * "Abrir documento" e o ícone de baixar usam a rota do painel, que confere a permissão.
 */
export default async function PaginaPreviaDocumento({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ versao?: string }>;
}) {
  const { id } = await params;
  const numeroDaVersao = Number.parseInt((await searchParams).versao ?? "", 10);
  const pessoa = await exigirArea("conteudos");
  if (!pode(pessoa.quem, "editar", { tipo: "documento" })) forbidden();
  if (!ehUuid(id)) notFound();
  const documento = await carregarDocumento(id, { quem: pessoa.quem });
  if (!documento) notFound();

  const versoes = Number.isInteger(numeroDaVersao) && numeroDaVersao > 0 ? await versoesDoDocumento(id, { quem: pessoa.quem }) : [];
  const versao = versoes.find((v) => v.versao === numeroDaVersao);
  if (Number.isInteger(numeroDaVersao) && !versao) notFound();

  const dados = versao?.dados ?? documento.dados;
  const sufixo = versao ? `&versao=${versao.versao}` : "";
  const comAlteracoes = temAlteracoesNaoPublicadas(documento);
  const faltas = faltasParaPublicarDocumento(documento.tipo, dados);
  // Na versão antiga o tamanho pode ser outro PDF: mostra o tamanho só da cópia atual.
  const pdfBytes = !versao || versao.dados.pdfMidiaId === documento.pdf?.id ? (documento.pdf?.bytes ?? null) : null;

  return (
    <MolduraPrevia
      editor={`/painel/conteudos/documento/${id}`}
      selo={seloDaPrevia({
        estado: documento.estado,
        comAlteracoes,
        jaPublicado: documento.jaPublicado,
        versao: versao ? { versao: versao.versao, noAr: versao.noAr, voltaAoSite: versao.voltaAoSite, criadoEm: versao.criadoEm } : undefined,
      })}
      rotuloPublicar={null}
      antesDePublicar={
        faltas.length === 0 ? (
          <p className="texto-pequeno text-texto-secundario">Tudo preenchido. Ao publicar, confirme que o PDF é a versão oficial e assinada.</p>
        ) : (
          <ul className="flex list-disc flex-col gap-1 pl-5 texto-pequeno text-texto-secundario">
            {faltas.map((f) => (
              <li key={f.campo}>Falta: {f.rotulo}</li>
            ))}
          </ul>
        )
      }
    >
      <section className="flex flex-col gap-4 p-5 md:p-10">
        <p className="texto-etiqueta uppercase text-destaque-azul">
          Documentos › {documento.tipo === "edital" ? "Editais" : "Acordos coletivos"}
        </p>
        <CartaoDocumento
          documento={cartaoDoDocumento({
            tipo: documento.tipo,
            estado: versao ? "publicado" : documento.estado,
            dados,
            publicadoEm: documento.publicadoEm,
            pdfBytes,
            hrefs: dados.pdfMidiaId
              ? { abrir: `/painel/documentos/${id}/pdf?modo=abrir${sufixo}`, baixar: `/painel/documentos/${id}/pdf?modo=baixar${sufixo}` }
              : null,
            agora: new Date(),
          })}
        />
      </section>
    </MolduraPrevia>
  );
}
