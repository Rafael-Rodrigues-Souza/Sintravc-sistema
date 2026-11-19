import { execSync } from "node:child_process";

import {
  CreateBucketCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
  PutBucketPolicyCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import postgres from "postgres";

import { ambienteE2E } from "../playwright.config";
import { apagarBancoE2E } from "./apagar-banco";
import { FACEBOOK_DE_TESTE } from "./dados-do-site";

/**
 * Recria o banco sintravc_e2e, aplica as migrações e cria as pessoas de teste (pelas funções
 * do Better Auth). Os dados ficam em e2e/.dados/pessoas.json para os testes. Também deixa vazio
 * o bucket da Mídia dos testes (sintravc-e2e) no MinIO, com leitura pública como o de dev.
 */
export default async function preparar() {
  const url = new URL(ambienteE2E.DATABASE_URL);
  const nome = url.pathname.slice(1);
  const admin = new URL(url);
  admin.pathname = "/postgres";
  await apagarBancoE2E();
  const conexao = postgres(admin.toString(), { max: 1, onnotice: () => {} });
  try {
    await conexao.unsafe(`CREATE DATABASE "${nome}"`);
  } finally {
    await conexao.end();
  }

  await prepararBucket();

  const env = { ...process.env, ...ambienteE2E };
  execSync("pnpm -s db:migrar", { env, stdio: "inherit" });
  execSync("pnpm -s tsx scripts/e2e-pessoas.ts", { env, stdio: "inherit" });
  await dadosDoSite(ambienteE2E.DATABASE_URL);
}

/** Link de teste do Facebook na ConfigSite (e2e/dados-do-site.ts). */
async function dadosDoSite(urlDoBanco: string) {
  const banco = postgres(urlDoBanco, { max: 1, onnotice: () => {} });
  try {
    await banco`UPDATE config_site SET dados = jsonb_set(dados, '{redes,facebook}', ${banco.json(FACEBOOK_DE_TESTE)}) WHERE id = 'site'`;
  } finally {
    await banco.end();
  }
}

async function prepararBucket() {
  const bucket = ambienteE2E.S3_BUCKET;
  const s3 = new S3Client({
    endpoint: ambienteE2E.S3_ENDPOINT,
    region: ambienteE2E.S3_REGIAO,
    forcePathStyle: true,
    credentials: { accessKeyId: ambienteE2E.S3_CHAVE_ACESSO, secretAccessKey: ambienteE2E.S3_CHAVE_SECRETA },
  });
  try {
    await s3.send(new CreateBucketCommand({ Bucket: bucket })).catch((erro: { name?: string }) => {
      if (erro.name !== "BucketAlreadyOwnedByYou" && erro.name !== "BucketAlreadyExists") throw erro;
    });
    const politica = {
      Version: "2012-10-17",
      Statement: [{ Effect: "Allow", Principal: { AWS: ["*"] }, Action: ["s3:GetObject"], Resource: [`arn:aws:s3:::${bucket}/*`] }],
    };
    await s3.send(new PutBucketPolicyCommand({ Bucket: bucket, Policy: JSON.stringify(politica) }));
    const objetos = await s3.send(new ListObjectsV2Command({ Bucket: bucket }));
    if (objetos.Contents?.length) {
      await s3.send(
        new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: objetos.Contents.map(({ Key }) => ({ Key })) } }),
      );
    }
  } finally {
    s3.destroy();
  }
}
