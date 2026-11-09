"use client";

import { useActionState } from "react";

import { CamposNovaSenha } from "@/components/painel/campos-nova-senha";
import { Alerta } from "@/components/ui/alerta";
import { Button } from "@/components/ui/button";

import { acaoTrocarSenha, type EstadoNovaSenha } from "./acoes";

export function FormularioNovaSenha({
  token,
  pessoa,
  minimo,
  ultimasSenhas,
}: {
  token: string;
  pessoa: { nome: string; email: string };
  minimo: number;
  ultimasSenhas: number;
}) {
  const [estado, enviar, enviando] = useActionState<EstadoNovaSenha, FormData>(acaoTrocarSenha, {});

  return (
    <form action={enviar} className="flex flex-col gap-[18px]" noValidate>
      <input type="hidden" name="token" value={token} />
      {estado.erro ? (
        <Alerta tipo="erro" titulo="Não foi possível salvar a senha">
          {estado.erro}
        </Alerta>
      ) : null}

      <CamposNovaSenha
        pessoa={pessoa}
        minimo={minimo}
        ultimasSenhas={ultimasSenhas}
        rotuloConfirmacao="Confirmar nova senha *"
      />

      <Button type="submit" className="w-full" disabled={enviando}>
        {enviando ? "Salvando…" : "Salvar nova senha"}
      </Button>
    </form>
  );
}
