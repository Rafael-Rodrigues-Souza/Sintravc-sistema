import type { Metadata } from "next";
import Link from "next/link";

import { IconeFigma } from "@/components/icone-figma";
import { FilieSe } from "@/components/site/filie-se";
import { Eyebrow, Migalhas } from "@/components/site/partes-da-pagina";
import { BuscaETema } from "@/components/site/radio/busca-e-tema";
import { CarregarMaisEpisodios } from "@/components/site/radio/carregar-mais-episodios";
import { CartaoEpisodio } from "@/components/site/radio/cartao-episodio";
import { LerTranscricao } from "@/components/site/radio/janela-transcricao";
import { PlayerYoutube, ProvedorDoPlayer } from "@/components/site/radio/player-youtube";
import { RADIO_PAGINA } from "@/conteudo/site";
import { lerConfigSite } from "@/lib/config-site";
import { linkFiliacao } from "@/lib/config-site/links";
import { enderecoDoRadio, lerFiltrosDoRadio, temFiltroNoRadio } from "@/lib/episodios/filtros";
import { linhaAoVivo, linksDoCanal } from "@/lib/episodios/programa";
import { episodiosDoSite, programaDoSite, temasDoSite, totalNoAr, ultimoPrograma } from "@/lib/episodios/site";
import { IMAGEM_PADRAO_COMPARTILHAR } from "@/lib/noticias-do-site/compartilhar";

const t = RADIO_PAGINA;

export const metadata: Metadata = {
  title: "Rádio Chofer",
  description: t.texto,
  openGraph: {
    title: "Rádio Chofer · SINTRAVC",
    description: t.texto,
    images: [{ url: IMAGEM_PADRAO_COMPARTILHAR.caminho, width: IMAGEM_PADRAO_COMPARTILHAR.largura, height: IMAGEM_PADRAO_COMPARTILHAR.altura }],
  },
};

/**
 * Rádio Chofer (Figma 157:8305 / 157:8607; US04, RF05, RN17, E55, E61). No topo, o programa ao vivo
 * e o último programa no player, que só carrega no clique. Embaixo, busca, tema e a grade, do mais
 * novo ao mais antigo, com “Carregar mais”. Renderizada a cada visita: o site segue o relógio.
 */
