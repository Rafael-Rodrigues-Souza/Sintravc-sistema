import { CaixaEmail, MolduraEmail, NotaEmail, ParagrafoEmail, TituloEmail } from "./base";

/** M03 · Senha alterada (Figma 265:40852; RN48, CA-US41.4). */
export type DadosSenhaAlterada = {
  email: string;
  /** "03/11/2026 · 10h12", no horário da Bahia (RNF06). */
  quando: string;
  /** "Navegador Chrome · Windows" (navegadorDe). */
  onde: string;
  urlSite: string;
};

export const ASSUNTO_SENHA_ALTERADA = "Sua senha do painel foi alterada";

export function SenhaAlterada({ email, quando, onde, urlSite }: DadosSenhaAlterada) {
  return (
    <MolduraEmail previa="A senha do painel do SINTRAVC foi alterada." urlSite={urlSite}>
      <TituloEmail>Sua senha foi alterada</TituloEmail>
      <ParagrafoEmail>
        A senha de {email} foi alterada em {quando.replace(" · ", " às ")}. As outras sessões abertas foram
        encerradas.
      </ParagrafoEmail>
      <CaixaEmail
        itens={[
          { etiqueta: "Quando", valor: quando },
          { etiqueta: "Onde", valor: onde },
        ]}
      />
      <NotaEmail ultimo>Não foi você? Fale agora com o administrador geral do painel para bloquear o acesso.</NotaEmail>
    </MolduraEmail>
  );
}
