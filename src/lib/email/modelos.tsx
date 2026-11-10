import type { ReactElement } from "react";

import { render } from "@react-email/render";

import {
  assuntoContaBloqueadaAdm,
  assuntoContaBloqueadaPessoa,
  ContaBloqueadaAdm,
  ContaBloqueadaPessoa,
  type DadosContaBloqueada,
} from "@/emails/conta-bloqueada";
import { ASSUNTO_CONVITE, ConviteEquipe, type DadosConviteEquipe } from "@/emails/convite-equipe";
import {
  assuntoPublicacaoAgendadaFalhou,
  PublicacaoAgendadaFalhou,
  type DadosPublicacaoAgendadaFalhou,
} from "@/emails/publicacao-agendada-falhou";
import { ASSUNTO_REDEFINIR_SENHA, RedefinirSenha, type DadosRedefinirSenha } from "@/emails/redefinir-senha";
import { ASSUNTO_SENHA_ALTERADA, SenhaAlterada, type DadosSenhaAlterada } from "@/emails/senha-alterada";

import type { Mensagem } from ".";

/** O e-mail em HTML e em texto, para quem lê sem HTML. */
async function mensagem(para: string, assunto: string, elemento: ReactElement): Promise<Mensagem> {
  return {
    para,
    assunto,
    html: await render(elemento),
    texto: await render(elemento, { plainText: true }),
  };
}

/** M01: convite para a equipe. */
export function mensagemConviteEquipe(para: string, dados: DadosConviteEquipe): Promise<Mensagem> {
  return mensagem(para, ASSUNTO_CONVITE, <ConviteEquipe {...dados} />);
}

/** M02: link para criar uma nova senha. */
export function mensagemRedefinirSenha(para: string, dados: DadosRedefinirSenha): Promise<Mensagem> {
  return mensagem(para, ASSUNTO_REDEFINIR_SENHA, <RedefinirSenha {...dados} />);
}

/** M03: senha alterada. */
export function mensagemSenhaAlterada(para: string, dados: DadosSenhaAlterada): Promise<Mensagem> {
  return mensagem(para, ASSUNTO_SENHA_ALTERADA, <SenhaAlterada {...dados} />);
}

/** M04: conta bloqueada, na versão da própria pessoa. */
export function mensagemContaBloqueadaPessoa(dados: DadosContaBloqueada): Promise<Mensagem> {
  return mensagem(dados.email, assuntoContaBloqueadaPessoa(dados.minutos), <ContaBloqueadaPessoa {...dados} />);
}

/** M04: conta bloqueada, na versão de um administrador geral. */
export function mensagemContaBloqueadaAdm(para: string, dados: DadosContaBloqueada): Promise<Mensagem> {
  return mensagem(para, assuntoContaBloqueadaAdm(dados.nome), <ContaBloqueadaAdm {...dados} />);
}

/** M06: publicação agendada falhou (para quem agendou e os ADMs ativos, E44). */
export function mensagemPublicacaoAgendadaFalhou(para: string, dados: DadosPublicacaoAgendadaFalhou): Promise<Mensagem> {
  return mensagem(para, assuntoPublicacaoAgendadaFalhou(dados.titulo), <PublicacaoAgendadaFalhou {...dados} />);
}
