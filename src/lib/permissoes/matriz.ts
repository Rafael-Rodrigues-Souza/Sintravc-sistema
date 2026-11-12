/**
 * Matriz de permissões do spec §4, linha a linha. É a única fonte de permissão do sistema
 * (RNF01; spec §11 T2): as server actions, as rotas e o menu passam por pode().
 *
 * Regra geral: o que não está aqui é negado. As linhas ◐ ("só o autor", "só os seus")
 * precisam dos dados do recurso; sem eles, a resposta é não.
 */

export type Perfil = "ADM" | "COM" | "ATD";

/** Quem pede: pessoa da equipe (com o perfil da sessão), associado logado ou visitante. */
export type Quem =
  | { tipo: "equipe"; id: string; perfil: Perfil }
  | { tipo: "associado"; id: string }
  | { tipo: "visitante" };

/** Uma pessoa da equipe logada no painel. */
export type QuemDaEquipe = Extract<Quem, { tipo: "equipe" }>;

/** Os responsáveis por um serviço (ResponsavelServico, RN19). */
export type DoServico = { responsaveisIds: readonly string[] };

/** Cada recurso, com os dados de que as linhas condicionais precisam. */
export type Recurso =
  | { tipo: "site_publico" }
  | { tipo: "noticia"; autorId?: string; jaPublicado?: boolean }
  | { tipo: "documento"; jaPublicado?: boolean }
  | { tipo: "comunicado" }
  | { tipo: "radio" }
  | { tipo: "pagina_inicial" }
  | { tipo: "midia"; emUso?: boolean }
  | { tipo: "beneficio" }
  | { tipo: "categoria" }
  | { tipo: "config_site" }
  | { tipo: "equipe" }
  | { tipo: "atividade" }
  | { tipo: "visao_geral" }
  | { tipo: "notificacao_painel" }
  | ({ tipo: "servico" } & DoServico)
  | { tipo: "agenda"; servico?: DoServico }
  | { tipo: "historico_associado"; servico?: DoServico }
  | { tipo: "relatorio"; servicos?: readonly DoServico[] }
  | { tipo: "area_associado"; associadoId?: string }
  | { tipo: "filiacao" };

export type TipoRecurso = Recurso["tipo"];
export type RecursoDo<T extends TipoRecurso> = Extract<Recurso, { tipo: T }>;

export type Regra<T extends TipoRecurso> = (quem: Quem, recurso: RecursoDo<T>) => boolean;

// --- Peças das regras -------------------------------------------------------

const perfis =
  (...aceitos: Perfil[]) =>
  (quem: Quem) =>
    quem.tipo === "equipe" && aceitos.includes(quem.perfil);

const SO_ADM = perfis("ADM");
const ADM_COM = perfis("ADM", "COM");
const ADM_COM_ATD = perfis("ADM", "COM", "ATD");
const ADM_ATD = perfis("ADM", "ATD");

const ehResponsavel = (quem: Quem, servico: DoServico | undefined) =>
  quem.tipo === "equipe" && servico !== undefined && servico.responsaveisIds.includes(quem.id);

/** ◐ "só os seus": o ADM sempre; o ATD só nos serviços de que é responsável. */
const admOuAtdResponsavel = (quem: Quem, servico: DoServico | undefined) =>
  SO_ADM(quem) || (perfis("ATD")(quem) && ehResponsavel(quem, servico));

// --- A matriz -----------------------------------------------------------------

