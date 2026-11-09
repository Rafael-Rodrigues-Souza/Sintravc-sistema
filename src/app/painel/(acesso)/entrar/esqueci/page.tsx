import type { Metadata } from "next";

import { MolduraAcesso } from "@/components/painel/moldura-acesso";
import { lerParametro } from "@/lib/parametros";

import { FormularioEsqueci } from "./formulario-esqueci";

export const metadata: Metadata = { title: "Esqueci minha senha", robots: { index: false, follow: false } };
// Os textos usam valores do Parametro, lidos a cada pedido (não no build).
export const dynamic = "force-dynamic";

/**
 * Esqueci minha senha (Figma 262:40675 / 265:40937) e Link enviado (262:40761). RN48, US41.
 * A resposta é sempre a mesma, tenha ou não o e-mail acesso ao painel (CA-US41.2).
 */
export default async function PaginaEsqueci() {
  return (
    <MolduraAcesso>
      <FormularioEsqueci
        horas={await lerParametro("equipe.link_senha_horas")}
        intervaloSegundos={await lerParametro("equipe.link_senha_intervalo_segundos")}
      />
    </MolduraAcesso>
  );
}
