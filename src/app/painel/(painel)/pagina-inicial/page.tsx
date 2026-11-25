import type { Metadata } from "next";

import { exigirArea } from "@/lib/acesso/sessao-da-equipe";
import { lerParametro } from "@/lib/parametros";
import { opcoesDeDestaque } from "@/lib/pagina-inicial/opcoes";
import { detalhesDosItens, lerPainel } from "@/lib/pagina-inicial/rascunho";
import { ultimoPrograma } from "@/lib/episodios/site";
import { ehUuid } from "@/lib/uuid";

import { AreaPaginaInicial } from "./area-pagina-inicial";

export const metadata: Metadata = { title: "Página inicial" };

/**
 * Página inicial (RF46, US26, E13, E62; Figma 166:16879, sem frame mobile: segue o E50): o
 * carrossel do topo, a lista “Em destaque”, o último programa (automático), a prévia e “Publicar
 * alterações”. `?sugerir=<id>` vem do “Destacar na Home” do editor (E43) e abre “Adicionar
 * destaque” com a notícia escolhida.
 */
export default async function PaginaPaginaInicial({ searchParams }: { searchParams: Promise<{ sugerir?: string }> }) {
  const pessoa = await exigirArea("pagina_inicial");
  const { sugerir } = await searchParams;
  const deps = { quem: pessoa.quem };
  const [painel, intervaloSegundos, programa] = await Promise.all([
    lerPainel(deps),
    lerParametro("editor.salvamento_automatico_segundos"),
    ultimoPrograma(),
  ]);
  // A notícia sugerida só vale publicada (E43); fora do ar, a tela avisa.
  let sugerida: { opcao: Awaited<ReturnType<typeof opcoesDeDestaque>>[number] | null } | null = null;
  if (ehUuid(sugerir)) {
    const opcoes = await opcoesDeDestaque({ tipo: "noticia", busca: "" }, deps);
    let opcao = opcoes.find((o) => o.id === sugerir) ?? null;
    if (!opcao) {
      const detalhe = (await detalhesDosItens([{ tipo: "noticia", itemId: sugerir }]))[`noticia:${sugerir}`];
      opcao = detalhe?.noSite
        ? { tipo: "noticia", id: sugerir, titulo: detalhe.titulo, rotulo: detalhe.rotulo, capaUrl: detalhe.capaUrl, temCapa: detalhe.temCapa, quando: new Date() }
        : null;
    }
    sugerida = { opcao };
  }

  return (
    <AreaPaginaInicial
      pessoaId={pessoa.quem.id}
      inicial={painel}
      agoraDoServidor={new Date().toISOString()}
      intervaloMs={intervaloSegundos * 1000}
      ultimoPrograma={programa ? { numero: programa.numero, titulo: programa.titulo } : null}
      sugerida={sugerida}
    />
  );
}
