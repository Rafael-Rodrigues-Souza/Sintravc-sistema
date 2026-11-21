import "./carregar-env";

import { randomUUID } from "node:crypto";

import { and, eq, inArray, like } from "drizzle-orm";
import sharp from "sharp";

import { urlPublica } from "@/lib/armazenamento";
import { noticiaVazia, type DadosNoticia } from "@/lib/conteudos/dados";
import { publicarNoticia } from "@/lib/conteudos/publicar";
import { salvarRascunhoNoticia } from "@/lib/conteudos/salvar";
import { banco, fecharBanco } from "@/lib/db";
import { categoria, conteudo, pessoaEquipe } from "@/lib/db/schema";
import { lerEnvArmazenamento } from "@/lib/env";
import { enviarMidia } from "@/lib/midia/enviar";
import { registrarVisualizacao } from "@/lib/noticias-do-site/consultas";
import type { QuemDaEquipe } from "@/lib/permissoes";
import { filaEmMemoria } from "@/lib/tarefas/fila";

// SÓ PARA DESENVOLVIMENTO. Publica notícias de exemplo, marcadas com “[Exemplo]” na manchete, para
// ver as páginas Notícias e Notícia aberta (#15) com conteúdo: com e sem capa, várias categorias,
// datas diferentes e algumas visualizações nas Mais lidas. Os textos são de mentira, de propósito.
//
// Uso: pnpm dev:noticias-exemplo
const QUANTAS = 14;
const CORES = ["#02488d", "#021f4b", "#a1020a", "#5c4a00", "#1f6f43", "#4a5361"];

async function capaDeExemplo(quem: QuemDaEquipe, n: number) {
  const cor = CORES[n % CORES.length]!;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900">
    <rect width="1600" height="900" fill="${cor}"/>
    <circle cx="1300" cy="200" r="320" fill="#ffffff" fill-opacity="0.08"/>
    <text x="80" y="820" font-family="Arial" font-size="64" fill="#ffffff" fill-opacity="0.8">Imagem de exemplo ${n + 1}</text>
  </svg>`;
  const bytes = await sharp(Buffer.from(svg)).jpeg({ quality: 80 }).toBuffer();
  return enviarMidia({ bytes: new Uint8Array(bytes), nome: `exemplo-${n + 1}.jpg` }, { quem });
}

function paragrafo(texto: string) {
  return { type: "paragraph", content: [{ type: "text", text: texto }] };
}

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Este comando é só para desenvolvimento e não roda com NODE_ENV=production.");
  }
  const jaTem = await banco()
    .select({ id: conteudo.id })
    .from(conteudo)
    .where(and(eq(conteudo.tipo, "noticia"), like(conteudo.titulo, "[Exemplo]%")))
    .limit(1);
  if (jaTem.length > 0) throw new Error("Já há notícias de exemplo. Arquive-as no painel antes de criar de novo.");

  const [pessoa] = await banco()
    .select({ id: pessoaEquipe.id, perfil: pessoaEquipe.perfil })
    .from(pessoaEquipe)
    .where(and(eq(pessoaEquipe.situacao, "ativa"), inArray(pessoaEquipe.perfil, ["ADM", "COM"])))
    .limit(1);
  if (!pessoa) throw new Error("Não há ADM nem COM ativos. Rode antes pnpm criar-admin ou pnpm dev:pessoas-teste.");
  const quem: QuemDaEquipe = { tipo: "equipe", id: pessoa.id, perfil: pessoa.perfil };

  const categorias = await banco().select({ id: categoria.id, nome: categoria.nome }).from(categoria).where(eq(categoria.escopos, ["noticias"]));
  const env = lerEnvArmazenamento();
  const urlDoArquivo = (chave: string) => urlPublica(chave, env);
  const ids: string[] = [];

  for (let n = 0; n < QUANTAS; n++) {
    const comCapa = n % 3 !== 2;
    const capa = comCapa ? await capaDeExemplo(quem, n) : null;
    const cat = categorias[n % categorias.length]!;
    const dados: DadosNoticia = {
      ...noticiaVazia(),
      titulo: `[Exemplo] Notícia ${n + 1} de ${cat.nome.toLowerCase()} para ver a página`,
      linhaFina: n % 2 === 0 ? "Linha fina de exemplo, que resume a notícia em uma frase curta." : "",
      lide: "Lide de exemplo. Este texto é só para ver como a notícia aparece no site e não traz informação real.",
      corpo: {
        type: "doc",
        content: [
          paragrafo("Primeiro parágrafo de exemplo. ".repeat(8).trim()),
          { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Subtítulo de exemplo" }] },
          paragrafo("Segundo parágrafo de exemplo. ".repeat(10).trim()),
        ],
      },
      capaMidiaId: capa?.id ?? null,
      capaAlt: capa ? `Imagem de exemplo ${n + 1}` : "",
      capaLegenda: capa ? "Legenda de exemplo. Foto: [crédito de exemplo]" : "",
      assinatura: "Redação SINTRAVC",
      local: "Vitória da Conquista – BA",
      categoriaId: cat.id,
      palavrasChave: ["exemplo", cat.nome.toLowerCase()],
    };
    const salvo = await salvarRascunhoNoticia({ dados }, { quem, sessaoEdicao: randomUUID(), urlDoArquivo });
    if (salvo.tipo !== "salvo") throw new Error("Não consegui salvar a notícia de exemplo.");
    // Uma por dia, da mais antiga para a mais nova (a última fica como a mais recente).
    const agora = new Date(Date.now() - (QUANTAS - n) * 24 * 60 * 60 * 1000);
    await publicarNoticia({ id: salvo.id, revisaoBase: salvo.revisao }, { quem, fila: filaEmMemoria().fila, agora });
    ids.push(salvo.id);
  }

  // Algumas visualizações hoje, para as Mais lidas não serem só as mais recentes.
  for (const [i, vezes] of [
    [2, 9],
    [5, 6],
    [8, 3],
  ] as const) {
    for (let v = 0; v < vezes; v++) await registrarVisualizacao(ids[i]!);
  }
  console.log(`${QUANTAS} notícias de exemplo publicadas. Abra http://localhost:3000/noticias`);
}

main()
  .catch((erro) => {
    console.error(erro instanceof Error ? erro.message : erro);
    process.exitCode = 1;
  })
  .finally(fecharBanco);
