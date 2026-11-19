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

/**
 * Tamanhos da responsividade (E48), num lugar só. Daqui saem os projetos @responsivo abaixo e a
 * skill conferir-responsivo (.claude/skills/conferir-responsivo/conferir.ts); os docs citam este objeto.
 * - perfis: um projeto do Playwright cada; a skill salva sempre um print de referência de cada um.
 * - varredura: a janela com mouse que a skill percorre (janela reduzida, tela dividida, telas baixas).
 */
export const RESPONSIVO = {
  // Celulares e tablets Android, iPads e computador (E48). Todos no Chromium: o aparelho dá só o
  // tamanho, a densidade de tela e o toque (o iPad do Playwright usaria o WebKit).
  perfis: {
    "celular-pequeno": { largura: 360, altura: 640, toque: true, dispositivo: "Galaxy S8" },
    celular: { largura: 390, altura: 844, toque: true, dispositivo: "Pixel 7" },
    "tablet-em-pe": { largura: 800, altura: 1280, toque: true, dispositivo: "Galaxy Tab S4" },
    "ipad-em-pe": { largura: 820, altura: 1180, toque: true, dispositivo: "iPad Pro 11" },
    "ipad-deitado": { largura: 1180, altura: 820, toque: true, dispositivo: "iPad Pro 11 landscape" },
    "tablet-deitado": { largura: 1280, altura: 800, toque: true, dispositivo: "Galaxy Tab S4 landscape" },
    notebook: { largura: 1280, altura: 720, toque: false, dispositivo: "Desktop Chrome" },
    computador: { largura: 1920, altura: 1080, toque: false, dispositivo: "Desktop Chrome" },
  },
  varredura: { de: 320, ate: 1920, passo: 40, alturas: [600, 700, 800, 1080] },
  /** Área mínima de toque (largura e altura), no celular e no tablet. */
  alvoDeToque: 44,
  /** A partir desta largura (o `lg` do Tailwind) o painel tem o menu lateral; abaixo, a barra de baixo (E49). */
  menuLateralAPartirDe: 1024,
} as const;

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
    // Responsividade (E48): os testes marcados com @responsivo rodam também em cada perfil abaixo.
    ...Object.entries(RESPONSIVO.perfis).map(([name, p]) => ({
      name,
      grep: /@responsivo/,
      use: {
        ...devices[p.dispositivo],
        viewport: { width: p.largura, height: p.altura },
        isMobile: p.toque,
        hasTouch: p.toque,
        defaultBrowserType: "chromium" as const,
      },
    })),
  ],
  webServer: {
    // Apaga o banco da rodada anterior antes de subir: a fila de tarefas (E44) só liga depois que
    // e2e/preparar.ts recria o banco. O servidor sobe antes do banco existir, então a prontidão é
    // conferida num arquivo estático (a logo): as páginas do site leem a ConfigSite no banco (#13).
    command: `pnpm -s tsx e2e/apagar-banco.ts && pnpm build && pnpm start --port ${PORTA}`,
    url: `${URL_BASE}/marca/sintravc-preta.png`,
    timeout: 240_000,
    reuseExistingServer: false,
    // DATABASE_URL_E2E: aqui o DATABASE_URL já é o do e2e; sem ela, o apagar-banco.ts calcularia
    // "sintravc_e2e_e2e" e deixaria o banco da rodada anterior de pé (a fila ligaria nele).
    env: { ...ambienteE2E, DATABASE_URL_E2E: BANCO_E2E, NEXT_TELEMETRY_DISABLED: "1" },
  },
});
