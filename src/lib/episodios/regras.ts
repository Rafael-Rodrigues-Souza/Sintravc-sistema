import { bahiaParaUtc } from "@/lib/datas";
import { segundosDoTexto } from "@/lib/youtube/duracao";
import { idDoYoutube } from "@/lib/youtube/link";

/** Limites dos campos (E55, E61). Também conferidos no banco. */
export const TITULO_MAX = 120;
export const RESUMO_MAX = 200;
export const TRANSCRICAO_MAX = 150_000;

export type EstadoEpisodio = "rascunho" | "agendado" | "publicado";

/**
 * Onde o episódio está agora, pelo relógio (E61, como o E58). O `estado` gravado pode estar
 * atrasado, se a T03 ainda não rodou; a situação não: é ela que decide o site e as ações.
 */
export type Situacao = "rascunho" | "agendado" | "no_ar";

/** “Salvar rascunho” ou “Agendar episódio”/“Publicar episódio”/“Salvar alterações”. */
export type ModoDeSalvar = "rascunho" | "programar";

export type CampoDoEpisodio =
  | "link"
  | "numero"
  | "titulo"
  | "duracao"
  | "resumo"
  | "tema"
  | "exibicao"
  | "transcricao"
  | "capa";

/** Erro esperado do Rádio Chofer: a mensagem vai direto para a tela, e o campo diz onde mostrar. */
export class ErroDoRadio<C extends string = string> extends Error {
  constructor(
    mensagem: string,
    readonly campo?: C,
  ) {
    super(mensagem);
    this.name = new.target.name;
  }
}

/** Erro do episódio (modal e menu ⋯). */
export class ErroEpisodio extends ErroDoRadio<CampoDoEpisodio> {}

/**
 * O episódio está no site e a exibição nova é no futuro: ele sai do site até lá. A tela confirma
 * antes (“O episódio sai do site até…”) e manda de novo com `confirmarSaidaDoSite` (E61).
 */
export class ConfirmarSaidaDoSite extends Error {
  constructor(readonly ate: Date) {
    super("Este episódio sai do site até a nova exibição. Confirme para continuar.");
    this.name = "ConfirmarSaidaDoSite";
  }
}

/** No ar agora e a exibição nova é no futuro: salvar tira o episódio do site até lá. */
export function vaiSairDoSite(situacaoAntes: Situacao, exibicao: Date | null, agora: Date): boolean {
  return situacaoAntes === "no_ar" && !!exibicao && exibicao.getTime() > agora.getTime();
}

export const episodioNaoEncontrado = () => new ErroEpisodio("Este episódio não existe mais. Atualize a página.");

export const MENSAGEM_LINK_INVALIDO =
  "Este link não é de um vídeo do YouTube. Cole o link do vídeo (youtube.com/watch… ou youtu.be/…).";

type ComExibicao = { estado: EstadoEpisodio; exibicaoEm: Date | null };

export function situacaoDo(e: ComExibicao, agora: Date): Situacao {
  if (e.estado === "rascunho" || !e.exibicaoEm) return "rascunho";
  return e.exibicaoEm.getTime() <= agora.getTime() ? "no_ar" : "agendado";
}

/** O rótulo do botão principal do modal (E61). */
export function botaoDoModal(situacaoAntes: Situacao, exibicao: Date | null, agora: Date): string {
  const passou = !!exibicao && exibicao.getTime() <= agora.getTime();
  // Continua onde está (no ar, ou agendado para o futuro): só salva.
  if ((situacaoAntes === "no_ar" && passou) || (situacaoAntes === "agendado" && exibicao && !passou)) return "Salvar alterações";
  return passou ? "Publicar episódio" : "Agendar episódio";
}

/** “Ep. 42 — Saúde mental no volante”, o rótulo da Atividade e dos avisos. */
export function rotuloDoEpisodio(numero: number, titulo: string): string {
  return `Ep. ${numero} — ${titulo}`;
}

