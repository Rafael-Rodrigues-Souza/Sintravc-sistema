import { duracaoPorExtenso } from "@/lib/duracao";

import { BotaoEmail, MolduraEmail, NotaEmail, ParagrafoEmail, TituloEmail } from "./base";

/** M02 · Redefinir senha da equipe (Figma 265:40830; RN48, RF74). */
export type DadosRedefinirSenha = {
  email: string;
  link: string;
  /** Validade do link em horas (equipe.link_senha_horas). */
  horas: number;
  urlSite: string;
};

export const ASSUNTO_REDEFINIR_SENHA = "Redefinir sua senha do painel";

export function RedefinirSenha({ email, link, horas, urlSite }: DadosRedefinirSenha) {
  return (
    <MolduraEmail previa="Use o link para criar uma nova senha do painel do SINTRAVC." urlSite={urlSite}>
      <TituloEmail>Crie uma nova senha</TituloEmail>
      <ParagrafoEmail>Recebemos um pedido para criar uma nova senha para {email}.</ParagrafoEmail>
      <ParagrafoEmail>
        Depois de trocar, você ainda confirma a entrada com o código do aplicativo autenticador.
      </ParagrafoEmail>
      <BotaoEmail href={link}>Criar nova senha</BotaoEmail>
      <NotaEmail>
        O link vale por {duracaoPorExtenso(horas * 3600)} e só pode ser usado uma vez.
      </NotaEmail>
      <NotaEmail>Se o botão não abrir, copie este endereço no navegador: {link}</NotaEmail>
      <NotaEmail ultimo>
        Não foi você? Ignore este e-mail: sua senha continua a mesma. Se receber pedidos repetidos, avise o
        administrador geral.
      </NotaEmail>
    </MolduraEmail>
  );
}
