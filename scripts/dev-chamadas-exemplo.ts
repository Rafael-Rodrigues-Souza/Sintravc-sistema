import "./carregar-env";

import { randomUUID } from "node:crypto";

import { and, eq, inArray } from "drizzle-orm";
import sharp from "sharp";

import { banco, fecharBanco } from "@/lib/db";
import { midia, paginaInicial, pessoaEquipe } from "@/lib/db/schema";
import { enviarMidia } from "@/lib/midia/enviar";
import { publicarAlteracoes, salvarRascunho } from "@/lib/pagina-inicial/rascunho";
import type { ItemDoCarrossel } from "@/lib/pagina-inicial/regras";
import { lerParametro } from "@/lib/parametros";
import type { QuemDaEquipe } from "@/lib/permissoes";
import { filaEmMemoria } from "@/lib/tarefas/fila";

// SÓ PARA DESENVOLVIMENTO (#75). Publica Chamadas de exemplo no carrossel da Home, com imagens de
// teste geradas aqui (ilustração de um ônibus, sem pessoas): as fotos de verdade entram só pela Mídia.
// As frases são as aprovadas pelo Rafael para os exemplos (E63); no site real, quem escreve é a
// Comunicação, no painel. O carrossel do dev passa a ter só estas Chamadas (até o limite).
//
// Uso: pnpm dev:chamadas-exemplo
const FRASES: { frase: string; apoio: string }[] = [
  { frase: "Seu sindicato é feito por quem está ao volante.", apoio: "O SINTRAVC é dos motoristas e trabalhadores do transporte coletivo de Vitória da Conquista. Faça parte." },
  { frase: "Junto, o rodoviário pesa mais.", apoio: "Cada trabalhador que se filia fortalece a voz da categoria na hora de negociar com as empresas." },
  { frase: "Quem está na estrada não precisa estar sozinho.", apoio: "Com o sindicato, você tem a quem procurar quando surgir um problema no trabalho." },
  { frase: "Seus direitos não podem ficar parados no ponto.", apoio: "Conheça o acordo coletivo da categoria e conte com o sindicato para fazer valer o que foi conquistado." },
  { frase: "Ainda com dúvida? A gente conversa.", apoio: "Tire suas dúvidas sobre a filiação com a recepção do sindicato, pelo WhatsApp ou pessoalmente." },
];
const CENAS = [
  ["#1b3a6b", "#e8b53a"],
  ["#2c4a3e", "#d9c27a"],
  ["#4b2e39", "#f0a35e"],
  ["#203247", "#8fb8de"],
  ["#3d3a2a", "#f2d16b"],
] as const;

async function imagemDeTeste(quem: QuemDaEquipe, n: number) {
  const [a, b] = CENAS[n % CENAS.length]!;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080">
    <defs><linearGradient id="c" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${b}"/><stop offset="1" stop-color="${a}"/></linearGradient></defs>
    <rect width="1920" height="1080" fill="url(#c)"/>
    <circle cx="${1300 + n * 80}" cy="300" r="150" fill="#fff6d8" fill-opacity="0.75"/>
    <rect y="720" width="1920" height="360" fill="#1d232c"/>
    ${Array.from({ length: 11 }, (_, k) => `<rect x="${k * 190 - 40}" y="890" width="110" height="18" rx="9" fill="#ffcc00"/>`).join("")}
    <rect x="${900 + n * 40}" y="500" width="820" height="270" rx="34" fill="#f4f6f9"/>
    <rect x="${900 + n * 40}" y="500" width="820" height="70" rx="34" fill="#021f4b"/>
    ${Array.from({ length: 5 }, (_, k) => `<rect x="${950 + n * 40 + k * 150}" y="590" width="115" height="80" rx="10" fill="#9fb6cf"/>`).join("")}
    <circle cx="${1060 + n * 40}" cy="775" r="48" fill="#111"/><circle cx="${1560 + n * 40}" cy="775" r="48" fill="#111"/>
    <text x="1880" y="1050" text-anchor="end" font-family="Arial" font-size="32" fill="#ffffff" fill-opacity="0.75">Imagem de teste ${n + 1}</text>
  </svg>`;
  const bytes = await sharp(Buffer.from(svg)).jpeg({ quality: 82 }).toBuffer();
  const { id } = await enviarMidia({ bytes: new Uint8Array(bytes), nome: `chamada-exemplo-${n + 1}.jpg` }, { quem });
  const alt = `Imagem de teste ${n + 1}: ilustração de um ônibus na pista`;
  await banco().update(midia).set({ alt }).where(eq(midia.id, id));
  return { id, alt };
}

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Este comando é só para desenvolvimento e não roda com NODE_ENV=production.");
  }
  const [pessoa] = await banco()
    .select({ id: pessoaEquipe.id, perfil: pessoaEquipe.perfil })
    .from(pessoaEquipe)
    .where(and(eq(pessoaEquipe.situacao, "ativa"), inArray(pessoaEquipe.perfil, ["ADM", "COM"])))
    .limit(1);
  if (!pessoa) throw new Error("Não há ADM nem COM ativos. Rode antes pnpm criar-admin ou pnpm dev:pessoas-teste.");
  const quem: QuemDaEquipe = { tipo: "equipe", id: pessoa.id, perfil: pessoa.perfil };

  const maximo = await lerParametro("home.carrossel_maximo");
  const carrossel: ItemDoCarrossel[] = [];
  for (const [n, { frase, apoio }] of FRASES.slice(0, maximo).entries()) {
    const foto = await imagemDeTeste(quem, n);
    carrossel.push({
      tipo: "chamada",
      itemId: randomUUID(),
      entraEm: null,
      saiEm: null,
      fraseChamada: frase,
      chamada: { fotoMidiaId: foto.id, fotoAlt: foto.alt, textoApoio: apoio, botaoTexto: null, destino: "filie_se" },
    });
  }

  const revisao = async () => (await banco().select({ revisao: paginaInicial.revisao }).from(paginaInicial))[0]!.revisao;
  const salvo = await salvarRascunho({ revisaoBase: await revisao(), dados: { carrossel } }, { quem });
  if (salvo.tipo !== "salvo") throw new Error("Outra pessoa mudou a página inicial agora. Rode de novo.");
  await publicarAlteracoes({ revisaoBase: salvo.revisao }, { quem, fila: filaEmMemoria().fila });
  console.log(`${carrossel.length} Chamadas de exemplo publicadas. Abra http://localhost:3000 e, para mudar, /painel/pagina-inicial.`);
}

main()
  .catch((erro: unknown) => {
    console.error(erro instanceof Error ? erro.message : erro);
    process.exitCode = 1;
  })
  .finally(() => fecharBanco());
