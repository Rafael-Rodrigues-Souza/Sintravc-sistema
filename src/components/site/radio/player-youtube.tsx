"use client";

import * as React from "react";

import { IconeFigma } from "@/components/icone-figma";
import { RADIO_PAGINA } from "@/conteudo/site";
import { duracaoPorExtenso, textoDaDuracao } from "@/lib/youtube/duracao";
import { cn } from "@/lib/utils";

/**
 * O endereço do player (E55, E61): domínio sem cookies do YouTube, toca ao abrir (a pessoa acabou de
 * clicar) e pede o português como idioma preferido das legendas, sem forçar a legenda ligada. O botão
 * CC só aparece se o vídeo tiver legendas no YouTube.
 */
export function enderecoDoPlayer(youtubeId: string): string {
  const p = new URLSearchParams({ autoplay: "1", cc_lang_pref: "pt", hl: "pt-BR", rel: "0", playsinline: "1" });
  return `https://www.youtube-nocookie.com/embed/${youtubeId}?${p}`;
}

type Tocando = { id: string | null; tocar: (id: string) => void };
const ContextoTocando = React.createContext<Tocando | null>(null);

/**
 * Um player por vez na página (E61): tocar outro fecha o que estava tocando. Conta o player, não o
 * vídeo: o topo e o cartão do mesmo episódio são dois players.
 */
export function ProvedorDoPlayer({ children }: { children: React.ReactNode }) {
  const [id, setId] = React.useState<string | null>(null);
  const valor = React.useMemo(() => ({ id, tocar: setId }), [id]);
  return <ContextoTocando.Provider value={valor}>{children}</ContextoTocando.Provider>;
}

export type EpisodioNoPlayer = {
  youtubeId: string;
  numero: number;
  titulo: string;
  capaUrl: string;
  duracaoSeg: number | null;
};

/**
 * O player sob demanda (RN17, CA-US04.1, CA-US04.2): antes do clique, só a capa (pela nossa rota, sem
 * falar com o Google, E56) e o botão de tocar; no clique, o iframe do YouTube entra no lugar e toca,
 * com o foco nele. No topo, o selo “Ep. 42 · Último programa”; no cartão, a duração.
 */
export function PlayerYoutube({
  episodio,
  variante,
  selo,
  className,
}: {
  episodio: EpisodioNoPlayer;
  variante: "topo" | "cartao";
  /** Selo no canto (só no topo): “Ep. 42 · Último programa”. */
  selo?: string;
  className?: string;
}) {
  const contexto = React.useContext(ContextoTocando);
  const [sozinho, setSozinho] = React.useState(false);
  const meuId = React.useId();
  const tocando = contexto ? contexto.id === meuId : sozinho;
  const quadro = React.useRef<HTMLIFrameElement>(null);
  const [pediuAgora, setPediuAgora] = React.useState(false);

  React.useEffect(() => {
    if (tocando && pediuAgora) quadro.current?.focus();
  }, [tocando, pediuAgora]);

  const tocar = () => {
    setPediuAgora(true);
    if (contexto) contexto.tocar(meuId);
    else setSozinho(true);
  };
  const nome = `Ep. ${episodio.numero} — ${episodio.titulo}`;

  return (
    <div className={cn("relative aspect-video w-full overflow-hidden bg-fundo-marinho-profundo", className)}>
      {tocando ? (
        <iframe
          ref={quadro}
          src={enderecoDoPlayer(episodio.youtubeId)}
          title={`${nome} (player do YouTube)`}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          data-testid="player-youtube"
          className="absolute inset-0 size-full border-0"
        />
      ) : (
        <button
          type="button"
          onClick={tocar}
          aria-label={`${RADIO_PAGINA.ouvirAgora}: ${nome}`}
          className="group absolute inset-0 flex items-center justify-center outline-none focus-visible:ring-[3px] focus-visible:ring-destaque-amarelo focus-visible:ring-inset"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- capa pela nossa rota ou pela Mídia */}
          <img src={episodio.capaUrl} alt="" loading={variante === "topo" ? "eager" : "lazy"} className="absolute inset-0 size-full object-cover" />
          {variante === "topo" ? <span aria-hidden className="absolute inset-0 bg-fundo-sobreposicao" /> : null}
          {/* O botão de tocar do Figma (157:8416): 72 px no topo, menor no cartão. */}
          {/* eslint-disable-next-line @next/next/no-img-element -- ícone do Figma, duas cores */}
          <img
            src="/site/radio/reproduzir.svg"
            alt=""
            width={72}
            height={72}
            className={cn(
              "relative transition-transform group-hover:scale-105 motion-reduce:transition-none",
              // No cartão o botão fica sempre à vista: quem chega pelo celular não tem o “passar o mouse”.
variante === "topo" ? "size-14 sm:size-[72px]" : "size-12 drop-shadow-md",
            )}
          />
          {selo ? (
            <span className="absolute top-3 left-3 flex items-center gap-2 rounded-full bg-fundo-marinho-profundo py-1.5 pr-3 pl-2.5 texto-etiqueta text-texto-invertido uppercase sm:top-4 sm:left-4">
              <IconeFigma src="/site/icone-youtube.svg" tamanho={16} />
              {selo}
            </span>
          ) : null}
          {variante === "cartao" && episodio.duracaoSeg ? (
            <span className="absolute right-3 bottom-3 rounded-[6px] bg-fundo-marinho-profundo px-2 py-1 texto-etiqueta text-texto-invertido">
              <span aria-hidden>{textoDaDuracao(episodio.duracaoSeg)}</span>
              <span className="sr-only">{duracaoPorExtenso(episodio.duracaoSeg)}</span>
            </span>
          ) : null}
        </button>
      )}
    </div>
  );
}
