import { BotaoEmail, CaixaEmail, MolduraEmail, NotaEmail, ParagrafoEmail, TituloEmail } from "./base";

/**
 * M06 · Publicação agendada falhou (Figma 295:43916; N6, E21, RN59, CA-US21.11). Vai para quem
 * agendou e para os administradores gerais ativos (E44). A notícia volta para os rascunhos (E44):
 * o texto diz isso, no lugar de "continua salva" (correcoes-figma.md).
 */
export type DadosPublicacaoAgendadaFalhou = {
  titulo: string;
  /** "28/10/2026 · 16h00", no horário da Bahia (RNF06). */
  agendadaPara: string;
  /** O que aconteceu, em linguagem simples (ex.: "Falta preencher: Assinatura."). */
  motivo: string;
  /** Editor da notícia no painel. */
  link: string;
  urlSite: string;
};

export function assuntoPublicacaoAgendadaFalhou(titulo: string) {
  return `Não foi possível publicar “${titulo}”`;
}

export function PublicacaoAgendadaFalhou({ titulo, agendadaPara, motivo, link, urlSite }: DadosPublicacaoAgendadaFalhou) {
  return (
    <MolduraEmail previa={`A notícia “${titulo}” não entrou no ar.`} urlSite={urlSite}>
      <TituloEmail>A publicação agendada falhou</TituloEmail>
      <ParagrafoEmail>
        A notícia “{titulo}” estava agendada para entrar no ar, mas não foi publicada. Nada foi perdido: ela voltou para os
        rascunhos e continua salva no painel.
      </ParagrafoEmail>
      <CaixaEmail
        itens={[
          { etiqueta: "Agendada para", valor: agendadaPara },
          { etiqueta: "O que aconteceu", valor: motivo },
        ]}
      />
      <BotaoEmail href={link}>Abrir no painel</BotaoEmail>
      <NotaEmail ultimo>Abra a notícia, corrija o que falta e publique ou agende de novo. Se o erro continuar, avise a equipe técnica.</NotaEmail>
    </MolduraEmail>
  );
}
