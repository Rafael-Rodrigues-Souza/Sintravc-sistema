import { PutObjectCommand, S3Client, type S3ClientConfig } from "@aws-sdk/client-s3";

import { lerEnvArmazenamento, type EnvArmazenamento } from "@/lib/env";

/** Configuração do cliente S3 a partir das variáveis de ambiente. Função pura, testada. */
export function configuracaoS3(env: EnvArmazenamento): S3ClientConfig {
  return {
    endpoint: env.S3_ENDPOINT,
    region: env.S3_REGIAO,
    forcePathStyle: env.S3_FORCAR_CAMINHO,
    credentials: {
      accessKeyId: env.S3_CHAVE_ACESSO,
      secretAccessKey: env.S3_CHAVE_SECRETA,
    },
  };
}

/** URL pública de um arquivo: base pública + chave, com cada parte da chave codificada. */
export function urlPublica(chave: string, env: Pick<EnvArmazenamento, "S3_URL_PUBLICA">) {
  const base = env.S3_URL_PUBLICA.replace(/\/+$/, "");
  const caminho = chave
    .replace(/^\/+/, "")
    .split("/")
    .map((parte) => encodeURIComponent(parte))
    .join("/");
  return `${base}/${caminho}`;
}

let cliente: S3Client | undefined;

function obterCliente(env: EnvArmazenamento) {
  cliente ??= new S3Client(configuracaoS3(env));
  return cliente;
}

export type Arquivo = {
  chave: string;
  conteudo: Uint8Array | string;
  tipo: string;
};

/** Envia um arquivo para o bucket configurado e devolve a URL pública. */
export async function enviarArquivo({ chave, conteudo, tipo }: Arquivo) {
  const env = lerEnvArmazenamento();
  await obterCliente(env).send(
    new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: chave,
      Body: conteudo,
      ContentType: tipo,
    }),
  );
  return { chave, url: urlPublica(chave, env) };
}
