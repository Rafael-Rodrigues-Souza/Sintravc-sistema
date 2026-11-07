import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { Eyebrow, MolduraAcesso } from "@/components/painel/moldura-acesso";
import { voltarSeguro } from "@/lib/acesso/sessao";

import { FormularioCodigo } from "./formulario-codigo";

export const metadata: Metadata = { title: "Verificação em duas etapas", robots: { index: false, follow: false } };

type Props = { searchParams: Promise<{ voltar?: string }> };

/**
 * Verificação em duas etapas (Figma 169:18895). Sem a caixa "Confiar neste computador por
 * 30 dias": as duas etapas valem a cada login (E05, RNF02; correcoes-figma.md).
 */
export default async function PaginaCodigo({ searchParams }: Props) {
  const { voltar } = await searchParams;
  const loja = await cookies();
  // Sem o desafio aberto pela senha, não há o que confirmar.
  if (!loja.has("sintravc.two_factor") && !loja.has("__Secure-sintravc.two_factor")) {
    redirect("/painel/entrar");
  }

  return (
    <MolduraAcesso>
      <Eyebrow>Verificação em duas etapas</Eyebrow>
      <h1 className="texto-titulo-secao-mobile text-texto-primario lg:texto-titulo-secao">Digite o código</h1>
      <p className="texto-corpo text-texto-secundario">
        Abra o aplicativo autenticador no seu celular e digite o código de 6 números.
      </p>
      <FormularioCodigo voltar={voltarSeguro(voltar)} />
    </MolduraAcesso>
  );
}