export default async function PaginaRadioChofer({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const filtros = lerFiltrosDoRadio(await searchParams);
  const agora = new Date();
  const [config, programa, topo, lista, temas, total] = await Promise.all([
    lerConfigSite(),
    programaDoSite(),
    ultimoPrograma(agora),
    episodiosDoSite(filtros, agora),
    temasDoSite(agora),
    totalNoAr(agora),
  ]);
  const canal = linksDoCanal(programa.canal);
  const filtrando = temFiltroNoRadio(filtros);

  return (
    <ProvedorDoPlayer>
      <section aria-labelledby="titulo-pagina" className="bg-fundo-marinho">
        <div className="conteudo-site flex flex-col gap-8 pt-6 pb-10 lg:flex-row lg:items-center lg:gap-16 lg:pt-[72px] lg:pb-20">
          <div className="flex flex-col gap-[18px] lg:w-[536px] lg:shrink-0">
            <Migalhas sobreEscuro itens={[{ rotulo: "Início", href: "/" }, { rotulo: t.migalha }]} />
            <Eyebrow sobreEscuro>{t.eyebrow}</Eyebrow>
            <h1 id="titulo-pagina" className="texto-display-mobile text-texto-invertido uppercase lg:texto-display">
              {t.titulo}
            </h1>
            <p className="texto-corpo text-texto-invertido-sec lg:texto-corpo-grande">{t.texto}</p>
            {programa.ativo ? (
              <p className="flex items-center gap-2 texto-titulo-card-pequeno text-texto-invertido">
                <IconeFigma src="/site/icone-relogio.svg" tamanho={18} className="text-destaque-amarelo" />
                {linhaAoVivo(programa)}
              </p>
            ) : null}
            {canal ? (
              <div className="flex flex-col gap-3 sm:flex-row">
                <a
                  href={canal.assistir}
                  target="_blank"
                  rel="noopener"
                  className="alvo-toque inline-flex h-12 items-center justify-center gap-2 rounded-full bg-destaque-amarelo pr-6 pl-5 texto-botao text-destaque-amarelo-texto outline-none hover:brightness-95 focus-visible:ring-[3px] focus-visible:ring-destaque-amarelo focus-visible:ring-offset-2 focus-visible:ring-offset-fundo-marinho"
                >
                  <IconeFigma src="/site/icone-youtube.svg" tamanho={18} />
                  {t.assistir}
                  <span className="sr-only">(abre o YouTube em nova aba)</span>
                </a>
                <a
                  href={canal.inscrever}
                  target="_blank"
                  rel="noopener"
                  className="alvo-toque inline-flex h-12 items-center justify-center rounded-full border-[1.5px] border-sobre-escuro-borda bg-sobre-escuro-superficie px-6 texto-botao text-texto-invertido outline-none hover:bg-sobre-escuro-chip focus-visible:ring-[3px] focus-visible:ring-destaque-amarelo"
                >
                  {t.inscrever}
                  <span className="sr-only">(abre o YouTube em nova aba)</span>
                </a>
              </div>
            ) : null}
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-3">
            {topo ? (
              <>
                <PlayerYoutube
                  episodio={topo}
                  variante="topo"
                  selo={`Ep. ${topo.numero} · ${t.ultimoPrograma}`}
                  className="rounded-[16px]"
                />
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                  <p className="flex flex-1 items-start gap-2 texto-pequeno text-texto-invertido-sec">
                    <IconeFigma src="/site/icone-info.svg" tamanho={16} className="mt-0.5" />
                    {t.notaDoPlayer}
                  </p>
                  {topo.temTranscricao ? (
                    <LerTranscricao
                      youtubeId={topo.youtubeId}
                      numero={topo.numero}
                      titulo={topo.titulo}
                      className="text-destaque-amarelo focus-visible:ring-destaque-amarelo"
                    />
                  ) : null}
                </div>
              </>
            ) : (
              <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-[16px] border border-sobre-escuro-borda bg-sobre-escuro-superficie p-6 text-center">
                <IconeFigma src="/site/icone-youtube.svg" tamanho={32} className="text-destaque-amarelo" />
                <p className="texto-corpo text-texto-invertido-sec">{t.semEpisodioNoTopo}</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section id="episodios" aria-labelledby="titulo-episodios" className="conteudo-site flex scroll-mt-24 flex-col gap-8 pt-10 pb-16 lg:pt-[88px] lg:pb-24">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
          <div className="flex flex-col gap-2.5">
            <Eyebrow>{t.listaEyebrow}</Eyebrow>
            <h2 id="titulo-episodios" className="texto-titulo-secao-mobile text-texto-primario lg:texto-titulo-secao">
              {t.listaTitulo}
            </h2>
          </div>
          {total > 0 ? (
            <div className="lg:w-[660px]">
              <BuscaETema filtros={filtros} temas={temas} total={total} />
            </div>
          ) : null}
        </div>

        {lista.itens.length > 0 ? (
          <>
            {filtrando ? (
              <p role="status" className="-mt-4 texto-pequeno text-texto-secundario">
                {lista.total === 1 ? "1 episódio encontrado" : `${lista.total} episódios encontrados`}
              </p>
            ) : null}
            <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {lista.itens.map((episodio) => (
                <li key={episodio.id} className="flex">
                  <CartaoEpisodio episodio={episodio} />
                </li>
              ))}
            </ul>
            <CarregarMaisEpisodios
              href={enderecoDoRadio({ ...filtros, leva: filtros.leva + 1 })}
              jaMostrados={lista.itens.length}
              temMais={lista.temMais}
            />
          </>
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-[20px] border border-dashed border-borda-padrao px-6 py-12 text-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-status-neutro-fundo text-texto-secundario">
              <IconeFigma src="/site/icone-youtube.svg" tamanho={24} />
            </span>
            <p className="texto-titulo-card text-texto-primario">{filtrando ? t.nadaEncontradoTitulo : t.vazioTitulo}</p>
            <p className="texto-corpo text-texto-secundario">{filtrando ? t.nadaEncontradoTexto : t.vazioTexto}</p>
            {filtrando ? (
              <Link
                href="/radio-chofer#episodios"
                className="alvo-toque mt-1 inline-flex h-10 items-center rounded-full border-[1.5px] border-borda-forte px-5 texto-botao text-texto-primario outline-none hover:bg-fundo-superficie-alt focus-visible:ring-[3px] focus-visible:ring-ring"
              >
                {t.limparFiltros}
              </Link>
            ) : canal ? (
              <a
                href={canal.assistir}
                target="_blank"
                rel="noopener"
                className="alvo-toque mt-1 inline-flex h-10 items-center rounded-full border-[1.5px] border-borda-forte px-5 texto-botao text-texto-primario outline-none hover:bg-fundo-superficie-alt focus-visible:ring-[3px] focus-visible:ring-ring"
              >
                {t.assistir}
                <span className="sr-only">(abre o YouTube em nova aba)</span>
              </a>
            ) : null}
          </div>
        )}
      </section>

      <FilieSe linkFiliacao={linkFiliacao(config)} />
    </ProvedorDoPlayer>
  );
}
