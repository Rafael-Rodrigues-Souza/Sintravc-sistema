/**
 * Confere o documento vindo da tela (não confiável), sem o banco (RF41, E46). No rascunho tudo pode
 * ficar vazio; os limites, o formato das datas e o fim da vigência depois do início valem sempre.
 * Puro: roda no servidor e na tela.
 */
import { z } from "zod";

import { ErroConteudo } from "@/lib/conteudos/erros";

import {
  LIMITE_ABRANGENCIA,
  LIMITE_NUMERO,
  LIMITE_PARTES,
  LIMITE_RESUMO,
  LIMITE_TEXTO_PESQUISAVEL,
  LIMITE_TITULO_DOCUMENTO,
  SUBTIPOS,
  type DadosDocumento,
  type TipoDocumento,
} from "./dados";

/** Forma do número usada na unicidade por tipo (E46): sem espaços sobrando e sem maiúsculas. */
export function normalizarNumero(numero: string): string | null {
  const forma = numero.trim().replace(/\s+/g, " ").toLocaleLowerCase("pt-BR");
  return forma === "" ? null : forma;
}

const texto = (maximo: number, mensagem: string) => z.string().trim().max(maximo, { error: mensagem });

function diaValido(dia: string): boolean {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dia);
  if (!d) return false;
  const [ano, mes, numero] = [Number(d[1]), Number(d[2]), Number(d[3])];
  const data = new Date(Date.UTC(ano, mes - 1, numero));
  return data.getUTCFullYear() === ano && data.getUTCMonth() === mes - 1 && data.getUTCDate() === numero;
}

const dia = (mensagem: string) => z.string().trim().refine((v) => v === "" || diaValido(v), { error: mensagem });

const esquema = z.object({
  titulo: texto(LIMITE_TITULO_DOCUMENTO, `O título pode ter até ${LIMITE_TITULO_DOCUMENTO} caracteres.`),
  numero: texto(LIMITE_NUMERO, `O número pode ter até ${LIMITE_NUMERO} caracteres.`),
  subtipo: z.string().nullable(),
  dataDocumento: dia("Confira a data do documento."),
  eventoData: dia("Confira a data do evento ou prazo."),
  eventoHora: z
    .string()
    .trim()
    .refine((v) => v === "" || /^([01]\d|2[0-3]):[0-5]\d$/.test(v), { error: "Confira a hora do evento ou prazo." }),
  temVigencia: z.boolean(),
  vigenciaInicio: dia("Confira o início da vigência."),
  vigenciaFim: dia("Confira o fim da vigência."),
  abrangencia: texto(LIMITE_ABRANGENCIA, `A abrangência pode ter até ${LIMITE_ABRANGENCIA} caracteres.`),
  partesSignatarias: texto(LIMITE_PARTES, `As partes signatárias podem ter até ${LIMITE_PARTES} caracteres.`),
  resumo: texto(LIMITE_RESUMO, `O resumo pode ter até ${LIMITE_RESUMO} caracteres.`),
  categoriaId: z.uuid().nullable(),
  pdfMidiaId: z.uuid().nullable(),
  textoPesquisavel: z.string().max(LIMITE_TEXTO_PESQUISAVEL, { error: "O texto pesquisável ficou grande demais." }),
});

export function conferirDocumento(tipo: TipoDocumento, entrada: DadosDocumento): DadosDocumento {
  const validado = esquema.safeParse(entrada);
  if (!validado.success) {
    const problema = validado.error.issues[0]!;
    throw new ErroConteudo("invalido", problema.message, String(problema.path[0]));
  }
  const dados = validado.data;
  const subtipos: readonly string[] = SUBTIPOS[tipo];
  if (dados.subtipo !== null && !subtipos.includes(dados.subtipo)) {
    throw new ErroConteudo("invalido", tipo === "edital" ? "Escolha um tipo de edital." : "Escolha ACT ou CCT.", "subtipo");
  }
  if (dados.eventoData !== "" && dados.eventoHora === "") {
    throw new ErroConteudo("invalido", "Informe a hora do evento ou prazo.", "eventoHora");
  }
  if (dados.eventoHora !== "" && dados.eventoData === "") {
    throw new ErroConteudo("invalido", "Informe a data do evento ou prazo.", "eventoData");
  }
  const temVigencia = tipo === "acordo" || dados.temVigencia;
  const vigenciaInicio = temVigencia ? dados.vigenciaInicio : "";
  const vigenciaFim = temVigencia ? dados.vigenciaFim : "";
  if (vigenciaInicio !== "" && vigenciaFim !== "" && vigenciaFim < vigenciaInicio) {
    throw new ErroConteudo("invalido", "O fim da vigência não pode ser antes do início.", "vigenciaFim");
  }
  return {
    ...dados,
    subtipo: dados.subtipo as DadosDocumento["subtipo"],
    temVigencia,
    vigenciaInicio,
    vigenciaFim,
  };
}
