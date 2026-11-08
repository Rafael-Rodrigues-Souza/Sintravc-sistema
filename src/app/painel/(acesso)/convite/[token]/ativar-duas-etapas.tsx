"use client";

import { useActionState, useState } from "react";
import { toast } from "sonner";

import { Eyebrow } from "@/components/painel/moldura-acesso";
import { CampoCodigo } from "@/components/painel/campo-codigo";
import { Alerta } from "@/components/ui/alerta";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

import {
  acaoConcluirConvite,
  acaoConfirmarDuasEtapas,
  type EstadoConcluir,
  type EstadoDuasEtapas,
} from "./acoes";

/**
 * Passo 2 do convite (Figma 262:40216): QR code, chave para digitar e o primeiro código.
 * Ao acertar, mostra os códigos de recuperação (Figma 262:40453). Eles vêm só na resposta da
 * ação e ficam só nesta tela: recarregar a página não os mostra de novo (CA-US40.3).
 */
export function AtivarDuasEtapas({ token, chave, qrSvg }: { token: string; chave: string; qrSvg: string }) {
  const [estado, enviar, enviando] = useActionState<EstadoDuasEtapas, FormData>(acaoConfirmarDuasEtapas, {});

  if (estado.codigos) return <GuardarCodigos token={token} codigos={estado.codigos} />;

  const chaveEmGrupos = chave.match(/.{1,4}/g)?.join(" ") ?? chave;

  return (
    <>
      <Eyebrow>Convite · etapa 2 de 2</Eyebrow>
      <h1 className="texto-titulo-secao-mobile text-texto-primario lg:texto-titulo-secao">Ative as duas etapas</h1>
      <p className="texto-corpo text-texto-secundario">
        No celular, abra um aplicativo autenticador (Google Authenticator, Microsoft Authenticator ou similar), toque em
        adicionar e leia o QR code.
      </p>

      <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
        <div className="size-[150px] shrink-0 overflow-hidden rounded-[12px] border border-borda-forte bg-white p-1.5">
          {/* eslint-disable-next-line @next/next/no-img-element -- SVG gerado no servidor, em data URI */}
          <img src={qrSvg} alt="QR code para o aplicativo autenticador" width={138} height={138} />
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <p className="texto-rotulo text-texto-primario">Não consegue ler o QR code?</p>
          <p className="texto-pequeno text-texto-secundario">Digite esta chave no aplicativo:</p>
          <p className="texto-titulo-card break-all text-texto-primario" data-testid="chave-totp">
            {chaveEmGrupos}
          </p>
          <button
            type="button"
            className="self-start texto-rotulo text-destaque-azul underline-offset-2 hover:underline"
            onClick={async () => {
              await navigator.clipboard.writeText(chave);
              toast.success("Chave copiada.");
            }}
          >
            Copiar chave
          </button>
        </div>
      </div>

      <form action={enviar} className="flex flex-col gap-[18px]">
        <input type="hidden" name="token" value={token} />
        {estado.erro ? (
          <Alerta tipo="erro" titulo="Não foi possível ativar">
            {estado.erro}
          </Alerta>
        ) : null}
        <p className="texto-rotulo text-texto-primario">Digite o código de 6 números que aparece no aplicativo</p>
        <CampoCodigo name="codigo" invalido={Boolean(estado.erro)} />
        <Button type="submit" className="w-full" disabled={enviando}>
          {enviando ? "Conferindo…" : "Ativar e continuar"}
        </Button>
      </form>
      <p className="texto-pequeno text-texto-secundario">
        A verificação é obrigatória para toda a equipe. Sem ela, não é possível entrar no painel.
      </p>
    </>
  );
}

function GuardarCodigos({ token, codigos }: { token: string; codigos: string[] }) {
  const [estado, enviar, enviando] = useActionState<EstadoConcluir, FormData>(acaoConcluirConvite, {});
  const [guardei, setGuardei] = useState(false);
  const texto = codigos.join("\n");

  function baixar() {
    const conteudo = [
      "SINTRAVC · Painel de gestão",
      "Códigos de recuperação da verificação em duas etapas.",
      "Cada código funciona uma vez. Guarde em um lugar seguro.",
      "",
      texto,
      "",
    ].join("\n");
    const url = URL.createObjectURL(new Blob([conteudo], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "sintravc-codigos-de-recuperacao.txt";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <Eyebrow>Último passo</Eyebrow>
      <h1 className="texto-titulo-secao-mobile text-texto-primario lg:texto-titulo-secao">Guarde seus códigos</h1>
      <p className="texto-corpo text-texto-secundario">
        Se perder o celular, use um destes códigos no lugar do código do aplicativo. Cada código funciona uma vez.
      </p>

      <ul
        aria-label="Códigos de recuperação"
        className="grid grid-cols-1 gap-x-3 gap-y-2.5 rounded-[12px] border border-borda-padrao bg-fundo-superficie-alt p-[18px] min-[380px]:grid-cols-2"
      >
        {codigos.map((codigo) => (
          <li key={codigo} className="texto-titulo-card tracking-[1px] text-texto-primario tabular-nums">
            {codigo}
          </li>
        ))}
      </ul>

      <div className="flex gap-3">
        <Button type="button" variant="secundario" className="flex-1" onClick={baixar}>
          Baixar (.txt)
        </Button>
        <Button
          type="button"
          variant="secundario"
          className="flex-1"
          onClick={async () => {
            await navigator.clipboard.writeText(texto);
            toast.success("Códigos copiados.");
          }}
        >
          Copiar
        </Button>
      </div>

      <Alerta tipo="aviso" titulo="Eles não aparecem de novo">
        Sem o celular e sem os códigos, só o administrador geral pode redefinir sua verificação.
      </Alerta>

      <form action={enviar} className="flex flex-col gap-[18px]">
        <input type="hidden" name="token" value={token} />
        {estado.erro ? (
          <Alerta tipo="erro" titulo="Ainda não dá para entrar">
            {estado.erro}
          </Alerta>
        ) : null}
        <div className="flex items-center gap-2.5">
          <Checkbox
            id="guardei"
            name="guardei"
            checked={guardei}
            onCheckedChange={(valor) => setGuardei(valor === true)}
          />
          <Label htmlFor="guardei" className="texto-pequeno text-texto-secundario">
            Guardei os códigos em um lugar seguro
          </Label>
        </div>
        <Button type="submit" className="w-full" disabled={!guardei || enviando}>
          {enviando ? "Entrando…" : "Entrar no painel"}
        </Button>
      </form>
    </>
  );
}
