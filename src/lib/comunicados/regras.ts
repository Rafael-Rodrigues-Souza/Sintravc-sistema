import { z } from "zod";

import { normalizarEndereco } from "@/lib/conteudos/enderecos";

/** Tamanho máximo do título, o que a faixa mostra (RN14, R5). Também é conferido no banco. */
export const LIMITE_TITULO = 140;
/** Tamanho máximo do texto do comunicado, na janela e na página /comunicados (RN14, E58). Também no banco. */
export const LIMITE_TEXTO = 1000;

export type EstadoComunicado = "rascunho" | "agendado" | "publicado" | "encerrado";

/**
 * Onde o comunicado está agora, pelo relógio (E58). O `estado` gravado pode estar atrasado, se a
 * tarefa T02 ainda não rodou; a situação não: é ela que decide a faixa, as abas e as ações.
 */
export type Situacao = "rascunho" | "agendado" | "no_ar" | "encerrado";

/** As abas da área Comunicados, na ordem da tela (E58). */
export const ABAS = ["no_ar", "agendados", "rascunhos", "encerrados"] as const;
export type Aba = (typeof ABAS)[number];

/** Os conteúdos que o “Saiba mais” aceita, com o nome de cada tipo. */
export const NOME_DO_TIPO = { noticia: "Notícia", edital: "Edital", acordo: "Acordo" } as const;
export type TipoDoLink = keyof typeof NOME_DO_TIPO;

export type LinkComunicado = { tipo: "conteudo"; id: string } | { tipo: "url"; url: string } | null;

export type DadosComunicado = {
  titulo: string;
  /** Texto simples: as quebras de linha ficam. */
  texto: string;
  link: LinkComunicado;
  inicio: Date | null;
  fim: Date | null;
};

/** "Salvar rascunho" ou "Agendar"/"Publicar agora"/"Salvar alterações" (vai ou fica no ar). */
export type ModoDeSalvar = "rascunho" | "programar";

export type CodigoErroComunicado = "nao_encontrado" | "invalido";
export type CampoDoComunicado = "titulo" | "texto" | "link" | "inicio" | "fim";

/** Erro esperado de Comunicados. A mensagem vai direto para a tela, em linguagem simples. */
export class ErroComunicado extends Error {
  constructor(
    readonly codigo: CodigoErroComunicado,
    mensagem: string,
    /** Com "invalido": o campo do formulário onde mostrar a mensagem. */
    readonly campo?: CampoDoComunicado,
  ) {
    super(mensagem);
    this.name = "ErroComunicado";
  }
}

export const comunicadoNaoEncontrado = () =>
  new ErroComunicado("nao_encontrado", "Este comunicado não existe mais. Atualize a página.");

type ComPeriodo = { estado: EstadoComunicado; inicio: Date | null; fim: Date | null };

/** A situação do comunicado neste instante: a faixa mostra os que estão `no_ar` (RN14, E58). */
export function situacaoDo(c: ComPeriodo, agora: Date): Situacao {
  if (c.estado === "rascunho") return "rascunho";
  if (c.estado === "encerrado") return "encerrado";
  if (!c.inicio || !c.fim) return "rascunho"; // o banco não deixa; só por segurança
  if (agora.getTime() >= c.fim.getTime()) return "encerrado";
  if (agora.getTime() >= c.inicio.getTime()) return "no_ar";
  return "agendado";
}

/**
 * O link “Saiba mais” digitado vira um endereço completo. Aceita endereço da web
 * ("sintravc.org.br/..." vira https) ou caminho do próprio site ("/contato").
 */
export function normalizarLinkDoComunicado(digitado: string): string | null {
  const texto = digitado.trim();
  if (texto.startsWith("//")) return null;
  if (/^\/\S*$/.test(texto)) return texto;
  return normalizarEndereco(texto);
}

/**
 * Confere o que veio do formulário (RN14). No rascunho, o título e o texto são obrigatórios; para ir
 * ao ar, também o início e o fim, com o fim depois do início e ainda por vir. Devolve os dados limpos.
 */
