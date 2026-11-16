"use client";

import { Scan, ZoomIn, ZoomOut } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import * as React from "react";

import { IconeFigma } from "@/components/icone-figma";
import { enquadramentoDaImagem } from "@/lib/midia/apresentacao";
import {
  alternarZoom,
  limitarDeslocamento,
  VISTA_INICIAL,
  ZOOM,
  zoomNoPonto,
  type Medidas,
  type Ponto,
  type Vista,
} from "@/lib/midia/zoom";
import { cn } from "@/lib/utils";

export type ImagemParaVer = {
  url: string;
  nomeArquivo: string;
  alt: string | null;
  /** PNG ou WebP (logos): a imagem aparece sobre o xadrez, como na prévia (E48). */
  mostrarInteira: boolean;
};

/** Quanto uma seta do teclado move a imagem ampliada, em px. */
const PASSO_DA_SETA = 48;
/** Sensibilidade da roda do mouse: cada 100 de deltaY muda a escala em cerca de 22%. */
const SENSIBILIDADE_DA_RODA = 0.002;

/**
 * Visualizador de imagem da Mídia (E53): a imagem inteira em tela cheia, sobre o painel, com zoom.
 * Não tem frame no Figma: segue o Dialog do E23 e, no celular, o padrão do E50 (topo compacto, ações
 * ao alcance do polegar). O fundo é escuro nos dois temas, como em todo visualizador de fotos.
 * O cálculo do zoom fica em `@/lib/midia/zoom` (funções puras, testadas).
 */
/** A imagem em 100% (o tamanho do layout, sem o transform) e a área onde ela aparece. */
function medir(img: HTMLImageElement | null, caixa: HTMLElement | null): Medidas {
  return {
    imagem: { largura: img?.offsetWidth ?? 0, altura: img?.offsetHeight ?? 0 },
    area: { largura: caixa?.clientWidth ?? 0, altura: caixa?.clientHeight ?? 0 },
  };
}

/** Ponto da tela medido a partir do centro da área. */
function pontoNaArea(caixa: HTMLElement, clienteX: number, clienteY: number): Ponto {
  const r = caixa.getBoundingClientRect();
  return { x: clienteX - (r.left + r.width / 2), y: clienteY - (r.top + r.height / 2) };
}

const CENTRO: Ponto = { x: 0, y: 0 };

/**
 * Visualizador de imagem da Mídia (E53): a imagem inteira em tela cheia, sobre o painel, com zoom.
 * Não tem frame no Figma: segue o Dialog do E23 e, no celular, o padrão do E50 (topo compacto, ações
 * ao alcance do polegar). O fundo é escuro nos dois temas, como em todo visualizador de fotos.
 * O cálculo do zoom fica em `@/lib/midia/zoom` (funções puras, testadas).
 */
