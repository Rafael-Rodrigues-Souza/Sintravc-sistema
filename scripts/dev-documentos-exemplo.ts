import "./carregar-env";

import { randomUUID } from "node:crypto";

import { and, eq, inArray, like } from "drizzle-orm";
import { PDFDocument, StandardFonts } from "pdf-lib";

import { bahiaEmCampos, somarDias } from "@/lib/datas";
import { banco, fecharBanco } from "@/lib/db";
import { categoria, conteudo, pessoaEquipe } from "@/lib/db/schema";
import { documentoVazio, type DadosDocumento, type SubtipoDocumento, type TipoDocumento } from "@/lib/documentos/dados";
import { publicarDocumento } from "@/lib/documentos/publicar";
import { salvarRascunhoDocumento } from "@/lib/documentos/salvar";
import { enviarMidia } from "@/lib/midia/enviar";
import type { QuemDaEquipe } from "@/lib/permissoes";

// SÓ PARA DESENVOLVIMENTO. Publica editais e acordos de exemplo, marcados com “[Exemplo]” no título,
// para ver a página Documentos (#16) com conteúdo: prazos em aberto e vencidos, vários tipos, meses
// e anos, acordo vigente e encerrado, e mais de 10 editais (para o “Carregar mais”). Os textos são
// de mentira, de propósito. As datas de publicação são acertadas direto no banco, para espalhar os
// documentos pelos meses (a publicação de verdade usa sempre a hora atual).
//
// Uso: pnpm dev:documentos-exemplo
const DIA = 24 * 60 * 60 * 1000;

async function pdfDeExemplo(quem: QuemDaEquipe, titulo: string, n: number) {
  const pdf = await PDFDocument.create();
  const fonte = await pdf.embedFont(StandardFonts.Helvetica);
  const pagina = pdf.addPage([595, 842]);
  pagina.drawText(`Documento de exemplo ${n}`, { x: 60, y: 760, size: 22, font: fonte });
  pagina.drawText("Este PDF serve só para ver a página Documentos.", { x: 60, y: 720, size: 12, font: fonte });
  const bytes = await pdf.save();
  return enviarMidia({ bytes, nome: `${titulo.replace(/[^\p{L}\p{N} ]/gu, "").trim()}.pdf` }, { quem });
}

type Exemplo = {
  tipo: TipoDocumento;
  subtipo: SubtipoDocumento;
  titulo: string;
  numero: string;
  /** Há quantos dias foi publicado. */
  publicadoHaDias: number;
  /** Prazo daqui a N dias (negativo: já passou), às 19h. */
  prazoEmDias?: number;
  vigencia?: [string, string];
  abrangencia?: string;
};

const ano = Number(bahiaEmCampos(new Date()).data.slice(0, 4));

