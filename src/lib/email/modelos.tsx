import { render } from "@react-email/render";

import { ASSUNTO_CONVITE, ConviteEquipe, type DadosConviteEquipe } from "@/emails/convite-equipe";

import type { Mensagem } from ".";

/** M01: convite para a equipe, em HTML e em texto. */
export async function mensagemConviteEquipe(para: string, dados: DadosConviteEquipe): Promise<Mensagem> {
  const elemento = <ConviteEquipe {...dados} />;
  return {
    para,
    assunto: ASSUNTO_CONVITE,
    html: await render(elemento),
    texto: await render(elemento, { plainText: true }),
  };
}