export function conferirDados(dados: DadosComunicado, modo: ModoDeSalvar, agora: Date): DadosComunicado {
  const textos = esquemaTextosDoComunicado.safeParse(dados);
  if (!textos.success) {
    const erro = erroDosTextos(textos.error);
    throw new ErroComunicado("invalido", erro.mensagem, erro.campo);
  }
  const { titulo, texto } = textos.data;

  let link: LinkComunicado = null;
  if (dados.link?.tipo === "url") {
    const url = normalizarLinkDoComunicado(dados.link.url);
    if (!url) throw new ErroComunicado("invalido", "Este link não parece um endereço. Confira e tente de novo.", "link");
    link = { tipo: "url", url };
  } else if (dados.link?.tipo === "conteudo") {
    link = { tipo: "conteudo", id: dados.link.id };
  }

  const { inicio, fim } = dados;
  if (modo === "programar") {
    if (!inicio) throw new ErroComunicado("invalido", "Escolha quando o comunicado começa.", "inicio");
    if (!fim) throw new ErroComunicado("invalido", "Escolha quando o comunicado termina.", "fim");
  }
  if (inicio && fim && fim.getTime() <= inicio.getTime()) {
    throw new ErroComunicado("invalido", "O fim tem de ser depois do início.", "fim");
  }
  if (modo === "programar" && fim && fim.getTime() <= agora.getTime()) {
    throw new ErroComunicado("invalido", "Este horário de fim já passou. Escolha um horário que ainda vai chegar.", "fim");
  }
  return { titulo, texto, link, inicio, fim };
}

/**
 * O texto do comunicado como fica gravado: texto simples, com as quebras de linha do Windows trocadas
 * pela comum e sem espaços nas pontas. Os limites valem para o texto já limpo; o contador do
 * formulário mostra o que está digitado, e o campo não deixa passar de LIMITE_TEXTO.
 */
export function limparTexto(texto: string): string {
  return texto.replace(/\r\n?/g, "\n").trim();
}

/**
 * Título e texto (RN14, E58): um esquema só para a tela (erro antes de mandar), a ação do servidor e
 * `conferirDados`. Devolve os dois limpos: o título numa linha, com os espaços juntados; o texto com
 * as quebras de linha.
 */
export const esquemaTextosDoComunicado = z.object({
  titulo: z
    .string()
    .transform((t) => t.replace(/\s+/g, " ").trim())
    .pipe(
      z
        .string()
        .min(1, "Escreva o título do comunicado.")
        .max(LIMITE_TITULO, `O título pode ter até ${LIMITE_TITULO} caracteres.`),
    ),
  texto: z
    .string()
    .transform(limparTexto)
    .pipe(
      z
        .string()
        .min(1, "Escreva o texto do comunicado.")
        .max(LIMITE_TEXTO, `O texto pode ter até ${LIMITE_TEXTO} caracteres.`),
    ),
});

/** O primeiro erro do título ou do texto (o título vem antes), com o campo onde mostrar. */
function erroDosTextos(erro: z.ZodError): { campo: "titulo" | "texto"; mensagem: string } {
  const primeiro = erro.issues.find((i) => i.path[0] === "titulo") ?? erro.issues[0]!;
  return { campo: primeiro.path[0] === "titulo" ? "titulo" : "texto", mensagem: primeiro.message };
}

/** O que a tela mostra antes de mandar: o primeiro erro do título ou do texto, ou null se estão certos. */
export function primeiroErroDosTextos(dados: { titulo: string; texto: string }) {
  const lido = esquemaTextosDoComunicado.safeParse(dados);
  return lido.success ? null : erroDosTextos(lido.error);
}

/** O nome do comunicado na Atividade e nos avisos: o começo do título. */
export function rotuloDoComunicado(titulo: string): string {
  return titulo.length > 60 ? `${titulo.slice(0, 59).trimEnd()}…` : titulo;
}