const EXEMPLOS: Exemplo[] = [
  { tipo: "edital", subtipo: "convocacao", titulo: "Assembleia geral extraordinária", numero: `Edital nº 012/${ano}`, publicadoHaDias: 2, prazoEmDias: 2 },
  { tipo: "edital", subtipo: "prestacao_contas", titulo: "Prestação de contas do exercício anterior", numero: `Edital nº 011/${ano}`, publicadoHaDias: 5, prazoEmDias: 20 },
  { tipo: "edital", subtipo: "eleicao", titulo: "Eleição da comissão de fábrica", numero: `Edital nº 010/${ano}`, publicadoHaDias: 25, prazoEmDias: -3 },
  { tipo: "edital", subtipo: "convocacao", titulo: "Assembleia sobre a pauta de reivindicações", numero: `Edital nº 009/${ano}`, publicadoHaDias: 40 },
  ...Array.from({ length: 9 }, (_, i): Exemplo => ({
    tipo: "edital",
    subtipo: (["convocacao", "outros", "eleicao"] as const)[i % 3]!,
    titulo: `Edital de exemplo ${i + 1}`,
    numero: `Edital nº ${String(8 - i).padStart(3, "0")}/${ano}`,
    publicadoHaDias: 60 + i * 35,
  })),
  {
    tipo: "acordo",
    subtipo: "act",
    titulo: `Acordo coletivo ${ano}/${ano + 1}`,
    numero: `ACT ${ano}/${ano + 1}`,
    publicadoHaDias: 30,
    vigencia: [`${ano}-05-01`, `${ano + 1}-04-30`],
    abrangencia: "Empresa de transporte de exemplo",
  },
  {
    tipo: "acordo",
    subtipo: "cct",
    titulo: `Convenção coletiva ${ano - 1}/${ano}`,
    numero: `CCT ${ano - 1}/${ano}`,
    publicadoHaDias: 380,
    vigencia: [`${ano - 1}-05-01`, `${ano}-04-30`],
    abrangencia: "Transporte coletivo urbano de exemplo",
  },
  {
    tipo: "acordo",
    subtipo: "act",
    titulo: `Acordo coletivo ${ano - 2}/${ano - 1}`,
    numero: `ACT ${ano - 2}/${ano - 1}`,
    publicadoHaDias: 740,
    vigencia: [`${ano - 2}-05-01`, `${ano - 1}-04-30`],
    abrangencia: "Empresa de transporte de exemplo",
  },
];

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Este comando é só para desenvolvimento e não roda com NODE_ENV=production.");
  }
  const jaTem = await banco()
    .select({ id: conteudo.id })
    .from(conteudo)
    .where(and(inArray(conteudo.tipo, ["edital", "acordo"]), like(conteudo.titulo, "[Exemplo]%")))
    .limit(1);
  if (jaTem.length > 0) throw new Error("Já há documentos de exemplo. Arquive-os no painel antes de criar de novo.");

  const [pessoa] = await banco()
    .select({ id: pessoaEquipe.id })
    .from(pessoaEquipe)
    .where(and(eq(pessoaEquipe.situacao, "ativa"), eq(pessoaEquipe.perfil, "ADM")))
    .limit(1);
  if (!pessoa) throw new Error("Não há ADM ativo. Rode antes pnpm criar-admin ou pnpm dev:pessoas-teste.");
  const quem: QuemDaEquipe = { tipo: "equipe", id: pessoa.id, perfil: "ADM" };

  const [categoriaDoc] = await banco().select({ id: categoria.id }).from(categoria).where(eq(categoria.escopos, ["documentos"])).limit(1);
  if (!categoriaDoc) throw new Error("Não há categoria de Documentos.");
  const hoje = bahiaEmCampos(new Date()).data;

  for (const [n, e] of EXEMPLOS.entries()) {
    const titulo = `[Exemplo] ${e.titulo}`;
    const pdf = await pdfDeExemplo(quem, e.titulo, n + 1);
    const dados: DadosDocumento = {
      ...documentoVazio(e.tipo),
      titulo,
      numero: e.numero,
      subtipo: e.subtipo,
      dataDocumento: somarDias(hoje, -e.publicadoHaDias),
      eventoData: e.prazoEmDias !== undefined ? somarDias(hoje, e.prazoEmDias) : "",
      eventoHora: e.prazoEmDias !== undefined ? "19:00" : "",
      temVigencia: e.tipo === "acordo",
      vigenciaInicio: e.vigencia?.[0] ?? "",
      vigenciaFim: e.vigencia?.[1] ?? "",
      abrangencia: e.abrangencia ?? "",
      partesSignatarias: e.tipo === "acordo" ? "Sindicato de exemplo e empresa de exemplo" : "",
      resumo: "Resumo de exemplo. Este texto é só para ver como o documento aparece no site e não traz informação real.",
      categoriaId: categoriaDoc.id,
      pdfMidiaId: pdf.id,
      textoPesquisavel: `Texto pesquisável de exemplo ${n + 1}: pauta, reajuste e votação.`,
    };
    const salvo = await salvarRascunhoDocumento({ tipo: e.tipo, dados }, { quem, sessaoEdicao: randomUUID() });
    if (salvo.tipo !== "salvo") throw new Error("Não consegui salvar o documento de exemplo.");
    const r = await publicarDocumento({ id: salvo.id, revisaoBase: salvo.revisao, confirmoOficial: true }, { quem });
    if (r.tipo !== "publicado") throw new Error("Não consegui publicar o documento de exemplo.");
    await banco()
      .update(conteudo)
      .set({ publicadoEm: new Date(Date.now() - e.publicadoHaDias * DIA) })
      .where(eq(conteudo.id, salvo.id));
  }
  console.log(`${EXEMPLOS.length} documentos de exemplo publicados. Abra http://localhost:3000/documentos/editais`);
}

main()
  .catch((erro) => {
    console.error(erro instanceof Error ? erro.message : erro);
    process.exitCode = 1;
  })
  .finally(fecharBanco);
