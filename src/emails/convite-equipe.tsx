import {
  Body,
  Button,
  Container,
  Head,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from "@react-email/components";

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

const cor = {
  pagina: "#f6f7f9",
  superficie: "#ffffff",
  superficieAlt: "#edf1f6",
  borda: "#e1e6ee",
  marinho: "#021f4b",
  amarelo: "#ffcc00",
  primario: "#0b1424",
  secundario: "#4a5361",
  terciario: "#69727f",
};
const fonte = "Barlow, 'Segoe UI', Arial, sans-serif";
const corpo = { fontFamily: fonte, fontSize: "16px", lineHeight: "1.56", color: cor.primario, margin: "0 0 16px" };
const pequeno = { fontFamily: fonte, fontSize: "14px", lineHeight: "1.42", fontWeight: 500, margin: "0 0 16px" };
const etiqueta = {
  fontFamily: fonte,
  fontSize: "11px",
  fontWeight: 700,
  letterSpacing: "0.88px",
  textTransform: "uppercase" as const,
  color: cor.terciario,
  margin: "0 0 4px",
};
const valorDestaque = { fontFamily: fonte, fontSize: "16px", fontWeight: 600, color: cor.primario, margin: "0 0 4px" };

export function ConviteEquipe(dados: DadosConviteEquipe) {
  const { nome, convidadoPor, perfil, servicos, link, valeAte, urlSite } = dados;
  const primeiroNome = nome.trim().split(/\s+/)[0] ?? nome;
  const logo = `${urlSite.replace(/\/+$/, "")}/painel/logo-sempre-branca.png`;

  return (
    <Html lang="pt-BR">
      <Head />
      <Preview>Crie sua senha e ative a verificação em duas etapas para entrar no painel.</Preview>
      <Body style={{ backgroundColor: cor.pagina, margin: 0, padding: "32px 16px" }}>
        <Container
          style={{
            maxWidth: "576px",
            backgroundColor: cor.superficie,
            border: `1px solid ${cor.borda}`,
            borderRadius: "16px",
            overflow: "hidden",
          }}
        >
          <Section style={{ backgroundColor: cor.marinho, padding: "22px 28px" }}>
            <Img src={logo} alt="SINTRAVC" width="121" height="45" />
          </Section>

          <Section style={{ padding: "28px" }}>
            <Text
              style={{
                fontFamily: "'Barlow Condensed', 'Arial Narrow', Arial, sans-serif",
                fontSize: "32px",
                fontWeight: 700,
                lineHeight: "1.12",
                color: cor.primario,
                margin: "0 0 16px",
              }}
            >
              Olá, {primeiroNome}
            </Text>
            <Text style={corpo}>
              {convidadoPor
                ? `${convidadoPor} convidou você para acessar o painel de gestão do SINTRAVC.`
                : "Você recebeu um convite para acessar o painel de gestão do SINTRAVC."}
            </Text>
            <Text style={corpo}>
              Para começar, crie sua senha e ative a verificação em duas etapas. Você vai precisar do celular com um
              aplicativo autenticador.
            </Text>

            <Section
              style={{ backgroundColor: cor.superficieAlt, borderRadius: "10px", padding: "14px 16px", margin: "0 0 16px" }}
            >
              <Text style={etiqueta}>Perfil</Text>
              <Text style={valorDestaque}>{perfil}</Text>
              {servicos ? (
                <>
                  <Text style={etiqueta}>Serviços</Text>
                  <Text style={valorDestaque}>{servicos}</Text>
                </>
              ) : null}
            </Section>

            <Button
              href={link}
              style={{
                backgroundColor: cor.amarelo,
                color: cor.marinho,
                fontFamily: fonte,
                fontSize: "15px",
                fontWeight: 700,
                letterSpacing: "0.3px",
                borderRadius: "999px",
                padding: "15px 24px 15px 20px",
                margin: "0 0 16px",
              }}
            >
              Criar minha senha
            </Button>

            <Text style={{ ...pequeno, color: cor.secundario }}>
              O link vale até {valeAte} e só pode ser usado uma vez.
            </Text>
            <Text style={{ ...pequeno, color: cor.secundario }}>
              Se o botão não abrir, copie este endereço no navegador: {link}
            </Text>
            <Text style={{ ...pequeno, color: cor.secundario, margin: 0 }}>
              Não esperava este convite? Ignore este e-mail: nenhum acesso será criado.
            </Text>
          </Section>

          <Section style={{ backgroundColor: cor.superficieAlt, padding: "18px 28px 22px" }}>
            <Text style={{ ...pequeno, color: cor.secundario, margin: "0 0 4px" }}>
              SINTRAVC — Sindicato dos Rodoviários de Vitória da Conquista
            </Text>
            <Text style={{ ...pequeno, color: cor.terciario, margin: 0 }}>
              Mensagem automática do painel de gestão. Não responda este e-mail.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export default ConviteEquipe;
