import { z } from "zod";

/**
 * Configuração única (E32): o mesmo código fala com o Mailpit/MinIO no desenvolvimento
 * e com o SMTP real/R2 em homologação e produção. Só os valores das variáveis mudam.
 * Cada área é validada quando é usada, para que um script de e-mail não exija o S3, por exemplo.
 */

type Fonte = Record<string, string | undefined>;

const texto = z.string().trim().min(1);
const booleano = z.stringbool();

const esquemaBanco = z.object({
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
});

const esquemaEmail = z.object({
  SMTP_HOST: texto,
  SMTP_PORT: z.coerce.number().int().positive(),
  /** true = TLS direto (porta 465). false = texto puro ou STARTTLS (porta 587/1025). */
  SMTP_SECURE: booleano.default(false),
  SMTP_USUARIO: z.string().optional(),
  SMTP_SENHA: z.string().optional(),
  EMAIL_REMETENTE: texto,
});

const esquemaArmazenamento = z.object({
  S3_ENDPOINT: z.url(),
  S3_REGIAO: texto.default("auto"),
  S3_BUCKET: texto,
  S3_CHAVE_ACESSO: texto,
  S3_CHAVE_SECRETA: texto,
  /** true no MinIO (http://host/bucket/chave); false no R2. */
  S3_FORCAR_CAMINHO: booleano.default(false),
  /** Endereço público onde os arquivos abrem: MinIO local ou domínio público do R2. */
  S3_URL_PUBLICA: z.url(),
});

const esquemaSite = z.object({
  /** Endereço público do site, sem barra no fim. Base dos links enviados por e-mail (convite). */
  URL_SITE: z.url({ protocol: /^https?$/ }),
});

const esquemaAcesso = z.object({
  /**
   * Chave do Better Auth: assina os cookies e criptografa os segredos das duas etapas.
   * Se ela se perder, toda a equipe precisa refazer as duas etapas (E36). Gere com: openssl rand -base64 32
   */
  BETTER_AUTH_SECRET: z.string().min(32, { error: "use pelo menos 32 caracteres" }),
  URL_SITE: esquemaSite.shape.URL_SITE,
});

export type EnvBanco = z.infer<typeof esquemaBanco>;
export type EnvEmail = z.infer<typeof esquemaEmail>;
export type EnvArmazenamento = z.infer<typeof esquemaArmazenamento>;

function validar<T extends z.ZodType>(area: string, esquema: T, fonte: Fonte): z.infer<T> {
  const resultado = esquema.safeParse(fonte);
  if (!resultado.success) {
    const problemas = resultado.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(
      `Configuração de ${area} inválida. Confira o .env.local (modelo em .env.example):\n${problemas}`,
    );
  }
  return resultado.data;
}

export const lerEnvBanco = (fonte: Fonte = process.env) => validar("banco", esquemaBanco, fonte);
export const lerEnvEmail = (fonte: Fonte = process.env) => validar("e-mail", esquemaEmail, fonte);
export const lerEnvSite = (fonte: Fonte = process.env) => validar("site", esquemaSite, fonte);
export const lerEnvAcesso = (fonte: Fonte = process.env) => validar("acesso", esquemaAcesso, fonte);
export const lerEnvArmazenamento = (fonte: Fonte = process.env) =>
  validar("armazenamento", esquemaArmazenamento, fonte);
