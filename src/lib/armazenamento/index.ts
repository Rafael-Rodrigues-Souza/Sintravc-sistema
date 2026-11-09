import { DeleteObjectCommand, PutObjectCommand, S3Client, type S3ClientConfig } from "@aws-sdk/client-s3";

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
  /** Content-Type gravado no objeto. Na Mídia, sempre o formato detectado pelos bytes (E39). */
  tipo: string;
  /** Com `attachment`, o navegador baixa o arquivo com este nome em vez de abri-lo no site (E39). */
  disposicao?: { tipo: "attachment"; nome: string };
};

/** O que a Mídia precisa do armazenamento. A versão real é `armazenamentoS3`; os testes usam uma em memória. */
export type Armazenamento = {
  enviar(arquivo: Arquivo): Promise<{ chave: string; url: string }>;
  apagar(chave: string): Promise<void>;
};

/**
 * Content-Disposition com o nome em UTF-8 (RFC 6266/5987) e uma versão só ASCII para navegadores antigos.
 */
export function contentDisposition({ tipo, nome }: NonNullable<Arquivo["disposicao"]>): string {
  const ascii = nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7e]/g, "_")
    .replace(/["\\]/g, "_");
  const utf8 = encodeURIComponent(nome).replace(/['()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
  return `${tipo}; filename="${ascii}"; filename*=UTF-8''${utf8}`;
}

/** Envia um arquivo para o bucket configurado e devolve a URL pública. */
export async function enviarArquivo({ chave, conteudo, tipo, disposicao }: Arquivo) {
  const env = lerEnvArmazenamento();
  await obterCliente(env).send(
    new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: chave,
      Body: conteudo,
      ContentType: tipo,
      ContentDisposition: disposicao ? contentDisposition(disposicao) : undefined,
    }),
  );
  return { chave, url: urlPublica(chave, env) };
}

/** Apaga um arquivo do bucket. Com o versionamento do bucket (D3), a versão anterior continua recuperável. */
export async function apagarArquivo(chave: string) {
  const env = lerEnvArmazenamento();
  await obterCliente(env).send(new DeleteObjectCommand({ Bucket: env.S3_BUCKET, Key: chave }));
}

export const armazenamentoS3: Armazenamento = { enviar: enviarArquivo, apagar: apagarArquivo };
