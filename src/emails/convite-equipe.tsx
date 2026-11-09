import { BotaoEmail, CaixaEmail, MolduraEmail, NotaEmail, ParagrafoEmail, primeiroNome, TituloEmail } from "./base";

/**
 * M01 · E-mail de convite para a equipe (Figma 265:40803; RN46, RF77).
 * Cores fixas dos tokens do Figma: os programas de e-mail não entendem variáveis CSS.
 */
export type DadosConviteEquipe = {
  nome: string;
  /** Quem convidou. Vazio quando o convite nasce pelo pnpm criar-admin (E33). */
  convidadoPor?: string;
  /** Nome do perfil, como aparece na tela (ex.: "Comunicação"). */
  perfil: string;
  /** Só na Fase 2 (perfil Atendimento). */
  servicos?: string;
  link: string;
  /** Ex.: "05/11/2026 às 14h30", no horário da Bahia (RNF06). */
  valeAte: string;
  urlSite: string;
};

export const ASSUNTO_CONVITE = "Você foi convidado para o painel do SINTRAVC";

export function ConviteEquipe(dados: DadosConviteEquipe) {
  const { nome, convidadoPor, perfil, servicos, link, valeAte, urlSite } = dados;

  return (
    <MolduraEmail previa="Crie sua senha e ative a verificação em duas etapas para entrar no painel." urlSite={urlSite}>
      <TituloEmail>Olá, {primeiroNome(nome)}</TituloEmail>
      <ParagrafoEmail>
        {convidadoPor
          ? `${convidadoPor} convidou você para acessar o painel de gestão do SINTRAVC.`
          : "Você recebeu um convite para acessar o painel de gestão do SINTRAVC."}
      </ParagrafoEmail>
      <ParagrafoEmail>
        Para começar, crie sua senha e ative a verificação em duas etapas. Você vai precisar do celular com um
        aplicativo autenticador.
      </ParagrafoEmail>

      <CaixaEmail
        itens={[
          { etiqueta: "Perfil", valor: perfil },
          ...(servicos ? [{ etiqueta: "Serviços", valor: servicos }] : []),
        ]}
      />

      <BotaoEmail href={link}>Criar minha senha</BotaoEmail>

      <NotaEmail>O link vale até {valeAte} e só pode ser usado uma vez.</NotaEmail>
      <NotaEmail>Se o botão não abrir, copie este endereço no navegador: {link}</NotaEmail>
      <NotaEmail ultimo>Não esperava este convite? Ignore este e-mail: nenhum acesso será criado.</NotaEmail>
    </MolduraEmail>
  );
}

export default ConviteEquipe;
