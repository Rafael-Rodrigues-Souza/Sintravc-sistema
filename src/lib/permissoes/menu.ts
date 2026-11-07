import { areasDoPainel, FASE_ATUAL, type AreaDoPainel, type Quem } from ".";

/**
 * Menu lateral do painel (RN06, RF31; Figma 107:715). As áreas vêm de areasDoPainel(),
 * que usa pode(): o menu e o servidor têm a mesma fonte de permissão (T2).
 */
export type ItemDoMenu = {
  area: AreaDoPainel;
  rotulo: string;
  href: string;
  /** Nome do ícone do lucide-react. */
  icone: string;
};

export type GrupoDoMenu = { titulo: string | null; itens: ItemDoMenu[] };

const AREAS: Record<AreaDoPainel, Omit<ItemDoMenu, "area">> = {
  visao_geral: { rotulo: "Visão geral", href: "/painel", icone: "LayoutGrid" },
  conteudos: { rotulo: "Conteúdos", href: "/painel/conteudos", icone: "FileText" },
  comunicados: { rotulo: "Comunicados", href: "/painel/comunicados", icone: "Megaphone" },
  radio: { rotulo: "Rádio Chofer", href: "/painel/radio", icone: "SquarePlay" },
  pagina_inicial: { rotulo: "Página inicial", href: "/painel/pagina-inicial", icone: "Star" },
  beneficios: { rotulo: "Benefícios", href: "/painel/beneficios", icone: "IdCard" },
  midia: { rotulo: "Mídia", href: "/painel/midia", icone: "Image" },
  atividade: { rotulo: "Atividade", href: "/painel/atividade", icone: "History" },
  equipe: { rotulo: "Equipe e perfis", href: "/painel/equipe", icone: "Users" },
  configuracoes: { rotulo: "Configurações", href: "/painel/configuracoes", icone: "SlidersVertical" },
  agenda: { rotulo: "Agendamentos", href: "/painel/agenda", icone: "Calendar" },
  servicos: { rotulo: "Serviços", href: "/painel/servicos", icone: "Briefcase" },
  relatorios: { rotulo: "Relatórios", href: "/painel/relatorios", icone: "ChartColumn" },
};

/** Grupos e ordem do Figma (107:715). Atendimento é da Fase 2. */
const GRUPOS: { titulo: string | null; areas: AreaDoPainel[] }[] = [
  { titulo: null, areas: ["visao_geral"] },
  { titulo: "Publicações", areas: ["conteudos", "comunicados", "radio"] },
  { titulo: "Site", areas: ["pagina_inicial", "beneficios", "midia"] },
  { titulo: "Administração", areas: ["atividade", "equipe", "configuracoes"] },
  { titulo: "Atendimento", areas: ["agenda", "servicos", "relatorios"] },
];

/** O menu de `quem`: só as áreas que ele pode abrir; grupos vazios somem. */
export function itensDoMenu(quem: Quem, { fase = FASE_ATUAL }: { fase?: number } = {}): GrupoDoMenu[] {
  const permitidas = new Set(areasDoPainel(quem, { fase }));
  return GRUPOS.map((grupo) => ({
    titulo: grupo.titulo,
    itens: grupo.areas.filter((a) => permitidas.has(a)).map((area) => ({ area, ...AREAS[area] })),
  })).filter((grupo) => grupo.itens.length > 0);
}

/** A área do painel de um endereço (para "Você estava em…" e para a tela 403). */
export function areaDoCaminho(caminho: string): ItemDoMenu | undefined {
  const caminhoLimpo = caminho.split(/[?#]/)[0]!.replace(/\/+$/, "") || "/";
  let melhor: ItemDoMenu | undefined;
  for (const [area, item] of Object.entries(AREAS) as [AreaDoPainel, (typeof AREAS)[AreaDoPainel]][]) {
    const casa = caminhoLimpo === item.href || caminhoLimpo.startsWith(`${item.href}/`);
    if (casa && (!melhor || item.href.length > melhor.href.length)) melhor = { area, ...item };
  }
  return melhor;
}
