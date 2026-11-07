"use client";

import Link from "next/link";
import { useActionState } from "react";

import { CampoCodigo } from "@/components/painel/campo-codigo";
import { Alerta } from "@/components/ui/alerta";
import { Button } from "@/components/ui/button";

import { acaoConfirmarCodigo, type EstadoDoFormulario } from "../../acoes";

export function FormularioCodigo({ voltar }: { voltar: string }) {
  const [estado, enviar, enviando] = useActionState<EstadoDoFormulario, FormData>(acaoConfirmarCodigo, {});

  return (
    <form action={enviar} className="flex flex-col gap-[18px]">
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

      <CampoCodigo name="codigo" invalido={Boolean(estado.erro)} />
      <Button type="submit" className="w-full" disabled={enviando || Boolean(estado.bloqueadaAte)}>
        {enviando ? "Conferindo…" : "Confirmar e entrar"}
      </Button>
      <p className="texto-pequeno text-texto-secundario">
        Perdeu o celular?{" "}
        <Link
          href="/painel/entrar/recuperacao"
          className="texto-rotulo text-destaque-azul underline underline-offset-2"
        >
          Usar um código de recuperação
        </Link>
      </p>
    </form>
  );
}
