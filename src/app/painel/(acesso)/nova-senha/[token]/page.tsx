import type { Metadata } from "next";
import Link from "next/link";

import { Eyebrow, MolduraAcesso } from "@/components/painel/moldura-acesso";
import { Alerta } from "@/components/ui/alerta";
import { Button } from "@/components/ui/button";
import { abrirLinkDeSenha } from "@/lib/acesso/nova-senha";
import { duracaoPorExtenso } from "@/lib/duracao";
import { lerParametro } from "@/lib/parametros";

import { FormularioNovaSenha } from "./formulario-nova-senha";

export const metadata: Metadata = {
  title: "Criar nova senha",
  robots: { index: false, follow: false },
  // O token está no endereço: não vai para outros sites no Referer.
  referrer: "no-referrer",
};

type Props = { params: Promise<{ token: string }> };

/** Redefinir senha · Nova senha (Figma 262:40849; RN47, RN48, US41). */
export default async function PaginaNovaSenha({ params }: Props) {
  const { token } = await params;
  const link = await abrirLinkDeSenha(token);
  if (link.tipo === "invalido") return <LinkInvalido horas={await lerParametro("equipe.link_senha_horas")} />;

  return (
    <MolduraAcesso>
      <Eyebrow>Acesso da equipe</Eyebrow>
      <h1 className="texto-titulo-secao-mobile text-texto-primario lg:texto-titulo-secao">Crie uma nova senha</h1>
      <p className="texto-corpo break-words text-texto-secundario">
        Para {link.pessoa.email}. Em seguida, confirme com o código do aplicativo autenticador.
      </p>
      <FormularioNovaSenha
        token={token}
        pessoa={{ nome: link.pessoa.nome, email: link.pessoa.email }}
        minimo={await lerParametro("equipe.senha_minimo_caracteres")}
        ultimasSenhas={await lerParametro("equipe.senhas_anteriores_bloqueadas")}
      />
      <p className="texto-pequeno text-texto-secundario">
        Por segurança, as outras sessões abertas serão encerradas e a troca fica registrada em Atividade.
      </p>
    </MolduraAcesso>
  );
}

/** Link vencido ou já usado (CA-US41.3). Sem desenho: segue o padrão de "Este convite não vale mais" (E23). */
function LinkInvalido({ horas }: { horas: number }) {
  return (
    <MolduraAcesso>
      <Eyebrow>Acesso da equipe</Eyebrow>
      <h1 className="texto-titulo-secao-mobile text-texto-primario lg:texto-titulo-secao">Este link não vale mais</h1>
      <p className="texto-corpo text-texto-secundario">
        O link expirou (vale {duracaoPorExtenso(horas * 3600)}), já foi usado ou um link mais novo foi
        pedido.
      </p>
      <Button asChild className="w-full">
        <Link href="/painel/entrar/esqueci">Pedir outro link</Link>
      </Button>
      <Alerta tipo="informacao" titulo="Já trocou a senha?">
        Entre normalmente com seu e-mail de trabalho, a senha nova e o código do aplicativo.{" "}
        <Link href="/painel/entrar" className="texto-rotulo text-destaque-azul underline underline-offset-2">
          Ir para o login
        </Link>
      </Alerta>
    </MolduraAcesso>
  );
}
