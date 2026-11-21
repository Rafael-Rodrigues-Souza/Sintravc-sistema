import type { Metadata } from "next";
import Link from "next/link";

import { IconeFigma } from "@/components/icone-figma";
import { FilieSe } from "@/components/site/filie-se";
import { LINKS } from "@/components/site/navegacao";
import { BuscaEOrdem } from "@/components/site/noticias/busca-e-ordem";
import { CarregarMais } from "@/components/site/noticias/carregar-mais";
import { CartaoNoticia } from "@/components/site/noticias/cartao-noticia";
import { ChipsDeCategoria } from "@/components/site/noticias/chips-de-categoria";
import { BlocoDestaque } from "@/components/site/noticias/destaque";
import { MaisLidas } from "@/components/site/noticias/mais-lidas";
import { Paginacao } from "@/components/site/noticias/paginacao";
import { SugestaoDePauta } from "@/components/site/noticias/sugestao-de-pauta";
import { Eyebrow, Migalhas } from "@/components/site/partes-da-pagina";
import { Button } from "@/components/ui/button";
import { NOTICIAS_PAGINA } from "@/conteudo/site";
import { lerConfigSite } from "@/lib/config-site";
import { linkFiliacao, linkWhatsApp } from "@/lib/config-site/links";
import { IMAGEM_PADRAO_COMPARTILHAR } from "@/lib/noticias-do-site/compartilhar";
import { categoriasDoSite, listarNoticiasDoSite, maisLidas, noticiaEmDestaque, totalNoAr } from "@/lib/noticias-do-site/consultas";
import { enderecoDaLista, lerFiltros, temFiltro } from "@/lib/noticias-do-site/filtros";

export const metadata: Metadata = {
  title: "Notícias",
  description: NOTICIAS_PAGINA.texto,
  openGraph: {
    title: "Notícias do SINTRAVC",
    description: NOTICIAS_PAGINA.texto,
    images: [{ url: IMAGEM_PADRAO_COMPARTILHAR.caminho, width: IMAGEM_PADRAO_COMPARTILHAR.largura, height: IMAGEM_PADRAO_COMPARTILHAR.altura }],
  },
};

/**
 * Notícias (Figma 80:629 / 81:995; RF02, US02, RN58, E30, E59). No topo, o Destaque (a fixada ou a
 * mais recente) e as Mais lidas da semana. Embaixo, a grade com busca, ordem e assuntos, que vivem
 * na URL. Sem filtro, a grade não repete a notícia do Destaque. Renderizada no servidor a cada
 * visita (RNF08): o que é publicado aparece na hora.
 */
