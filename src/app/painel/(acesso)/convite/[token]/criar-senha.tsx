"use client";

import { useActionState } from "react";

import { CamposNovaSenha } from "@/components/painel/campos-nova-senha";
import { Alerta } from "@/components/ui/alerta";
import { Button } from "@/components/ui/button";

import { acaoCriarSenha, type EstadoCriarSenha } from "./acoes";

/** Passo 1 do convite (Figma 262:40091 e 265:40873): senha com os requisitos da RN47. */
export function CriarSenha({
  token,
  pessoa,
  minimo,
}: {
  token: string;
  pessoa: { nome: string; email: string };
  minimo: number;
}) {
  const [estado, enviar, enviando] = useActionState<EstadoCriarSenha, FormData>(acaoCriarSenha, {});

  return (
    <form action={enviar} className="flex flex-col gap-[18px]" noValidate>
      <input type="hidden" name="token" value={token} />

      {estado.erro ? (
        <Alerta tipo="erro" titulo="Não foi possível criar a senha">
          {estado.erro}
        </Alerta>
      ) : null}

      <CamposNovaSenha pessoa={pessoa} minimo={minimo} />

      <Button type="submit" className="w-full" disabled={enviando}>
        {enviando ? "Criando…" : "Criar senha e continuar"}
      </Button>
    </form>
  );
}