/** O que a tela manda: textos dos campos, como a pessoa digitou. Data e hora no horário da Bahia. */
export type CamposEpisodio = {
  link: string;
  numero: string;
  titulo: string;
  duracao: string;
  resumo: string;
  temaId: string;
  data: string;
  hora: string;
  transcricao: string;
  capaMidiaId: string;
  ultimoPrograma: boolean;
  /** O que o YouTube devolveu na busca (quadro “Vídeo encontrado”). */
  tituloYoutube: string;
  canalYoutube: string;
};

export type DadosEpisodio = {
  youtubeId: string;
  numero: number;
  titulo: string;
  duracaoSeg: number | null;
  resumo: string | null;
  temaId: string | null;
  exibicaoEm: Date | null;
  transcricao: string | null;
  capaMidiaId: string | null;
  ultimoPrograma: boolean;
  tituloYoutube: string | null;
  canalYoutube: string | null;
};

export type Conferencia = { ok: true; dados: DadosEpisodio } | { ok: false; campo: CampoDoEpisodio; mensagem: string };

const vazioParaNull = (t: string) => (t.trim() ? t.trim() : null);

/**
 * Confere os campos (a mesma função na tela, antes de mandar, e no servidor). O rascunho pede link,
 * número e título; agendar e publicar pedem também a exibição (E61).
 */
export function conferirCampos(c: CamposEpisodio, modo: ModoDeSalvar): Conferencia {
  const youtubeId = idDoYoutube(c.link);
  if (!c.link.trim()) return { ok: false, campo: "link", mensagem: "Cole o link do vídeo no YouTube." };
  if (!youtubeId) return { ok: false, campo: "link", mensagem: MENSAGEM_LINK_INVALIDO };

  const numero = Number(c.numero.trim());
  if (!c.numero.trim()) return { ok: false, campo: "numero", mensagem: "Informe o número do episódio." };
  if (!Number.isInteger(numero) || numero < 1 || numero > 99999) {
    return { ok: false, campo: "numero", mensagem: "O número tem de ser inteiro, a partir de 1." };
  }

  const titulo = c.titulo.trim();
  if (!titulo) return { ok: false, campo: "titulo", mensagem: "Informe o título no site." };
  if (titulo.length > TITULO_MAX) {
    return { ok: false, campo: "titulo", mensagem: `O título pode ter até ${TITULO_MAX} caracteres.` };
  }

  const duracaoSeg = segundosDoTexto(c.duracao);
  if (duracaoSeg === undefined) {
    return { ok: false, campo: "duracao", mensagem: "Digite a duração como 28:10 ou 1:02:30." };
  }

  const resumo = vazioParaNull(c.resumo);
  if (resumo && resumo.length > RESUMO_MAX) {
    return { ok: false, campo: "resumo", mensagem: `O resumo pode ter até ${RESUMO_MAX} caracteres.` };
  }

  const transcricao = vazioParaNull(c.transcricao);
  if (transcricao && transcricao.length > TRANSCRICAO_MAX) {
    return {
      ok: false,
      campo: "transcricao",
      mensagem: `A transcrição pode ter até ${TRANSCRICAO_MAX.toLocaleString("pt-BR")} caracteres.`,
    };
  }

  let exibicaoEm: Date | null = null;
  if (c.data.trim() || c.hora.trim()) {
    exibicaoEm = bahiaParaUtc(c.data.trim(), c.hora.trim());
    if (!exibicaoEm) return { ok: false, campo: "exibicao", mensagem: "Escolha a data e a hora da exibição." };
  }
  if (modo === "programar" && !exibicaoEm) {
    return { ok: false, campo: "exibicao", mensagem: "Escolha a data e a hora da exibição." };
  }

  return {
    ok: true,
    dados: {
      youtubeId,
      numero,
      titulo,
      duracaoSeg,
      resumo,
      temaId: vazioParaNull(c.temaId),
      exibicaoEm,
      transcricao,
      capaMidiaId: vazioParaNull(c.capaMidiaId),
      ultimoPrograma: c.ultimoPrograma,
      tituloYoutube: vazioParaNull(c.tituloYoutube),
      canalYoutube: vazioParaNull(c.canalYoutube),
    },
  };
}
