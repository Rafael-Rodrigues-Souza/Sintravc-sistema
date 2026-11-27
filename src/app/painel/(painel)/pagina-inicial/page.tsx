import type { Metadata } from "next";

import { exigirArea } from "@/lib/acesso/sessao-da-equipe";
import { limitesDaMidia } from "@/lib/midia/enviar";
import { erroDeTamanho } from "@/lib/midia/erros";
import { lerParametro } from "@/lib/parametros";
import { detalhesDosItens, type OpcaoDeDestaque } from "@/lib/pagina-inicial/itens";
import { lerPainel } from "@/lib/pagina-inicial/rascunho";
import { chaveDoItem } from "@/lib/pagina-inicial/regras";
import { ultimoPrograma } from "@/lib/episodios/site";
import { ehUuid } from "@/lib/uuid";

import { AreaPaginaInicial } from "./area-pagina-inicial";

export const metadata: Metadata = { title: "Página inicial" };

/**
 * Página inicial (RF46, US26, E13, E62, E63; Figma 166:16879, sem frame mobile: segue o E50): o
 * carrossel do topo (com as Chamadas), o último programa (automático), a prévia e “Publicar
 * alterações”. A lista “Em destaque” saiu (E63). `?sugerir=<id>` vem do “Destacar na Home” do editor (E43) e abre “Adicionar
 * destaque” com a notícia escolhida.
 */
export default async function PaginaPaginaInicial({ searchParams }: { searchParams: Promise<{ sugerir?: string }> }) {
  const pessoa = await exigirArea("pagina_inicial");
  const { sugerir } = await searchParams;
  const deps = { quem: pessoa.quem };
  const [painel, intervaloSegundos, programa, midia] = await Promise.all([
    lerPainel(deps),
    lerParametro("editor.salvamento_automatico_segundos"),
    ultimoPrograma(),
    limitesDaMidia(),
  ]);
  // A notícia sugerida só vale publicada (E43); fora do ar, a tela avisa.
  let sugerida: { opcao: OpcaoDeDestaque | null } | null = null;
  if (ehUuid(sugerir)) {
    const item = { tipo: "noticia", itemId: sugerir } as const;
    const detalhe = (await detalhesDosItens([item]))[chaveDoItem(item)];
    sugerida = { opcao: detalhe?.noSite ? (detalhe as OpcaoDeDestaque) : null };
  }

  return (
    <AreaPaginaInicial
      pessoaId={pessoa.quem.id}
      inicial={painel}
      agoraDoServidor={new Date().toISOString()}
      intervaloMs={intervaloSegundos * 1000}
      ultimoPrograma={programa ? { numero: programa.numero, titulo: programa.titulo } : null}
      sugerida={sugerida}
      limitesDaMidia={{ tamanhoMaximoBytes: midia.tamanhoMaximoBytes, mensagemDeTamanho: erroDeTamanho(midia.tamanhoMaximoBytes).message }}
    />
  );
}
