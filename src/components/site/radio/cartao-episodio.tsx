import { dataCurtaNaBahia } from "@/lib/datas";
import type { EpisodioDoSite } from "@/lib/episodios/site";
import { cn } from "@/lib/utils";

import { LerTranscricao } from "./janela-transcricao";
import { PlayerYoutube } from "./player-youtube";

/**
 * Um episódio na grade (Figma 157:8468): a capa com a duração vira o player no próprio cartão
 * (“Ouvir agora”, E61); embaixo, número e data, título, resumo em até 2 linhas e, com transcrição,
 * “Ler transcrição” (E55).
 */
export function CartaoEpisodio({ episodio, className }: { episodio: EpisodioDoSite; className?: string }) {
  return (
    <article
      id={`ep-${episodio.numero}`}
      data-testid="cartao-episodio"
      aria-labelledby={`ep-${episodio.numero}-titulo`}
      className={cn("flex w-full flex-col overflow-hidden rounded-[16px] border border-borda-padrao bg-fundo-superficie", className)}
    >
      <PlayerYoutube episodio={episodio} variante="cartao" />
      <div className="flex flex-1 flex-col gap-2 px-5 pt-[18px] pb-[22px]">
        <p className="texto-pequeno text-texto-terciario">
          Ep. {episodio.numero}
          <span aria-hidden> · </span>
          <span className="sr-only">, </span>
          <time dateTime={episodio.exibicaoEm.toISOString()}>{dataCurtaNaBahia(episodio.exibicaoEm)}</time>
        </p>
        <h3 id={`ep-${episodio.numero}-titulo`} tabIndex={-1} className="texto-titulo-card break-words text-texto-primario outline-none">
          {episodio.titulo}
        </h3>
        {episodio.resumo ? <p className="line-clamp-2 texto-corpo break-words text-texto-secundario">{episodio.resumo}</p> : null}
        {episodio.temTranscricao ? (
          <LerTranscricao youtubeId={episodio.youtubeId} numero={episodio.numero} titulo={episodio.titulo} className="mt-1" />
        ) : null}
      </div>
    </article>
  );
}
