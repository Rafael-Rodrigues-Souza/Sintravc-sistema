import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import QRCode from "qrcode";

import { Eyebrow, MolduraAcesso } from "@/components/painel/moldura-acesso";
import { Alerta } from "@/components/ui/alerta";
import { Button } from "@/components/ui/button";
import { dataHoraNaBahia } from "@/lib/datas";
import { etapaDoConvite } from "@/lib/equipe/aceite";
import { lerParametro } from "@/lib/parametros";
import { NOME_DO_PERFIL } from "@/lib/permissoes";

import { AtivarDuasEtapas } from "./ativar-duas-etapas";
import { CriarSenha } from "./criar-senha";

export const metadata: Metadata = {
  title: "Convite da equipe",
  robots: { index: false, follow: false },
  // O token está no endereço: não vai para outros sites no Referer.
  referrer: "no-referrer",
};

type Props = { params: Promise<{ token: string }> };

/**
 * Aceite do convite (US40; Figma 262:40091, 265:40873, 262:40216, 262:40453 e 262:40589).
 * O passo vem do servidor: link inválido, criar senha ou ativar as duas etapas (E37).
 */
export default async function PaginaConvite({ params }: Props) {
  const { token } = await params;
  const etapa = await etapaDoConvite(token, new Headers(await headers()));

  if (etapa.tipo === "invalido") return <ConviteInvalido validadeHoras={await lerParametro("convite.validade_horas")} />;

  if (etapa.tipo === "criar_senha") {
    const { pessoa, convidadoPor, expiraEm } = etapa.convite;
    const validoAte = dataHoraNaBahia(expiraEm);
    return (
      <MolduraAcesso>
        <Eyebrow>Convite · etapa 1 de 2</Eyebrow>
        <h1 className="texto-titulo-secao-mobile text-texto-primario lg:texto-titulo-secao">Crie sua senha</h1>
        <p className="texto-corpo text-texto-secundario">
          Olá, {primeiroNome(pessoa.nome)}.{" "}
          {convidadoPor
            ? `${convidadoPor} convidou você para o painel do SINTRAVC.`
            : "Você recebeu um convite para o painel do SINTRAVC."}
        </p>
        <div className="flex flex-col gap-1 rounded-[12px] border border-borda-padrao bg-fundo-superficie-alt p-4">
          <p className="texto-etiqueta text-texto-terciario">E-mail de trabalho</p>
          <p className="texto-titulo-card-pequeno break-all text-texto-primario">{pessoa.email}</p>
          <p className="mt-2 texto-etiqueta text-texto-terciario">Perfil</p>
          <p className="texto-titulo-card-pequeno text-texto-primario">{NOME_DO_PERFIL[pessoa.perfil]}</p>
        </div>
        <CriarSenha
          token={token}
          pessoa={{ nome: pessoa.nome, email: pessoa.email }}
          minimo={await lerParametro("equipe.senha_minimo_caracteres")}
        />
        <p className="texto-pequeno text-texto-secundario">
          Convite válido até {validoAte}. Depois disso, peça um novo convite ao administrador geral.
        </p>
      </MolduraAcesso>
    );
  }

  const qr = await QRCode.toString(etapa.uri, { type: "svg", margin: 1, color: { dark: "#0a1733", light: "#ffffff" } });
  return (
    <MolduraAcesso>
      <AtivarDuasEtapas
        token={token}
        chave={etapa.chave}
        qrSvg={`data:image/svg+xml;base64,${Buffer.from(qr).toString("base64")}`}
      />
    </MolduraAcesso>
  );
}

function primeiroNome(nome: string) {
  return nome.trim().split(/\s+/)[0] ?? nome;
}

/** Convite expirado ou já usado (Figma 262:40589; CA-US40.4). */
function ConviteInvalido({ validadeHoras }: { validadeHoras: number }) {
  return (
    <MolduraAcesso>
      <Eyebrow>Convite da equipe</Eyebrow>
      <h1 className="texto-titulo-secao-mobile text-texto-primario lg:texto-titulo-secao">Este convite não vale mais</h1>
      <p className="texto-corpo text-texto-secundario">
        O link expirou (convites valem {validadeHoras} horas) ou já foi usado para criar uma senha.
      </p>
      <Alerta tipo="informacao" titulo="Já criou sua senha?">
        Entre normalmente com seu e-mail de trabalho, senha e o código do aplicativo.
      </Alerta>
      <Button asChild className="w-full">
        <Link href="/painel/entrar">Ir para o login</Link>
      </Button>
      <p className="texto-pequeno text-texto-secundario">
        Precisa de um novo convite? Peça ao administrador geral do painel. Ele pode reenviar pelo menu da pessoa em
        Equipe e perfis.
      </p>
    </MolduraAcesso>
  );
}
