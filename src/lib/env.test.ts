import { describe, expect, it } from "vitest";

import { opcoesSmtp } from "@/lib/email";
import { configuracaoS3 } from "@/lib/armazenamento";
import { lerEnvArmazenamento, lerEnvBanco, lerEnvEmail } from "@/lib/env";

// Valores do .env.example (desenvolvimento: Mailpit e MinIO).
const desenvolvimento = {
  DATABASE_URL: "postgres://sintravc:sintravc@localhost:5432/sintravc",
  SMTP_HOST: "localhost",
  SMTP_PORT: "1025",
  SMTP_SECURE: "false",
  EMAIL_REMETENTE: "SINTRAVC <nao-responda@sintravc.local>",
  S3_ENDPOINT: "http://localhost:9000",
  S3_REGIAO: "us-east-1",
  S3_BUCKET: "sintravc",
  S3_CHAVE_ACESSO: "sintravc",
  S3_CHAVE_SECRETA: "sintravc-segredo",
  S3_FORCAR_CAMINHO: "true",
  S3_URL_PUBLICA: "http://localhost:9000/sintravc",
};

// Exemplo de produção: SMTP real e Cloudflare R2. Nenhuma linha de código muda.
const producao = {
  DATABASE_URL: "postgresql://app:segredo@banco.interno:5432/sintravc",
  SMTP_HOST: "smtp.exemplo.com.br",
  SMTP_PORT: "465",
  SMTP_SECURE: "true",
  SMTP_USUARIO: "nao-responda@sintravc.org.br",
  SMTP_SENHA: "segredo",
  EMAIL_REMETENTE: "SINTRAVC <nao-responda@sintravc.org.br>",
  S3_ENDPOINT: "https://0123456789abcdef.r2.cloudflarestorage.com",
  S3_REGIAO: "auto",
  S3_BUCKET: "sintravc-producao",
  S3_CHAVE_ACESSO: "chave",
  S3_CHAVE_SECRETA: "segredo",
  S3_FORCAR_CAMINHO: "false",
  S3_URL_PUBLICA: "https://arquivos.sintravc.org.br",
};

describe("configuração por variáveis de ambiente (E32)", () => {
  it("monta o SMTP do Mailpit sem autenticação", () => {
    expect(opcoesSmtp(lerEnvEmail(desenvolvimento))).toEqual({
      host: "localhost",
      port: 1025,
      secure: false,
      auth: undefined,
    });
  });

  it("monta o SMTP real com TLS e autenticação", () => {
    expect(opcoesSmtp(lerEnvEmail(producao))).toEqual({
      host: "smtp.exemplo.com.br",
      port: 465,
      secure: true,
      auth: { user: "nao-responda@sintravc.org.br", pass: "segredo" },
    });
  });

  it("monta o S3 do MinIO com caminho forçado", () => {
    expect(configuracaoS3(lerEnvArmazenamento(desenvolvimento))).toMatchObject({
      endpoint: "http://localhost:9000",
      region: "us-east-1",
      forcePathStyle: true,
    });
  });

  it("monta o S3 do R2 com região auto e sem caminho forçado", () => {
    expect(configuracaoS3(lerEnvArmazenamento(producao))).toMatchObject({
      endpoint: "https://0123456789abcdef.r2.cloudflarestorage.com",
      region: "auto",
      forcePathStyle: false,
    });
  });

  it("aceita postgres:// e postgresql://", () => {
    expect(lerEnvBanco(desenvolvimento).DATABASE_URL).toContain("localhost");
    expect(lerEnvBanco(producao).DATABASE_URL).toContain("banco.interno");
  });

  it("explica o que falta quando uma variável não existe", () => {
    const semHost = { ...desenvolvimento, SMTP_HOST: undefined };
    expect(() => lerEnvEmail(semHost)).toThrow(/Configuração de e-mail inválida[\s\S]*SMTP_HOST/);
  });

  it("recusa valores booleanos que não sejam verdadeiro/falso", () => {
    expect(() => lerEnvArmazenamento({ ...desenvolvimento, S3_FORCAR_CAMINHO: "talvez" })).toThrow(
      /S3_FORCAR_CAMINHO/,
    );
  });
});
