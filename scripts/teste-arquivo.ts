import "./carregar-env";

import { enviarArquivo, urlPublica } from "@/lib/armazenamento";

// Uso: pnpm teste:arquivo
async function main() {
  const agora = new Date();
  const chave = `testes/teste-${agora.getTime()}.txt`;
  const conteudo = `Arquivo de teste do SINTRAVC, enviado em ${agora.toLocaleString("pt-BR", {
    timeZone: "America/Bahia",
  })} (horário da Bahia).\n`;

  const { url } = await enviarArquivo({ chave, conteudo, tipo: "text/plain; charset=utf-8" });

  // Dentro do container, "localhost" não é o MinIO: S3_URL_PUBLICA_INTERNA (só no compose)
  // aponta para o mesmo bucket pela rede interna. Fora dele, confere a própria URL pública.
  const base = process.env.S3_URL_PUBLICA_INTERNA;
  const urlConferida = base ? urlPublica(chave, { S3_URL_PUBLICA: base }) : url;
  const resposta = await fetch(urlConferida);
  if (!resposta.ok) {
    throw new Error(`o arquivo foi enviado, mas ${urlConferida} respondeu ${resposta.status}.`);
  }

  console.log(`Arquivo enviado. Abra no navegador: ${url}`);
}

main().catch((erro: unknown) => {
  console.error("Falha ao enviar o arquivo:", erro instanceof Error ? erro.message : erro);
  process.exit(1);
});
