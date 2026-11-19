/**
 * Mapa do site (Fase 1, sem “Entrar”: E01, N13). Uma só fonte para o cabeçalho, o menu mobile
 * e o rodapé. Notícias, Benefícios, Documentos e Rádio Chofer chegam nas issues #15 a #18.
 */
export type ItemDeMenu = { rotulo: string; href: string };
export type GrupoDeMenu = { rotulo: string; itens: ItemDeMenu[]; base: string };
export type EntradaDoMenu = ItemDeMenu | GrupoDeMenu;

export const SINDICATO: GrupoDeMenu = {
  rotulo: "Sindicato",
  base: "/sindicato",
  itens: [
    { rotulo: "Instituição", href: "/sindicato/instituicao" },
    { rotulo: "Diretoria", href: "/sindicato/diretoria" },
    { rotulo: "Benefícios", href: "/sindicato/beneficios" },
  ],
};

export const DOCUMENTOS: GrupoDeMenu = {
  rotulo: "Documentos",
  base: "/documentos",
  itens: [
    { rotulo: "Acordos coletivos", href: "/documentos/acordos-coletivos" },
    { rotulo: "Editais", href: "/documentos/editais" },
  ],
};

export const INICIO: ItemDeMenu = { rotulo: "Início", href: "/" };
export const NOTICIAS: ItemDeMenu = { rotulo: "Notícias", href: "/noticias" };
export const RADIO: ItemDeMenu = { rotulo: "Rádio Chofer", href: "/radio-chofer" };
export const CONTATO: ItemDeMenu = { rotulo: "Contato", href: "/contato" };

export const MENU_PRINCIPAL: EntradaDoMenu[] = [INICIO, NOTICIAS, SINDICATO, DOCUMENTOS, RADIO, CONTATO];

export const POLITICA: ItemDeMenu = { rotulo: "Política de privacidade", href: "/politica-de-privacidade" };
export const TERMOS: ItemDeMenu = { rotulo: "Termos de uso", href: "/termos-de-uso" };

export function ehGrupo(entrada: EntradaDoMenu): entrada is GrupoDeMenu {
  return "itens" in entrada;
}

/** O item (ou grupo) está ativo no caminho atual? */
export function estaAtivo(entrada: EntradaDoMenu, caminho: string): boolean {
  if (ehGrupo(entrada)) return caminho === entrada.base || caminho.startsWith(`${entrada.base}/`);
  if (entrada.href === "/") return caminho === "/";
  return caminho === entrada.href || caminho.startsWith(`${entrada.href}/`);
}
