import { ChevronLeft, Download, Eye } from "lucide-react";
import Link from "next/link";

import { Alerta } from "@/components/ui/alerta";
import { Button } from "@/components/ui/button";
import { dataHoraNaBahia } from "@/lib/datas";
import type { DocumentoAberto } from "@/lib/documentos/carregar";
import { tamanhoDoArquivo } from "@/lib/documentos/cartao";
import { NOME_DO_TIPO, ROTULO_DO_SUBTIPO, rotuloDoDocumento, usaVigencia } from "@/lib/documentos/dados";
import { seloDosCampos } from "@/lib/documentos/selo";

import { SeloEstado, SeloVigencia } from "../selos";

const dia = (valor: string) => (valor ? valor.split("-").reverse().join("/") : "");

/**
 * Documento oficial para quem só vê e baixa, a Comunicação (RF42, CA-US23.2): os dados e o PDF, sem
 * editar, substituir nem remover. As ações também são negadas no servidor (RN08, RNF01).
 */
export function DocumentoSoLeitura({ documento, categoria }: { documento: DocumentoAberto; categoria: string | null }) {
  const { dados, tipo, pdf } = documento;
  const linhas: [string, string][] = [
    ["Número ou identificação", dados.numero],
    [tipo === "edital" ? "Tipo de edital" : "Tipo de acordo", dados.subtipo ? ROTULO_DO_SUBTIPO[dados.subtipo] : ""],
    ["Data do documento", dia(dados.dataDocumento)],
    ["Data do evento ou prazo", dados.eventoData ? `${dia(dados.eventoData)} · ${dados.eventoHora.replace(":", "h")}` : ""],
    ...(usaVigencia(tipo, dados)
      ? ([["Vigência", dados.vigenciaInicio && dados.vigenciaFim ? `${dia(dados.vigenciaInicio)} a ${dia(dados.vigenciaFim)}` : ""]] as [string, string][])
      : []),
    ...(tipo === "acordo"
      ? ([
          ["Abrangência", dados.abrangencia],
          ["Partes signatárias", dados.partesSignatarias],
        ] as [string, string][])
      : []),
    ["Categoria", categoria ?? ""],
    ["Resumo", dados.resumo],
  ];

  return (
    <div className="flex flex-1 flex-col gap-6 px-5 pt-8 pb-12 lg:px-10">
      <header className="flex items-center gap-3">
        <Link
          href="/painel/conteudos"
          aria-label="Voltar para Conteúdos"
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-fundo-superficie-alt text-texto-primario outline-none hover:brightness-95 focus-visible:ring-[3px] focus-visible:ring-ring"
        >
          <ChevronLeft aria-hidden className="size-5" />
        </Link>
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate texto-titulo-card text-texto-primario">{rotuloDoDocumento(tipo, dados.titulo)}</h1>
            <SeloEstado estado={documento.estado} />
            <SeloVigencia selo={seloDosCampos(documento.estado, dados, new Date())} />
          </div>
          <p className="texto-pequeno text-texto-secundario">{NOME_DO_TIPO[tipo]}</p>
        </div>
      </header>

      <Alerta tipo="informacao" titulo="Você pode ver e baixar este documento">
        Só o Administrador geral edita, substitui ou remove documentos oficiais.
      </Alerta>

      <section aria-labelledby="titulo-arquivo" className="flex flex-col gap-4 rounded-[20px] border border-borda-padrao bg-fundo-superficie p-5 sm:p-6">
        <h2 id="titulo-arquivo" className="texto-titulo-card text-texto-primario">
          Arquivo oficial (PDF)
        </h2>
        {pdf ? (
          <div className="flex flex-col gap-4 rounded-[16px] bg-fundo-superficie-alt p-4 sm:flex-row sm:items-center">
            <span aria-hidden className="flex size-12 shrink-0 items-center justify-center rounded-[12px] bg-status-perigo-fundo texto-etiqueta text-status-perigo-texto">
              PDF
            </span>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate texto-rotulo text-texto-primario">{pdf.nomeArquivo}</span>
              <span className="texto-pequeno text-texto-secundario">
                {tamanhoDoArquivo(pdf.bytes)}
                {pdf.paginas ? ` · ${pdf.paginas} ${pdf.paginas === 1 ? "página" : "páginas"}` : ""}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="secundario" size="pequeno">
                <a href={`/painel/documentos/${documento.id}/pdf?modo=abrir`} target="_blank" rel="noopener">
                  <Eye aria-hidden />
                  Visualizar
                </a>
              </Button>
              <Button asChild size="pequeno">
                <a href={`/painel/documentos/${documento.id}/pdf?modo=baixar`}>
                  <Download aria-hidden />
                  Baixar PDF
                </a>
              </Button>
            </div>
          </div>
        ) : (
          <p className="texto-pequeno text-texto-secundario">Este documento ainda não tem PDF.</p>
        )}
      </section>

      <section aria-labelledby="titulo-dados" className="flex flex-col gap-4 rounded-[20px] border border-borda-padrao bg-fundo-superficie p-5 sm:p-6">
        <h2 id="titulo-dados" className="texto-titulo-card text-texto-primario">
          Dados do documento
        </h2>
        <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-[220px_1fr]">
          {linhas.map(([rotulo, valor]) => (
            <div key={rotulo} className="contents">
              <dt className="texto-rotulo text-texto-secundario">{rotulo}</dt>
              <dd className="texto-corpo whitespace-pre-line text-texto-primario">{valor || "—"}</dd>
            </div>
          ))}
        </dl>
        {documento.estado === "publicado" && documento.publicadoEm ? (
          <p className="texto-pequeno text-texto-terciario">No site desde {dataHoraNaBahia(documento.publicadoEm)}.</p>
        ) : null}
      </section>
    </div>
  );
}
