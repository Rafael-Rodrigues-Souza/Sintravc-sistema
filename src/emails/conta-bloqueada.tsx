import {
  BotaoEmail,
  CaixaEmail,
  enderecoDoSite,
  MolduraEmail,
  NotaEmail,
  ParagrafoEmail,
  TituloEmail,
} from "./base";

/**
 * M04 · Conta bloqueada por tentativas (Figma 295:43855 e 295:43874; N6, RN05, RN59, CA-US19.4).
 * Duas versões: para a própria pessoa e para cada administrador geral ativo.
 * O texto fala em "senha ou código": a contagem é uma só (E36). Correções em correcoes-figma.md.
 */
export type DadosContaBloqueada = {
  nome: string;
  email: string;
  /** Nome do perfil de quem foi bloqueado (ex.: "Comunicação"). */
  perfil: string;
  tentativas: number;
  minutos: number;
  /** "03/11/2026 · 07h52", no horário da Bahia (RNF06). */
  quando: string;
  /** "Navegador Chrome · Windows" (navegadorDe). */
  onde: string;
  urlSite: string;
};

export function assuntoContaBloqueadaPessoa(minutos: number) {
  return `Seu acesso ao painel foi bloqueado por ${minutos} minutos`;
}

export function assuntoContaBloqueadaAdm(nome: string) {
  return `A conta de ${nome} foi bloqueada por tentativas`;
}

export function ContaBloqueadaPessoa(dados: DadosContaBloqueada) {
  const { email, tentativas, minutos, quando, onde, urlSite } = dados;
  return (
    <MolduraEmail previa={`Houve ${tentativas} tentativas erradas de entrar na sua conta.`} urlSite={urlSite}>
      <TituloEmail>Acesso bloqueado por {minutos} minutos</TituloEmail>
      <ParagrafoEmail>
        Houve {tentativas} tentativas erradas de entrar na conta {email} (senha ou código). Por segurança, o acesso
        ficou bloqueado por {minutos} minutos.
      </ParagrafoEmail>
      <CaixaEmail
        itens={[
          { etiqueta: "Quando", valor: quando },
          { etiqueta: "Onde", valor: onde },
        ]}
      />
      <NotaEmail ultimo>
        Foi você? Espere {minutos} minutos e tente de novo, ou use “Esqueci minha senha”. Não foi você? Avise o
        administrador geral agora.
      </NotaEmail>
    </MolduraEmail>
  );
}

export function ContaBloqueadaAdm(dados: DadosContaBloqueada) {
  const { nome, email, perfil, tentativas, minutos, quando, onde, urlSite } = dados;
  return (
    <MolduraEmail previa={`${nome} errou ${tentativas} vezes a senha ou o código.`} urlSite={urlSite}>
      <TituloEmail>Uma conta foi bloqueada</TituloEmail>
      <ParagrafoEmail>
        A conta de {nome} ({email} · {perfil}) recebeu {tentativas} tentativas erradas de senha ou código e ficou
        bloqueada por {minutos} minutos.
      </ParagrafoEmail>
      <CaixaEmail
        itens={[
          { etiqueta: "Quando", valor: quando },
          { etiqueta: "Onde", valor: onde },
        ]}
      />
      <BotaoEmail href={enderecoDoSite(urlSite, "/painel/atividade")}>Ver em Atividade</BotaoEmail>
      <NotaEmail ultimo>
        Se achar que não foi a própria pessoa, fale com ela e, se for preciso, redefina as duas etapas em Equipe e
        perfis.
      </NotaEmail>
    </MolduraEmail>
  );
}
