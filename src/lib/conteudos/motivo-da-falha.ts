import type { CampoObrigatorio } from "./obrigatorios";
import { ErroFaltamCampos } from "./publicar";

const ROTULO: Record<CampoObrigatorio, string> = {
  titulo: "Manchete",
  lide: "Lide",
  corpo: "Corpo da notícia",
  imagensDoCorpo: "Texto alternativo das imagens do corpo",
  capaAlt: "Texto alternativo da capa",
  assinatura: "Assinatura",
  categoriaId: "Categoria",
};

/**
 * "O que aconteceu", no e-mail M06 e na Atividade: o que falta preencher ou, para qualquer outro
 * erro, a frase do desenho (295:43916). O erro técnico fica só no log do servidor.
 */
export function motivoDaFalha(erro: unknown): string {
  if (erro instanceof ErroFaltamCampos) return `Falta preencher: ${erro.campos.map((c) => ROTULO[c]).join(", ")}.`;
  return "O sistema tentou publicar de novo e não conseguiu.";
}
