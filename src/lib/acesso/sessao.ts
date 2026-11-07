export type LimitesDaSessao = {
  /** Encerra depois deste tempo sem uso (Parametro equipe.sessao_sem_uso_horas). */
  semUsoHoras: number;
  /** Encerra depois deste tempo do login, mesmo em uso (Parametro equipe.sessao_maxima_horas). */
  maximaHoras: number;
};

export type EstadoDaSessao = "valida" | "expirada_sem_uso" | "expirada_maxima";

const HORA = 60 * 60 * 1000;

/** E05 / RNF02: a sessão termina depois de 2 h sem uso ou 12 h após o login, o que vier primeiro. */
export function estadoDaSessao(dados: {
  criadaEm: Date;
  ultimoUso: Date;
  agora: Date;
  limites: LimitesDaSessao;
}): EstadoDaSessao {
  const { criadaEm, ultimoUso, agora, limites } = dados;
  const agoraMs = agora.getTime();
  if (agoraMs - criadaEm.getTime() >= limites.maximaHoras * HORA) return "expirada_maxima";
  if (agoraMs - ultimoUso.getTime() >= limites.semUsoHoras * HORA) return "expirada_sem_uso";
  return "valida";
}
