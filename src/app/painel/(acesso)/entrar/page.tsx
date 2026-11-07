import type { Metadata } from "next";

import { Eyebrow, MolduraAcesso } from "@/components/painel/moldura-acesso";
import { Alerta } from "@/components/ui/alerta";
import { voltarSeguro } from "@/lib/acesso/sessao";
import { lerParametro } from "@/lib/parametros";
import { areaDoCaminho } from "@/lib/permissoes/menu";

import { FormularioEntrar } from "./formulario-entrar";

export const metadata: Metadata = { title: "Entrar no painel", robots: { index: false, follow: false } };

type Props = { searchParams: Promise<{ motivo?: string; voltar?: string }> };

/** Login da equipe (Figma 169:18816 / 169:18946) e Sessão expirada (293:43045, N3). */
export default async function PaginaEntrar({ searchParams }: Props) {
  const { motivo, voltar: voltarPedido } = await searchParams;
  const voltar = voltarSeguro(voltarPedido);
  const expirou = motivo === "expirada";
  const area = areaDoCaminho(voltar);
  const tentativas = await lerParametro("equipe.tentativas_login");
  const minutos = await lerParametro("equipe.bloqueio_minutos");
  const semUso = await lerParametro("equipe.sessao_sem_uso_horas");
  const maxima = await lerParametro("equipe.sessao_maxima_horas");

  return (
    <MolduraAcesso>
      <Eyebrow>{expirou ? "Sessão expirada" : "Acesso da equipe"}</Eyebrow>
      <h1 className="texto-titulo-secao-mobile text-texto-primario lg:texto-titulo-secao">
        {expirou ? "Entre de novo" : "Entrar no painel"}
      </h1>
      <p className="texto-corpo text-texto-secundario">
        {expirou
          ? `Por segurança, a sessão termina depois de ${semUso} horas sem uso ou ${maxima} horas após o login. Ao entrar, você volta para a página em que estava.`
          : "Somente funcionários do sindicato."}
      </p>

      {expirou ? (
        <Alerta tipo="aviso" titulo="Sua sessão expirou">
          {area && area.area !== "visao_geral" ? `Você estava em ${area.rotulo}.` : "Entre de novo para continuar."}
        </Alerta>
      ) : null}
      {motivo === "codigo" ? (
        <Alerta tipo="aviso" titulo="O tempo para digitar o código acabou">
          Por segurança, entre de novo com o e-mail e a senha.
        </Alerta>
      ) : null}

      <FormularioEntrar
        voltar={voltar}
        rotuloBotao={expirou ? "Entrar e voltar" : "Continuar"}
        avisoTentativas={expirou ? null : { tentativas, minutos }}
      />
    </MolduraAcesso>
  );
}
