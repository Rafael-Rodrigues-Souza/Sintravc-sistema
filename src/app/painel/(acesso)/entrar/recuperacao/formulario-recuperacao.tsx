"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Alerta } from "@/components/ui/alerta";
import { Button } from "@/components/ui/button";
import { Campo } from "@/components/ui/campo";

import { acaoConfirmarRecuperacao, type EstadoDoFormulario } from "../../acoes";

export function FormularioRecuperacao({ voltar }: { voltar: string }) {
  const [estado, enviar, enviando] = useActionState<EstadoDoFormulario, FormData>(acaoConfirmarRecuperacao, {});
  const linkCodigo = voltar === "/painel" ? "/painel/entrar/codigo" : `/painel/entrar/codigo?voltar=${encodeURIComponent(voltar)}`;

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
        id="codigo"
        name="codigo"
        rotulo="Código de recuperação"
        placeholder="XXXXX-XXXXX"
        autoComplete="one-time-code"
        autoCapitalize="characters"
        autoCorrect="off"
        spellCheck={false}
        maxLength={16}
        className="[&_input]:uppercase"
        aria-invalid={estado.erro ? true : undefined}
        required
      />
      <Button type="submit" className="w-full" disabled={enviando || Boolean(estado.bloqueadaAte)}>
        {enviando ? "Conferindo…" : "Confirmar e entrar"}
      </Button>
      <Link href={linkCodigo} className="self-start texto-rotulo text-destaque-azul underline underline-offset-2">
        Voltar para o código do aplicativo
      </Link>
      <p className="texto-pequeno text-texto-secundario">
        Sem o celular e sem os códigos? Fale com o administrador geral para redefinir a verificação.
      </p>
    </form>
  );
}
