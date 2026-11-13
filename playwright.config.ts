import { defineConfig, devices } from "@playwright/test";

/**
 * Testes de ponta a ponta do painel. Rodam contra o app compilado (next build + next start),
 * na porta 3100, com um banco próprio (sintravc_e2e) recriado a cada rodada e pessoas de teste
 * criadas pelas funções do Better Auth (e2e/preparar.ts). Precisam do Postgres, do Mailpit e do MinIO do compose.
 */
const PORTA = 3100;
const URL_BASE = `http://localhost:${PORTA}`;
const BANCO_E2E =
  process.env.DATABASE_URL_E2E ??
  (() => {
    const url = new URL(process.env.DATABASE_URL ?? "postgres://sintravc:sintravc@localhost:5432/sintravc");
    url.pathname = `${url.pathname.replace(/^\//, "")}_e2e`;
    return url.toString();
  })();

export const ambienteE2E = {
  DATABASE_URL: BANCO_E2E,
  URL_SITE: URL_BASE,
  BETTER_AUTH_SECRET: "chave-dos-testes-de-ponta-a-ponta-com-mais-de-32-caracteres",
  NEXT_DIST_DIR: ".next-e2e",
  // O convite sai pelo Mailpit do compose (E32); o teste lê o link pela API dele.
  SMTP_HOST: "localhost",
  SMTP_PORT: "1025",
  SMTP_SECURE: "false",
  EMAIL_REMETENTE: "SINTRAVC <nao-responda@sintravc.local>",
  // A Mídia grava no MinIO do compose (E32), num bucket só dos testes (criado em e2e/preparar.ts).
  S3_ENDPOINT: process.env.S3_ENDPOINT_E2E ?? "http://localhost:9000",
  S3_REGIAO: "us-east-1",
  S3_BUCKET: "sintravc-e2e",
  S3_CHAVE_ACESSO: process.env.S3_CHAVE_ACESSO_E2E ?? "sintravc",
  S3_CHAVE_SECRETA: process.env.S3_CHAVE_SECRETA_E2E ?? "sintravc-segredo",
  S3_FORCAR_CAMINHO: "true",
  S3_URL_PUBLICA: `${process.env.S3_ENDPOINT_E2E ?? "http://localhost:9000"}/sintravc-e2e`,
};

/** API do Mailpit, para ler os e-mails nos testes. */
export const URL_MAILPIT = process.env.URL_MAILPIT ?? "http://localhost:8025";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  globalSetup: "./e2e/preparar.ts",
  use: {
    baseURL: URL_BASE,
    locale: "pt-BR",
    timezoneId: "America/Bahia",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    // Celular de 375 px: roda só os testes marcados com @celular (que também rodam no desktop).
    // Um passo que só vale no celular pula fora dele com test.skip(!isMobile).
    {
      name: "celular",
      grep: /@celular/,
      use: { ...devices["Pixel 5"], viewport: { width: 375, height: 812 } },
    },
  ],
  webServer: {
    // Apaga o banco da rodada anterior antes de subir: a fila de tarefas (E44) só liga depois que
    // e2e/preparar.ts recria o banco. A página inicial não usa o banco: o servidor pode subir antes.
    command: `pnpm -s tsx e2e/apagar-banco.ts && pnpm build && pnpm start --port ${PORTA}`,
    url: `${URL_BASE}/`,
    timeout: 240_000,
    reuseExistingServer: false,
    // DATABASE_URL_E2E: aqui o DATABASE_URL já é o do e2e; sem ela, o apagar-banco.ts calcularia
    // "sintravc_e2e_e2e" e deixaria o banco da rodada anterior de pé (a fila ligaria nele).
    env: { ...ambienteE2E, DATABASE_URL_E2E: BANCO_E2E, NEXT_TELEMETRY_DISABLED: "1" },
  },
});
