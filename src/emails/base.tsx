import type { ReactNode } from "react";

import { Body, Button, Container, Head, Html, Img, Preview, Section, Text } from "@react-email/components";

/**
 * Peças comuns dos e-mails da equipe (Figma 265:40803, 265:40830, 265:40852 e N6).
 * Cores fixas dos tokens do Figma: os programas de e-mail não entendem variáveis CSS.
 */
export const cor = {
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

/**
 * Cabeçalho marinho com a logo, o miolo branco e o rodapé do sindicato. A logo é a versão branca
 * (#61), por endereço absoluto e em PNG: vários programas de e-mail não mostram WebP.
 */
export function MolduraEmail({ previa, urlSite, children }: { previa: string; urlSite: string; children: ReactNode }) {
  const logo = enderecoDoSite(urlSite, "/marca/sintravc-escura.png");
  return (
    <Html lang="pt-BR">
      <Head />
      <Preview>{previa}</Preview>
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
            {/* 283×192 na origem: 48 px de altura. */}
            <Img src={logo} alt="SINTRAVC, Sindicato dos Rodoviários de Vitória da Conquista" width="71" height="48" />
          </Section>

          <Section style={{ padding: "28px" }}>{children}</Section>

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

export function TituloEmail({ children }: { children: ReactNode }) {
  return (
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
      {children}
    </Text>
  );
}

export function ParagrafoEmail({ children }: { children: ReactNode }) {
  return <Text style={corpo}>{children}</Text>;
}

/** Texto pequeno e cinza (validade do link, "não foi você?"). `ultimo` tira a margem de baixo. */
export function NotaEmail({ children, ultimo = false }: { children: ReactNode; ultimo?: boolean }) {
  return <Text style={{ ...pequeno, color: cor.secundario, ...(ultimo ? { margin: 0 } : {}) }}>{children}</Text>;
}

/** Caixa cinza com pares etiqueta/valor (Perfil; Quando e Onde). */
export function CaixaEmail({ itens }: { itens: { etiqueta: string; valor: string }[] }) {
  return (
    <Section style={{ backgroundColor: cor.superficieAlt, borderRadius: "10px", padding: "14px 16px", margin: "0 0 16px" }}>
      {itens.map((item) => (
        <div key={item.etiqueta}>
          <Text style={etiqueta}>{item.etiqueta}</Text>
          <Text style={valorDestaque}>{item.valor}</Text>
        </div>
      ))}
    </Section>
  );
}

export function BotaoEmail({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Button
      href={href}
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
      {children}
    </Button>
  );
}

/** "Olá, Ana" a partir do nome completo. */
export function primeiroNome(nome: string) {
  return nome.trim().split(/\s+/)[0] ?? nome;
}

/** Endereço completo de uma página do site. */
export function enderecoDoSite(urlSite: string, caminho: string) {
  return `${urlSite.replace(/\/+$/, "")}${caminho}`;
}
