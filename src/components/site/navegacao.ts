/**
 * Mapa do site (Fase 1, sem “Entrar”: E01, N13). Uma só fonte para o cabeçalho, o menu mobile,
 * o rodapé e os atalhos: cada página tem uma chave em LINKS, e os menus são montados a partir dela.
 * Notícias, Benefícios, Documentos e Rádio Chofer chegam nas issues #15 a #18.
 */
export type ItemDeMenu = { rotulo: string; href: string };
export type GrupoDeMenu = { rotulo: string; itens: ItemDeMenu[]; base: string };
export type EntradaDoMenu = ItemDeMenu | GrupoDeMenu;

export const LINKS = {
  inicio: { rotulo: "Início", href: "/" },
  noticias: { rotulo: "Notícias", href: "/noticias" },
  comunicados: { rotulo: "Comunicados", href: "/comunicados" },
  instituicao: { rotulo: "Instituição", href: "/sindicato/instituicao" },
  diretoria: { rotulo: "Diretoria", href: "/sindicato/diretoria" },
  beneficios: { rotulo: "Benefícios", href: "/sindicato/beneficios" },
  acordos: { rotulo: "Acordos coletivos", href: "/documentos/acordos-coletivos" },
  editais: { rotulo: "Editais", href: "/documentos/editais" },
  radio: { rotulo: "Rádio Chofer", href: "/radio-chofer" },
  contato: { rotulo: "Contato", href: "/contato" },
  politica: { rotulo: "Política de privacidade", href: "/politica-de-privacidade" },
  termos: { rotulo: "Termos de uso", href: "/termos-de-uso" },
} as const satisfies Record<string, ItemDeMenu>;

/**
 * Notícias e Comunicados (E58): Comunicados não está no Figma e fica dentro de Notícias, para a pessoa
 * achar de novo o aviso que fechou na faixa sem mais um item no primeiro nível.
 */
export const NOTICIAS: GrupoDeMenu = {
  rotulo: "Notícias",
  base: "/noticias",
  itens: [LINKS.noticias, LINKS.comunicados],
};

export const SINDICATO: GrupoDeMenu = {
  rotulo: "Sindicato",
  base: "/sindicato",
  itens: [LINKS.instituicao, LINKS.diretoria, LINKS.beneficios],
};

export const DOCUMENTOS: GrupoDeMenu = {
  rotulo: "Documentos",
  base: "/documentos",
  itens: [LINKS.acordos, LINKS.editais],
};

export const MENU_PRINCIPAL: EntradaDoMenu[] = [LINKS.inicio, NOTICIAS, SINDICATO, DOCUMENTOS, LINKS.radio, LINKS.contato];

export function ehGrupo(entrada: EntradaDoMenu): entrada is GrupoDeMenu {
  return "itens" in entrada;
}

/** O item (ou grupo) está ativo no caminho atual? O grupo está ativo quando um dos itens dele está. */
export function estaAtivo(entrada: EntradaDoMenu, caminho: string): boolean {
  if (ehGrupo(entrada)) return entrada.itens.some((item) => estaAtivo(item, caminho));
  if (entrada.href === "/") return caminho === "/";
  return caminho === entrada.href || caminho.startsWith(`${entrada.href}/`);
}
