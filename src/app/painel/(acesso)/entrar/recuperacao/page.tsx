import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { Eyebrow, MolduraAcesso } from "@/components/painel/moldura-acesso";
import { COOKIES_DO_DESAFIO } from "@/lib/acesso/cookies";
import { voltarSeguro } from "@/lib/acesso/sessao";

import { FormularioRecuperacao } from "./formulario-recuperacao";

export const metadata: Metadata = { title: "Usar código de recuperação", robots: { index: false, follow: false } };

type Props = { searchParams: Promise<{ voltar?: string }> };

/**
 * Login com código de recuperação (Figma 262:40966; US42, RN49). Passa pelo mesmo confirmarCodigo()
 * do código do aplicativo, com a mesma contagem de tentativas (RN05, E36).
 */
export default async function PaginaRecuperacao({ searchParams }: Props) {
  const { voltar } = await searchParams;
  const loja = await cookies();
  // Sem o desafio aberto pela senha, não há o que confirmar.
  if (!COOKIES_DO_DESAFIO.some((nome) => loja.has(nome))) {
    redirect("/painel/entrar");
  }

  return (
    <MolduraAcesso>
      <Eyebrow>Verificação em duas etapas</Eyebrow>
      <h1 className="texto-titulo-secao-mobile text-texto-primario lg:texto-titulo-secao">
        Use um código de recuperação
      </h1>
      <p className="texto-corpo text-texto-secundario">
        Digite um dos códigos que você guardou ao ativar a verificação. Cada código funciona uma vez.
      </p>
      <FormularioRecuperacao voltar={voltarSeguro(voltar)} />
    </MolduraAcesso>
  );
}
