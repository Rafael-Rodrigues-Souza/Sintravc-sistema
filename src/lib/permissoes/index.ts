import { matriz, type Perfil, type Quem, type Recurso, type TipoRecurso } from "./matriz";

export type { DoServico, Perfil, Quem, Recurso, TipoRecurso } from "./matriz";

type RegraSolta = (quem: Quem, recurso: Recurso) => boolean;

/** As ações que existem para cada tipo de recurso (o TypeScript recusa as que não existem). */
export type AcaoDe<T extends TipoRecurso> = keyof (typeof matriz)[T] & string;

/**
 * Responde se `quem` pode fazer `acao` em `recurso` (spec §4; RNF01).
 *
 * É a única fonte de permissão: as server actions e as rotas chamam exigir();
 * o menu do painel usa areasDoPainel(). Esconder o botão não basta.
 */
export function pode<R extends Recurso>(quem: Quem, acao: AcaoDe<R["tipo"]>, recurso: R): boolean {
  // A linha da matriz é a do tipo do recurso, então a regra recebe o recurso certo.
  const regras = matriz[recurso.tipo] as unknown as Record<string, RegraSolta>;
  // Só as ações da própria tabela: "constructor", "toString" etc. não são ações.
  if (!Object.hasOwn(regras, acao)) return false;
  return regras[acao]!(quem, recurso) === true;
}

/** Erro lançado por exigir(). As rotas o convertem na tela 403 (N1). */
export class SemPermissao extends Error {
  constructor(
    readonly acao: string,
    readonly recurso: TipoRecurso,
  ) {
    super(`Sem permissão para ${acao} em ${recurso}.`);
    this.name = "SemPermissao";
  }
}

/** Para as server actions e rotas: segue se pode; senão, lança SemPermissao. */
export function exigir<R extends Recurso>(quem: Quem, acao: AcaoDe<R["tipo"]>, recurso: R): void {
  if (!pode(quem, acao, recurso)) throw new SemPermissao(acao, recurso.tipo);
}

// --- Menu do painel -----------------------------------------------------------

/** A fase do sistema em produção (spec §1). Agenda, Serviços e Relatórios são da Fase 2. */
export const FASE_ATUAL = 1;

/** Nome de cada perfil, como aparece nas telas e nos e-mails. */
export const NOME_DO_PERFIL: Record<Perfil, string> = {
  ADM: "Administrador geral",
  COM: "Comunicação",
  ATD: "Atendimento",
};

/**
 * Perfis que o Administrador geral pode dar no convite. O Atendimento só existe com a Fase 2
 * (CA-US29.3). A server action do convite também confere: esconder a opção não basta.
 */
export function perfisConvidaveis(fase: number = FASE_ATUAL): Perfil[] {
  return fase >= 2 ? ["ADM", "COM", "ATD"] : ["ADM", "COM"];
}

const AREAS = [
  { area: "visao_geral", fase: 1, mostra: (q: Quem) => pode(q, "ver", { tipo: "visao_geral" }) },
  {
    area: "conteudos",
    fase: 1,
    mostra: (q: Quem) => pode(q, "ver", { tipo: "noticia" }) || pode(q, "ver", { tipo: "documento" }),
  },
  { area: "comunicados", fase: 1, mostra: (q: Quem) => pode(q, "ver", { tipo: "comunicado" }) },
  { area: "radio", fase: 1, mostra: (q: Quem) => pode(q, "ver", { tipo: "radio" }) },
  { area: "pagina_inicial", fase: 1, mostra: (q: Quem) => pode(q, "ver", { tipo: "pagina_inicial" }) },
  { area: "midia", fase: 1, mostra: (q: Quem) => pode(q, "ver", { tipo: "midia" }) },
  { area: "beneficios", fase: 1, mostra: (q: Quem) => pode(q, "ver", { tipo: "beneficio" }) },
  { area: "agenda", fase: 2, mostra: (q: Quem) => pode(q, "ver", { tipo: "agenda" }) },
  {
    area: "servicos",
    fase: 2,
    mostra: (q: Quem) => pode(q, "ver", { tipo: "servico", responsaveisIds: [] }),
  },
  { area: "relatorios", fase: 2, mostra: (q: Quem) => pode(q, "abrir", { tipo: "relatorio" }) },
  { area: "atividade", fase: 1, mostra: (q: Quem) => pode(q, "ver", { tipo: "atividade" }) },
  { area: "equipe", fase: 1, mostra: (q: Quem) => pode(q, "ver", { tipo: "equipe" }) },
  {
    area: "configuracoes",
    fase: 1,
    mostra: (q: Quem) => pode(q, "ver", { tipo: "config_site" }) || pode(q, "ver", { tipo: "categoria" }),
  },
] as const;

export type AreaDoPainel = (typeof AREAS)[number]["area"];

/** As áreas do menu do painel que `quem` pode abrir, na ordem do menu. */
export function areasDoPainel(quem: Quem, { fase = FASE_ATUAL }: { fase?: number } = {}): AreaDoPainel[] {
  return AREAS.filter((item) => item.fase <= fase && item.mostra(quem)).map((item) => item.area);
}
