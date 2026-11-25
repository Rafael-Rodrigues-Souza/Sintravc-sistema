import Link from "next/link";

import { IconeFigma } from "@/components/icone-figma";
import { LINKS } from "@/components/site/navegacao";
import { PlayerYoutube, ProvedorDoPlayer } from "@/components/site/radio/player-youtube";
import { HOME_PAGINA, RADIO_PAGINA } from "@/conteudo/site";
import type { ProgramaAoVivo } from "@/lib/config-site/esquema";
import { dataCurtaNaBahia } from "@/lib/datas";
import { linhaAoVivo, linksDoCanal, programaNoAr } from "@/lib/episodios/programa";
import type { EpisodioDoSite } from "@/lib/episodios/site";

const t = HOME_PAGINA;

/** "24 min" (a duração do episódio, arredondada para cima). */
function minutos(segundos: number) {
  return `${Math.max(1, Math.round(segundos / 60))} min`;
}

/**
 * Último programa do Rádio Chofer (Figma 34:668 / 36:810; RF01, R12, E61, E62). O player só carrega
 * no clique (nada vai ao Google antes, E56). Embaixo, o programa ao vivo: “Ao vivo agora”, com o link
 * do canal, durante o horário; fora dele, o horário. Sem episódio no ar, a seção não aparece.
 */
export function UltimoPrograma({ episodio, programa, agora }: { episodio: EpisodioDoSite | null; programa: ProgramaAoVivo; agora: Date }) {
  if (!episodio) return null;
  const aoVivo = programaNoAr(programa, agora);
  const canal = linksDoCanal(programa.canal);
  return (
    <section aria-labelledby="titulo-ultimo-programa" className="bg-fundo-marinho">
      <ProvedorDoPlayer>
        {/* Celular (36:810): título, player e texto. Computador (34:668): player à esquerda, título e texto à direita. */}
        <div className="conteudo-site grid gap-x-16 gap-y-6 py-11 [grid-template-areas:'cab'_'player'_'info'] lg:grid-cols-[minmax(0,660px)_minmax(0,1fr)] lg:grid-rows-[auto_auto] lg:content-center lg:py-24 lg:[grid-template-areas:'player_cab'_'player_info']">
          <div className="flex flex-col gap-3 [grid-area:cab] lg:self-end">
            <Cabecalho />
          </div>
          <div className="[grid-area:player] lg:self-center">
            <PlayerYoutube episodio={episodio} variante="topo" selo={`Ep. ${episodio.numero} · ${RADIO_PAGINA.ultimoPrograma}`} className="rounded-[20px] lg:rounded-[24px]" />
          </div>
          <div className="flex min-w-0 flex-col gap-4 [grid-area:info] lg:gap-5 lg:self-start">
            <p className="texto-titulo-card break-words text-texto-invertido">
              Ep. {episodio.numero} — {episodio.titulo}
            </p>
            {episodio.resumo ? <p className="texto-corpo text-texto-invertido-sec">{episodio.resumo}</p> : null}
            <p className="flex items-center gap-2 texto-pequeno text-texto-invertido-sec">
              <IconeFigma src="/site/icone-relogio.svg" tamanho={16} />
              {episodio.duracaoSeg ? `${minutos(episodio.duracaoSeg)} · ` : ""}Exibido em {dataCurtaNaBahia(episodio.exibicaoEm)}
            </p>
            {programa.ativo ? (
              <p data-testid="ao-vivo-home" className="flex flex-wrap items-center gap-2 texto-titulo-card-pequeno text-texto-invertido">
                {aoVivo ? (
                  <>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-sobre-escuro-chip px-2.5 py-1 texto-etiqueta uppercase">
                      <span aria-hidden className="size-2 rounded-full bg-sobre-escuro-ao-vivo motion-safe:animate-pulse" />
                      {t.aoVivoAgora}
                    </span>
                    {canal ? (
                      <a href={canal.assistir} target="_blank" rel="noopener" className="alvo-toque rounded-[6px] text-destaque-amarelo underline underline-offset-2 outline-none focus-visible:ring-[3px] focus-visible:ring-destaque-amarelo">
                        {t.assistirAoVivo}
                        <span className="sr-only"> (abre o YouTube em nova aba)</span>
                      </a>
                    ) : null}
                  </>
                ) : (
                  <>
                    <IconeFigma src="/site/icone-relogio.svg" tamanho={18} className="text-destaque-amarelo" />
                    {linhaAoVivo(programa)}
                  </>
                )}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-3 pt-1">
              <Link
                href={`${LINKS.radio.href}#episodios`}
                className="alvo-toque inline-flex h-12 grow items-center justify-center rounded-full border-[1.5px] border-sobre-escuro-borda bg-sobre-escuro-superficie px-6 texto-botao whitespace-nowrap text-texto-invertido outline-none hover:bg-sobre-escuro-chip focus-visible:ring-[3px] focus-visible:ring-destaque-amarelo sm:grow-0"
              >
                {t.todosOsProgramas}
              </Link>
            </div>
          </div>
        </div>
      </ProvedorDoPlayer>
    </section>
  );
}

function Cabecalho() {
  return (
    <>
      <p className="texto-eyebrow flex items-center gap-2 text-destaque-amarelo">
        <span aria-hidden className="size-2 rounded-full bg-destaque-vermelho" />
        {t.radioEyebrow}
      </p>
      <h2 id="titulo-ultimo-programa" className="texto-titulo-secao-mobile text-texto-invertido lg:texto-titulo-secao">
        {t.radioTitulo}
      </h2>
    </>
  );
}