export function VisualizadorImagem({
  imagem,
  aberto,
  aoMudar,
  aoDevolverFoco,
}: {
  imagem: ImagemParaVer;
  aberto: boolean;
  aoMudar: (aberto: boolean) => void;
  /** Para onde o foco volta ao fechar: quem abriu (a prévia ou “Ver inteira”). */
  aoDevolverFoco: () => void;
}) {
  return (
    <DialogPrimitive.Root open={aberto} onOpenChange={aoMudar}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Content
          data-slot="visualizador-imagem"
          onCloseAutoFocus={(evento) => {
            evento.preventDefault();
            aoDevolverFoco();
          }}
          className="fixed inset-0 z-50 flex flex-col bg-fundo-marinho-profundo text-texto-invertido outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 motion-reduce:animate-none"
        >
          {/* Só existe com o diálogo aberto: cada abertura começa ajustada à tela. */}
          <ImagemComZoom imagem={imagem} />
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function ImagemComZoom({ imagem }: { imagem: ImagemParaVer }) {
  const { fundo } = enquadramentoDaImagem(imagem.mostrarInteira);
  const [vista, setVista] = React.useState<Vista>(VISTA_INICIAL);
  const [arrastando, setArrastando] = React.useState(false);
  const area = React.useRef<HTMLDivElement>(null);
  const foto = React.useRef<HTMLImageElement>(null);
  const arraste = React.useRef<{ id: number; inicio: Ponto; vista: Vista } | null>(null);

  const medidas = () => medir(foto.current, area.current);
  const zoom = (escala: (atual: number) => number, ponto: Ponto = CENTRO) =>
    setVista((v) => zoomNoPonto(v, escala(v.escala), ponto, medidas()));
  const mover = (dx: number, dy: number) =>
    setVista((v) => limitarDeslocamento({ ...v, x: v.x + dx, y: v.y + dy }, medidas()));

  // A roda do mouse dá zoom no ponto do cursor. O ouvinte não pode ser passivo, para a página
  // não rolar nem dar zoom junto; por isso é registrado aqui, e não no onWheel do React.
  React.useEffect(() => {
    const no = area.current;
    if (!no) return;
    const naRoda = (evento: WheelEvent) => {
      evento.preventDefault();
      const ponto = pontoNaArea(no, evento.clientX, evento.clientY);
      const fator = Math.exp(-evento.deltaY * SENSIBILIDADE_DA_RODA);
      setVista((v) => zoomNoPonto(v, v.escala * fator, ponto, medir(foto.current, no)));
    };
    no.addEventListener("wheel", naRoda, { passive: false });
    return () => no.removeEventListener("wheel", naRoda);
  }, []);

  function aoApertar(evento: React.PointerEvent<HTMLDivElement>) {
    if (evento.button !== 0 || vista.escala <= ZOOM.minimo) return;
    evento.currentTarget.setPointerCapture(evento.pointerId);
    arraste.current = { id: evento.pointerId, inicio: { x: evento.clientX, y: evento.clientY }, vista };
    setArrastando(true);
  }

  function aoMover(evento: React.PointerEvent<HTMLDivElement>) {
    const atual = arraste.current;
    if (!atual || atual.id !== evento.pointerId) return;
    const { vista: inicial, inicio } = atual;
    setVista(
      limitarDeslocamento(
        { ...inicial, x: inicial.x + evento.clientX - inicio.x, y: inicial.y + evento.clientY - inicio.y },
        medidas(),
      ),
    );
  }

  function aoSoltar(evento: React.PointerEvent<HTMLDivElement>) {
    if (arraste.current?.id !== evento.pointerId) return;
    arraste.current = null;
    setArrastando(false);
  }

  // O teclado vale em qualquer ponto do visualizador: depois de um clique na imagem, o foco fica no
  // próprio diálogo (fora deste componente). Como ele é modal e este componente só existe com ele
  // aberto, as teclas são ouvidas no documento.
  const aoTeclar = React.useEffectEvent((evento: KeyboardEvent) => {
    const acoes: Record<string, () => void> = {
      "+": () => zoom((e) => e * ZOOM.passo),
      "=": () => zoom((e) => e * ZOOM.passo),
      "-": () => zoom((e) => e / ZOOM.passo),
      _: () => zoom((e) => e / ZOOM.passo),
      "0": () => setVista(VISTA_INICIAL),
      // A seta mostra mais daquele lado: a imagem anda para o lado oposto.
      ArrowRight: () => mover(-PASSO_DA_SETA, 0),
      ArrowLeft: () => mover(PASSO_DA_SETA, 0),
      ArrowDown: () => mover(0, -PASSO_DA_SETA),
      ArrowUp: () => mover(0, PASSO_DA_SETA),
    };
    const acao = acoes[evento.key];
    if (!acao || evento.ctrlKey || evento.metaKey || evento.altKey || evento.defaultPrevented) return;
    evento.preventDefault();
    acao();
  });
  React.useEffect(() => {
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, []);

  const porcentagem = `${Math.round(vista.escala * 100)}%`;
  const ampliada = vista.escala > ZOOM.minimo;

  return (
    <>
      <div className="relative z-10 flex items-center gap-3 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <DialogPrimitive.Title className="min-w-0 flex-1 truncate texto-titulo-card-pequeno">
          {imagem.nomeArquivo}
        </DialogPrimitive.Title>
        <DialogPrimitive.Description className="sr-only">
          Use + e − para o zoom e as setas para mover a imagem ampliada. Esc fecha.
        </DialogPrimitive.Description>
        <DialogPrimitive.Close
          aria-label="Fechar a imagem"
          className="alvo-toque flex size-10 shrink-0 items-center justify-center rounded-full bg-sobre-escuro-chip outline-none hover:bg-sobre-escuro-borda focus-visible:ring-[3px] focus-visible:ring-ring"
        >
          <IconeFigma src="/painel/icone-fechar.svg" tamanho={18} />
        </DialogPrimitive.Close>
      </div>

      <div
        ref={area}
        onPointerDown={aoApertar}
        onPointerMove={aoMover}
        onPointerUp={aoSoltar}
        onPointerCancel={aoSoltar}
        onDoubleClick={(evento) => {
          const ponto = pontoNaArea(evento.currentTarget, evento.clientX, evento.clientY);
          setVista((v) => alternarZoom(v, ponto, medidas()));
        }}
        className={cn(
          "relative flex min-h-0 flex-1 touch-none items-center justify-center overflow-hidden p-4 select-none",
          ampliada ? (arrastando ? "cursor-grabbing" : "cursor-grab") : "cursor-zoom-in",
        )}
      >
        {/* A URL vem do armazenamento (R2/MinIO), fora do otimizador de imagens do Next. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={foto}
          src={imagem.url}
          alt={imagem.alt ?? ""}
          draggable={false}
          style={{ transform: `translate(${vista.x}px, ${vista.y}px) scale(${vista.escala})` }}
          className={cn(
            "max-h-full max-w-full object-contain will-change-transform",
            !arrastando && "transition-transform duration-150 ease-out motion-reduce:transition-none",
            fundo,
          )}
        />
      </div>

      {/* Zoom embaixo, ao alcance do polegar (E50). */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div
          role="group"
          aria-label="Zoom"
          className="pointer-events-auto flex items-center gap-1 rounded-full bg-fundo-marinho-profundo/85 p-1.5 ring-1 ring-sobre-escuro-borda backdrop-blur"
        >
          <BotaoDoZoom rotulo="Diminuir o zoom" disabled={!ampliada} onClick={() => zoom((e) => e / ZOOM.passo)}>
            <ZoomOut aria-hidden />
          </BotaoDoZoom>
          <span role="status" className="w-14 text-center texto-pequeno tabular-nums">
            {porcentagem}
          </span>
          <BotaoDoZoom
            rotulo="Aumentar o zoom"
            disabled={vista.escala >= ZOOM.maximo}
            onClick={() => zoom((e) => e * ZOOM.passo)}
          >
            <ZoomIn aria-hidden />
          </BotaoDoZoom>
          <BotaoDoZoom rotulo="Ajustar à tela" disabled={!ampliada} onClick={() => setVista(VISTA_INICIAL)}>
            <Scan aria-hidden />
          </BotaoDoZoom>
        </div>
      </div>
    </>
  );
}

function BotaoDoZoom({ rotulo, children, ...props }: React.ComponentProps<"button"> & { rotulo: string }) {
  return (
    <button
      type="button"
      aria-label={rotulo}
      title={rotulo}
      className="alvo-toque flex size-10 items-center justify-center rounded-full outline-none hover:bg-sobre-escuro-chip focus-visible:ring-[3px] focus-visible:ring-ring disabled:opacity-40 disabled:hover:bg-transparent [&_svg]:size-5"
      {...props}
    >
      {children}
    </button>
  );
}