export const matriz = {
  site_publico: {
    ver: () => true,
  },

  noticia: {
    // "de qualquer autor"
    ver: ADM_COM,
    criar: ADM_COM,
    editar: ADM_COM,
    publicar: ADM_COM,
    agendar: ADM_COM,
    ocultar: ADM_COM,
    arquivar: ADM_COM,
    restaurar: ADM_COM,
    fixar: ADM_COM,
    ver_versoes: ADM_COM,
    restaurar_versao: ADM_COM,
    // Só rascunho nunca publicado (RN54). ADM: de qualquer autor. COM: ◐ só o autor.
    excluir: (quem, noticia) => {
      if (noticia.jaPublicado !== false || noticia.autorId === undefined) return false;
      if (SO_ADM(quem)) return true;
      return perfis("COM")(quem) && quem.tipo === "equipe" && quem.id === noticia.autorId;
    },
  },

  // Edital, acordo e convenção: só o ADM altera; a COM vê e baixa (RN07, RN08, E46).
  documento: {
    criar: SO_ADM,
    editar: SO_ADM,
    publicar: SO_ADM,
    agendar: SO_ADM,
    substituir: SO_ADM,
    ocultar: SO_ADM,
    arquivar: SO_ADM,
    restaurar: SO_ADM,
    ver_versoes: SO_ADM,
    restaurar_versao: SO_ADM,
    // Só rascunho nunca publicado (RN54, E07).
    excluir: (quem, documento) => documento.jaPublicado === false && SO_ADM(quem),
    ver: ADM_COM,
    baixar: ADM_COM,
  },

  comunicado: { ver: ADM_COM, gerenciar: ADM_COM },
  radio: { ver: ADM_COM, gerenciar: ADM_COM },
  pagina_inicial: { ver: ADM_COM, gerenciar: ADM_COM },

  midia: {
    ver: ADM_COM,
    enviar: ADM_COM,
    editar_alt: ADM_COM,
    // Só mídia sem uso (RN16).
    excluir: (quem, midia) => midia.emUso === false && ADM_COM(quem),
  },

  beneficio: { ver: SO_ADM, gerenciar: SO_ADM },
  categoria: { ver: SO_ADM, gerenciar: SO_ADM },
  config_site: { ver: SO_ADM, gerenciar: SO_ADM },

  equipe: {
    ver: SO_ADM,
    convidar: SO_ADM,
    editar: SO_ADM,
    nova_senha: SO_ADM,
    redefinir_duas_etapas: SO_ADM,
    desativar: SO_ADM,
  },

  atividade: { ver: SO_ADM, exportar: SO_ADM },

  visao_geral: { ver: ADM_COM },
  // ATD: ◐ só notificações.
  notificacao_painel: { ver: ADM_COM_ATD },

  servico: {
    // A área Serviços: o ATD entra para ver os seus.
    ver: ADM_ATD,
    criar: SO_ADM,
    alterar_cadastro: SO_ADM, // nome, ícone, limite e responsáveis
    abrir_no_site: SO_ADM,
    alterar_funcionamento: (quem, servico) => admOuAtdResponsavel(quem, servico), // duração, horários, local
    bloquear_horario: (quem, servico) => admOuAtdResponsavel(quem, servico),
  },

  agenda: {
    // Grade e nomes: o ATD vê todos os serviços.
    ver: ADM_ATD,
    abrir_detalhe: (quem, agenda) => admOuAtdResponsavel(quem, agenda.servico),
    registrar_presenca: (quem, agenda) => admOuAtdResponsavel(quem, agenda.servico),
    cancelar: (quem, agenda) => admOuAtdResponsavel(quem, agenda.servico),
    remarcar: (quem, agenda) => admOuAtdResponsavel(quem, agenda.servico),
    agendar_balcao: (quem, agenda) => admOuAtdResponsavel(quem, agenda.servico),
    conceder_excecao: (quem, agenda) => admOuAtdResponsavel(quem, agenda.servico),
  },

  historico_associado: {
    ver: (quem, historico) => admOuAtdResponsavel(quem, historico.servico),
  },

  relatorio: {
    // A área Relatórios: o ATD entra e vê só os seus.
    abrir: ADM_ATD,
    ver: (quem, relatorio) => SO_ADM(quem) || todosDoAtd(quem, relatorio.servicos),
    exportar: (quem, relatorio) => SO_ADM(quem) || todosDoAtd(quem, relatorio.servicos),
  },

  area_associado: {
    ver: (quem, area) => quem.tipo === "associado" && quem.id === area.associadoId,
    alterar: (quem, area) => quem.tipo === "associado" && quem.id === area.associadoId,
    agendar: (quem, area) => quem.tipo === "associado" && quem.id === area.associadoId,
  },

  filiacao: {
    filiar_se: (quem) => quem.tipo === "visitante",
  },
} satisfies { [T in TipoRecurso]: Record<string, Regra<T>> };

function todosDoAtd(quem: Quem, servicos: readonly DoServico[] | undefined) {
  return (
    perfis("ATD")(quem) &&
    servicos !== undefined &&
    servicos.length > 0 &&
    servicos.every((servico) => ehResponsavel(quem, servico))
  );
}
