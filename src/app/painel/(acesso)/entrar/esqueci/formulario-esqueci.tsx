"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";

import { Eyebrow } from "@/components/painel/moldura-acesso";
import { Alerta } from "@/components/ui/alerta";
import { Button } from "@/components/ui/button";
import { Campo } from "@/components/ui/campo";

import { acaoPedirNovaSenha, type EstadoEsqueci } from "../../acoes";

const titulo = "texto-titulo-secao-mobile text-texto-primario lg:texto-titulo-secao";
const linkVoltar = "self-start texto-rotulo text-destaque-azul underline underline-offset-2";

export function FormularioEsqueci({ horas, intervaloSegundos }: { horas: number; intervaloSegundos: number }) {
  const [estado, enviar, enviando] = useActionState<EstadoEsqueci, FormData>(acaoPedirNovaSenha, {});
  const faltam = useContagem(estado.enviadoEm, intervaloSegundos);
  const validade = horas === 1 ? "1 hora" : `${horas} horas`;

  if (estado.enviadoPara) {
    const minuto = intervaloSegundos === 60 ? "1 minuto" : `${intervaloSegundos} segundos`;
    return (
      <>
        <Eyebrow>Acesso da equipe</Eyebrow>
        <h1 className={titulo}>Confira seu e-mail</h1>
        <p className="texto-corpo break-words text-texto-secundario">
          Se {estado.enviadoPara} tiver acesso ao painel, o link chega em alguns minutos. Ele vale por {validade} e só
          pode ser usado uma vez.
        </p>
        <Alerta tipo="informacao" titulo="Não chegou?">
          Olhe a caixa de spam ou lixo eletrônico. Você pode pedir outro link em {minuto}.
        </Alerta>
        <form action={enviar} className="flex flex-col gap-[18px]">
          <input type="hidden" name="email" value={estado.enviadoPara} />
          <Button type="submit" variant="secundario" className="w-full" disabled={enviando || faltam > 0}>
            {enviando ? "Enviando…" : faltam > 0 ? `Reenviar link (${relogio(faltam)})` : "Reenviar link"}
          </Button>
        </form>
        <Link href="/painel/entrar" className={linkVoltar}>
          Voltar para o login
        </Link>
      </>
    );
  }

  return (
    <>
      <Eyebrow>Acesso da equipe</Eyebrow>
      <h1 className={titulo}>Esqueceu a senha?</h1>
      <p className="texto-corpo text-texto-secundario">
        Informe seu e-mail de trabalho. Se ele tiver acesso ao painel, enviaremos um link para criar uma nova senha.
      </p>
      <form action={enviar} className="flex flex-col gap-[18px]" noValidate>
        {estado.erro ? (
          <Alerta tipo="erro" titulo="Confira o e-mail">
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
        <Button type="submit" className="w-full" disabled={enviando}>
          {enviando ? "Enviando…" : "Enviar link"}
        </Button>
      </form>
      <Link href="/painel/entrar" className={linkVoltar}>
        Voltar para o login
      </Link>
      <p className="texto-pequeno text-texto-secundario">
        A verificação em duas etapas continua valendo: depois de trocar a senha, você confirma com o código do
        aplicativo.
      </p>
    </>
  );
}

/** Segundos que faltam para poder pedir outro link. */
function useContagem(desde: number | undefined, segundos: number) {
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => {
    if (!desde) return;
    const relogio = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(relogio);
  }, [desde]);
  if (!desde) return 0;
  // Até o primeiro tique, "agora" pode ser de antes do envio: nunca mostra mais que o intervalo.
  return Math.min(segundos, Math.max(0, Math.ceil((desde + segundos * 1000 - agora) / 1000)));
}

/** 45 → "00:45". */
function relogio(segundos: number) {
  const m = Math.floor(segundos / 60);
  const s = segundos % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
