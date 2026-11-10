/**
 * O que a notícia precisa ter para ir ao ar (E42, RN15). No rascunho tudo pode ficar vazio (E40);
 * a cobrança é na publicação. A mesma regra roda na tela (card "Antes de publicar") e no servidor.
 * Nada aqui importa código de servidor.
 */
import { imagensSemAlt, textoDoCorpo } from "./corpo";
import type { DadosNoticia } from "./dados";

/** `campo` é a chave do campo na tela (a mesma do erro do salvamento). */
export type CampoObrigatorio = "titulo" | "lide" | "corpo" | "categoriaId" | "assinatura" | "capaAlt" | "imagensDoCorpo";
export type Falta = { campo: CampoObrigatorio; rotulo: string };

const vazio = (texto: string) => texto.trim() === "";

/** Itens que faltam, na ordem em que aparecem na tela. Lista vazia: pode publicar. */
export function faltasParaPublicar(dados: DadosNoticia): Falta[] {
  const faltas: Falta[] = [];
  if (vazio(dados.titulo)) faltas.push({ campo: "titulo", rotulo: "Manchete" });
  if (vazio(dados.lide)) faltas.push({ campo: "lide", rotulo: "Lide" });
  if (vazio(textoDoCorpo(dados.corpo))) faltas.push({ campo: "corpo", rotulo: "Corpo da notícia" });
  const semAlt = imagensSemAlt(dados.corpo);
  if (semAlt > 0) {
    const quantas = semAlt === 1 ? "1 imagem" : `${semAlt} imagens`;
    faltas.push({ campo: "imagensDoCorpo", rotulo: `Texto alternativo de ${quantas} do corpo` });
  }
  if (dados.capaMidiaId && vazio(dados.capaAlt)) faltas.push({ campo: "capaAlt", rotulo: "Texto alternativo da capa" });
  if (vazio(dados.assinatura)) faltas.push({ campo: "assinatura", rotulo: "Assinatura" });
  if (!dados.categoriaId) faltas.push({ campo: "categoriaId", rotulo: "Categoria" });
  return faltas;
}
