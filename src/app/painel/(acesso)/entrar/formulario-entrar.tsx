"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Alerta } from "@/components/ui/alerta";
import { Button } from "@/components/ui/button";
import { Campo } from "@/components/ui/campo";

import { acaoEntrar, type EstadoDoFormulario } from "../acoes";

export function FormularioEntrar({
  voltar,
  rotuloBotao,
  avisoTentativas,
}: {
  voltar: string;
  rotuloBotao: string;
  avisoTentativas: { tentativas: number; minutos: number } | null;
}) {
  const [estado, enviar, enviando] = useActionState<EstadoDoFormulario, FormData>(acaoEntrar, {});

  return (
    <form action={enviar} className="flex flex-col gap-[18px]" noValidate>
      <input type="hidden" name="voltar" value={voltar} />

      {estado.bloqueadaAte ? (
        <Alerta tipo="erro" titulo="Acesso bloqueado por segurança">
          Houve muitas tentativas erradas. Tente de novo às {estado.bloqueadaAte} (horário da Bahia).
        </Alerta>
      ) : estado.erro ? (
        <Alerta tipo="erro" titulo="Não foi possível entrar">
          {estado.erro}
        </Alerta>
      ) : null}

      <Campo
        id="email"
        name="email"
        type="email"
        rotulo="E-mail de trabalho"
        icone="/painel/icone-email.svg"
        autoComplete="username"
        placeholder="nome@sintravc.org.br"
        defaultValue={estado.email}
        required
      />
      <Campo
        id="senha"
        name="senha"
        type="password"
        rotulo="Senha"
        icone="/painel/icone-cadeado-campo.svg"
        autoComplete="current-password"
        required
      />
      <Button type="submit" className="w-full" disabled={enviando}>
        {enviando ? "Conferindo…" : rotuloBotao}
      </Button>
      <Link
        href="/painel/entrar/esqueci"
        className="self-start texto-rotulo text-destaque-azul underline underline-offset-2"
      >
        Esqueci minha senha
      </Link>

      {avisoTentativas ? (
        <Alerta tipo="informacao" titulo={`Depois de ${avisoTentativas.tentativas} tentativas erradas`} className="hidden lg:flex">
          O acesso fica bloqueado por {avisoTentativas.minutos} minutos e o administrador é avisado.
        </Alerta>
      ) : null}
    </form>
  );
}
