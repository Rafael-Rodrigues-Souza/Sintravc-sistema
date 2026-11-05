import "./carregar-env";

import { parseArgs } from "node:util";

import { enviarEmail } from "@/lib/email";

// Uso: pnpm teste:email --para alguem@exemplo.com
async function main() {
  const { values } = parseArgs({ options: { para: { type: "string" } } });
  const para = values.para ?? "teste@sintravc.local";
  const agora = new Date().toLocaleString("pt-BR", { timeZone: "America/Bahia" });

  const { idMensagem } = await enviarEmail({
    para,
    assunto: "Teste de e-mail do SINTRAVC",
    texto: `Este é um e-mail de teste enviado em ${agora} (horário da Bahia).`,
    html: `<p>Este é um e-mail de teste enviado em <strong>${agora}</strong> (horário da Bahia).</p>`,
  });

  console.log(`E-mail enviado para ${para} (id ${idMensagem}).`);
}

main().catch((erro: unknown) => {
  console.error("Falha ao enviar o e-mail:", erro instanceof Error ? erro.message : erro);
  process.exit(1);
});