export default async function PaginaNoticias({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const filtros = lerFiltros(await searchParams);
  const filtrando = temFiltro(filtros);
  const agora = new Date();
  const [config, categorias, total, destaque, lidas] = await Promise.all([
    lerConfigSite(),
    categoriasDoSite(),
    totalNoAr(),
    noticiaEmDestaque(agora),
    maisLidas(agora),
  ]);
  const categoria = filtros.categoria ? (categorias.find((c) => c.slug === filtros.categoria) ?? null) : null;
  // Categoria que não existe (ou sem notícia no ar): nenhuma notícia, com o vazio do E23.
  const categoriaInexistente = filtros.categoria !== null && categoria === null;
  const excluir = !filtrando && destaque ? destaque.id : undefined;
  const lista = categoriaInexistente
    ? { itens: [], total: 0, pagina: 1, paginas: 1 }
    : await listarNoticiasDoSite({ categoriaId: categoria?.id, busca: filtros.busca, ordem: filtros.ordem, pagina: filtros.pagina, excluir });
  const t = NOTICIAS_PAGINA;
  const resultado = filtrando
    ? `${lista.total === 1 ? "1 notícia encontrada" : `${lista.total} notícias encontradas`}${categoria ? ` em ${categoria.nome}` : ""}${filtros.busca ? ` para “${filtros.busca}”` : ""}.`
    : "";

  return (
    <>
      <section aria-labelledby="titulo-pagina" className="bg-fundo-marinho">
        <div className="conteudo-site flex flex-col gap-7 pt-6 pb-12 lg:pt-8 lg:pb-[72px]">
          <Migalhas sobreEscuro itens={[{ rotulo: "Início", href: "/" }, { rotulo: LINKS.noticias.rotulo }]} />
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:gap-16">
            <div className="flex flex-1 flex-col gap-4">
              <Eyebrow sobreEscuro>{t.eyebrow}</Eyebrow>
              <h1 id="titulo-pagina" className="texto-display-mobile text-texto-invertido lg:texto-display">
                {t.titulo}
              </h1>
            </div>
            <p className="texto-corpo text-texto-invertido-sec lg:w-[400px] lg:texto-corpo-grande">{t.texto}</p>
          </div>
          {destaque ? (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_416px]">
              <BlocoDestaque noticia={destaque} />
              <MaisLidas noticias={lidas} sobreEscuro />
            </div>
          ) : null}
        </div>
      </section>

      <section aria-labelledby="ultimas-noticias" className="conteudo-site flex flex-col gap-7 pt-12 pb-16 lg:pt-[72px] lg:pb-24">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:gap-3">
          <div className="flex flex-1 flex-col gap-2.5">
            <Eyebrow>{t.listaEyebrow}</Eyebrow>
            <h2 id="ultimas-noticias" className="texto-titulo-secao-mobile text-texto-primario lg:texto-titulo-secao">
              {t.listaTitulo}
            </h2>
          </div>
          {total > 0 ? <BuscaEOrdem filtros={filtros} /> : null}
        </div>

        {total > 0 ? <ChipsDeCategoria categorias={categorias} total={total} filtros={filtros} /> : null}

        <p role="status" className={filtrando ? "texto-pequeno text-texto-secundario" : "sr-only"}>
          {resultado}
        </p>

        {lista.itens.length > 0 ? (
          <>
            <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3" data-testid="grade-noticias">
              {lista.itens.map((n) => (
                <li key={n.id} className="flex">
                  <CartaoNoticia noticia={n} className="w-full" />
                </li>
              ))}
            </ul>
            <Paginacao filtros={filtros} pagina={lista.pagina} paginas={lista.paginas} className="hidden lg:flex" />
            <CarregarMais
              key={enderecoDaLista({ ...filtros, pagina: lista.pagina })}
              filtros={{ categoriaId: categoria?.id, busca: filtros.busca || undefined, ordem: filtros.ordem, excluir }}
              pagina={lista.pagina}
              paginas={lista.paginas}
              className="flex lg:hidden"
            />
          </>
        ) : (
          <Vazio filtrando={filtrando || categoriaInexistente} />
        )}

        <SugestaoDePauta linkWhatsApp={linkWhatsApp(config.contato.whatsappRecepcao)} />
      </section>

      <FilieSe linkFiliacao={linkFiliacao(config)} />
    </>
  );
}

/** Estado vazio do E23: ícone, frase e ação. */
function Vazio({ filtrando }: { filtrando: boolean }) {
  const t = NOTICIAS_PAGINA;
  return (
    <div className="flex flex-col items-center gap-3 rounded-[16px] border border-borda-padrao bg-fundo-superficie px-6 py-10 text-center">
      <span aria-hidden className="flex size-16 items-center justify-center rounded-full bg-status-neutro-fundo text-texto-secundario">
        <IconeFigma src={filtrando ? "/site/icone-busca.svg" : "/site/icone-documento.svg"} tamanho={28} />
      </span>
      <h3 className="texto-titulo-card text-texto-primario">{filtrando ? t.semResultadoTitulo : t.vazioTitulo}</h3>
      <p className="max-w-[420px] texto-pequeno text-texto-secundario">{filtrando ? t.semResultadoTexto : t.vazioTexto}</p>
      <Button asChild variant="secundario" className="mt-1">
        <Link href={filtrando ? LINKS.noticias.href : LINKS.inicio.href}>{filtrando ? t.semResultadoAcao : t.vazioAcao}</Link>
      </Button>
    </div>
  );
}
