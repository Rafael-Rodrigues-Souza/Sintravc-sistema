"use client";

import { Scan, ZoomIn, ZoomOut } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import * as React from "react";

import { IconeFigma } from "@/components/icone-figma";
import { enquadramentoDaImagem } from "@/lib/midia/apresentacao";
import {
  alternarZoom,
  ehToqueDuplo,
  escalaDaPinca,
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
/** Um dedo que andou mais que isto (px) arrastou: não conta como toque. */
const FOLGA_DO_TOQUE = 10;
/** Marca, no history.state, da entrada que o visualizador acrescenta ao abrir (o voltar do celular fecha). */
const CHAVE_NO_HISTORICO = "visualizadorDaMidia";

const CENTRO: Ponto = { x: 0, y: 0 };
const distancia = (a: Ponto, b: Ponto) => Math.hypot(a.x - b.x, a.y - b.y);
const meio = (a: Ponto, b: Ponto): Ponto => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const marcaNoHistorico = (): unknown =>
  (window.history.state as Record<string, unknown> | null)?.[CHAVE_NO_HISTORICO];

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

/**
 * Visualizador de imagem da Mídia (E53): a imagem inteira em tela cheia, sobre o painel, com zoom.
 * Não tem frame no Figma: segue o Dialog do E23 e, no celular, o padrão do E50 (topo compacto, ações
 * ao alcance do polegar). É uma janela por cima da Mídia, como o visualizador de imagens do Gmail: o
 * fundo escurece a tela, mas deixa a Mídia aparecer atrás, e as barras têm fundo próprio, opaco, para o
 * contraste AA não depender do que está atrás. Um clique simples no fundo, fora da imagem, fecha.
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
  // O voltar do celular fecha o visualizador, sem sair da página: ao abrir, entra uma entrada no
  // histórico, marcada com o código desta abertura, e o voltar a tira e fecha. Fechar pelo X ou pelo
  // Esc também tira a entrada (history.back), para não sobrar um “voltar” que não faz nada.
  const abertura = React.useRef<string | null>(null);
  const fechar = React.useEffectEvent(() => {
    abertura.current = null;
    aoMudar(false);
  });
  React.useEffect(() => {
    if (!aberto) return;
    abertura.current ??= `${Date.now()}-${Math.random()}`;
    const minha = abertura.current;
    // No modo estrito do React o efeito roda duas vezes: a entrada só entra uma vez.
    if (marcaNoHistorico() !== minha) {
      window.history.pushState({ ...(window.history.state as object | null), [CHAVE_NO_HISTORICO]: minha }, "");
    }
    const aoVoltar = () => {
      if (marcaNoHistorico() !== minha) fechar();
    };
    window.addEventListener("popstate", aoVoltar);
    return () => window.removeEventListener("popstate", aoVoltar);
  }, [aberto]);

  function mudar(novo: boolean) {
    if (novo) aoMudar(true);
    // Fecha pelo histórico: quem fecha de fato é o popstate acima.
    else if (abertura.current && marcaNoHistorico() === abertura.current) window.history.back();
    else fechar();
  }

  return (
    <DialogPrimitive.Root open={aberto} onOpenChange={mudar}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Content
          data-slot="visualizador-imagem"
          onCloseAutoFocus={(evento) => {
            evento.preventDefault();
            aoDevolverFoco();
          }}
          className="fixed inset-0 z-50 flex flex-col bg-fundo-visualizador text-texto-invertido outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 motion-reduce:animate-none"
        >
          {/* Só existe com o diálogo aberto: cada abertura começa ajustada à tela. */}
          <ImagemComZoom imagem={imagem} aoFecharPeloFundo={() => mudar(false)} />
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

type Gesto =
  | { tipo: "arraste"; id: number; inicio: Ponto; vista: Vista }
  | { tipo: "pinca"; distancia: number; centro: Ponto; vista: Vista };

function ImagemComZoom({ imagem, aoFecharPeloFundo }: { imagem: ImagemParaVer; aoFecharPeloFundo: () => void }) {
  const { fundo } = enquadramentoDaImagem(imagem.mostrarInteira);
  const [vista, setVista] = React.useState<Vista>(VISTA_INICIAL);
  const [arrastando, setArrastando] = React.useState(false);
  // A área recebe os gestos e corta a imagem ampliada nas bordas da tela. A moldura, dentro dela, é
  // onde a imagem fica centralizada em 100%: reserva embaixo o espaço da barra do zoom, para ela não
  // cobrir a imagem. As medidas do zoom são da moldura.
  const area = React.useRef<HTMLDivElement>(null);
  const moldura = React.useRef<HTMLDivElement>(null);
  const foto = React.useRef<HTMLImageElement>(null);

  // Gestos por Pointer Events (mouse, caneta e dedos): um ponteiro arrasta a imagem ampliada, dois
  // fazem a pinça. A área tem touch-action: none: o navegador não rola nem dá zoom na página.
  const dedos = React.useRef(new Map<number, Ponto>());
  const gesto = React.useRef<Gesto | null>(null);
  // O toque duplo é feito aqui: com touch-action: none, o navegador não gera dblclick confiável no toque.
  const toque = React.useRef<{ inicio: Ponto; moveu: boolean; foraDaImagem: boolean } | null>(null);
  // Clique simples no fundo: começou fora da imagem, não andou e não virou pinça. Quem fecha é o click
  // (depois do pointerup), para o toque não chegar à Mídia por baixo depois que o visualizador some.
  const cliqueNoFundo = React.useRef(false);
  const ultimoToque = React.useRef<{ tempo: number; x: number; y: number } | null>(null);
  const ultimoPonteiro = React.useRef("mouse");

  const medidas = () => medir(foto.current, moldura.current);
  const zoom = (escala: (atual: number) => number, ponto: Ponto = CENTRO) =>
    setVista((v) => zoomNoPonto(v, escala(v.escala), ponto, medidas()));
  const mover = (dx: number, dy: number) =>
    setVista((v) => limitarDeslocamento({ ...v, x: v.x + dx, y: v.y + dy }, medidas()));
  // As ações dos botões e do teclado, escritas uma vez só.
  const aumentar = () => zoom((e) => e * ZOOM.passo);
  const diminuir = () => zoom((e) => e / ZOOM.passo);
  const ajustarATela = () => setVista(VISTA_INICIAL);

  // A roda do mouse dá zoom no ponto do cursor. O ouvinte não pode ser passivo, para a página
  // não rolar nem dar zoom junto; por isso é registrado aqui, e não no onWheel do React.
  const naRoda = React.useEffectEvent((evento: WheelEvent) => {
    evento.preventDefault();
    const caixa = moldura.current;
    if (!caixa) return;
    const fator = Math.exp(-evento.deltaY * SENSIBILIDADE_DA_RODA);
    zoom((e) => e * fator, pontoNaArea(caixa, evento.clientX, evento.clientY));
  });
  React.useEffect(() => {
    const no = area.current;
    if (!no) return;
    no.addEventListener("wheel", naRoda, { passive: false });
    return () => no.removeEventListener("wheel", naRoda);
  }, []);

  /** Arraste só com a imagem ampliada: em 100% não há o que mover. */
  function comecarArraste(id: number, inicio: Ponto, atual: Vista) {
    const ampliada = atual.escala > ZOOM.minimo;
    gesto.current = ampliada ? { tipo: "arraste", id, inicio, vista: atual } : null;
    setArrastando(ampliada);
  }

  function aoApertar(evento: React.PointerEvent<HTMLDivElement>) {
    ultimoPonteiro.current = evento.pointerType;
    if (evento.pointerType === "mouse" && evento.button !== 0) return;
    evento.currentTarget.setPointerCapture(evento.pointerId);
    const ponto = { x: evento.clientX, y: evento.clientY };
    dedos.current.set(evento.pointerId, ponto);
    if (dedos.current.size === 1) {
      toque.current = { inicio: ponto, moveu: false, foraDaImagem: evento.target !== foto.current };
      comecarArraste(evento.pointerId, ponto, vista);
    } else if (dedos.current.size === 2) {
      toque.current = null;
      const [a, b] = [...dedos.current.values()] as [Ponto, Ponto];
      gesto.current = { tipo: "pinca", distancia: distancia(a, b), centro: meio(a, b), vista };
      setArrastando(true);
    }
  }

  function aoMover(evento: React.PointerEvent<HTMLDivElement>) {
    if (!dedos.current.has(evento.pointerId)) return;
    const ponto = { x: evento.clientX, y: evento.clientY };
    dedos.current.set(evento.pointerId, ponto);
    if (toque.current && distancia(ponto, toque.current.inicio) > FOLGA_DO_TOQUE) toque.current.moveu = true;

    const atual = gesto.current;
    if (atual?.tipo === "pinca" && dedos.current.size >= 2) {
      const [a, b] = [...dedos.current.values()] as [Ponto, Ponto];
      const centro = meio(a, b);
      const escala = escalaDaPinca(atual.vista.escala, atual.distancia, distancia(a, b));
      // Zoom no ponto onde a pinça começou e, junto, o quanto os dedos andaram.
      const inicio = pontoNaArea(moldura.current!, atual.centro.x, atual.centro.y);
      const ampliada = zoomNoPonto(atual.vista, escala, inicio, medidas());
      const dx = centro.x - atual.centro.x;
      const dy = centro.y - atual.centro.y;
      setVista(limitarDeslocamento({ ...ampliada, x: ampliada.x + dx, y: ampliada.y + dy }, medidas()));
    } else if (atual?.tipo === "arraste" && atual.id === evento.pointerId) {
      const { vista: inicial, inicio } = atual;
      const x = inicial.x + ponto.x - inicio.x;
      const y = inicial.y + ponto.y - inicio.y;
      setVista(limitarDeslocamento({ ...inicial, x, y }, medidas()));
    }
  }

  function aoSoltar(evento: React.PointerEvent<HTMLDivElement>) {
    if (!dedos.current.delete(evento.pointerId)) return;
    const atual = gesto.current;
    const restante = [...dedos.current.entries()][0];
    if (atual?.tipo === "pinca") {
      // Tirou um dedo da pinça: o outro continua arrastando.
      if (restante) comecarArraste(restante[0], restante[1], vista);
      else {
        gesto.current = null;
        setArrastando(false);
      }
    } else if (atual?.tipo === "arraste" && atual.id === evento.pointerId) {
      gesto.current = null;
      setArrastando(false);
    }

    const simples = evento.type === "pointerup" && !restante && toque.current?.moveu === false;
    cliqueNoFundo.current = simples && toque.current?.foraDaImagem === true;
    const foiToque = simples && evento.pointerType === "touch" && !cliqueNoFundo.current;
    if (foiToque) {
      const agora = { tempo: evento.timeStamp, x: evento.clientX, y: evento.clientY };
      if (ehToqueDuplo(ultimoToque.current, agora)) {
        ultimoToque.current = null;
        const ponto = pontoNaArea(moldura.current!, agora.x, agora.y);
        setVista((v) => alternarZoom(v, ponto, medidas()));
      } else {
        ultimoToque.current = agora;
      }
    }
    if (!restante) toque.current = null;
  }

  // O teclado vale em qualquer ponto do visualizador: depois de um clique na imagem, o foco fica no
  // próprio diálogo (fora deste componente). Como ele é modal e este componente só existe com ele
  // aberto, as teclas são ouvidas no documento.
  const aoTeclar = React.useEffectEvent((evento: KeyboardEvent) => {
    const acoes: Record<string, () => void> = {
      "+": aumentar,
      "=": aumentar,
      "-": diminuir,
      _: diminuir,
      "0": ajustarATela,
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
      <div className="relative z-10 flex items-center gap-3 bg-fundo-marinho-profundo px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <DialogPrimitive.Title title={imagem.nomeArquivo} className="min-w-0 flex-1 truncate texto-titulo-card-pequeno">
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
        onClick={() => {
          if (!cliqueNoFundo.current) return;
          cliqueNoFundo.current = false;
          aoFecharPeloFundo();
        }}
        onDoubleClick={(evento) => {
          // No toque, quem cuida é o toque duplo acima (o dblclick do toque contaria em dobro).
          if (ultimoPonteiro.current === "touch") return;
          const ponto = pontoNaArea(moldura.current!, evento.clientX, evento.clientY);
          setVista((v) => alternarZoom(v, ponto, medidas()));
        }}
        className={cn(
          "relative min-h-0 flex-1 touch-none overflow-hidden select-none",
          // No fundo, o cursor normal: um clique ali fecha. A lupa e a mão ficam na imagem.
          arrastando && "cursor-grabbing",
        )}
      >
        {/* Embaixo, a altura da barra do zoom (botões de 2,5rem + 0,375rem de cada lado = 3,25rem), o
            espaço dela até a borda e uma folga. Fora da imagem, os toques passam para a área (fundo). */}
        <div
          ref={moldura}
          className="pointer-events-none absolute inset-x-4 top-4 bottom-[calc(3.25rem+max(1rem,env(safe-area-inset-bottom))+0.5rem)] flex items-center justify-center"
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
              "pointer-events-auto max-h-full max-w-full object-contain will-change-transform",
              ampliada ? (arrastando ? "cursor-grabbing" : "cursor-grab") : "cursor-zoom-in",
              !arrastando && "transition-transform duration-150 ease-out motion-reduce:transition-none",
              fundo,
            )}
          />
        </div>
      </div>

      {/* Zoom embaixo, ao alcance do polegar (E50). */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div
          role="group"
          aria-label="Zoom"
          className="pointer-events-auto flex items-center gap-1 rounded-full bg-fundo-marinho-profundo p-1.5 ring-1 ring-sobre-escuro-borda"
        >
          <BotaoDoZoom rotulo="Diminuir o zoom" disabled={!ampliada} onClick={diminuir}>
            <ZoomOut aria-hidden />
          </BotaoDoZoom>
          <span role="status" className="w-14 text-center texto-pequeno tabular-nums">
            {porcentagem}
          </span>
          <BotaoDoZoom
            rotulo="Aumentar o zoom"
            disabled={vista.escala >= ZOOM.maximo}
            onClick={aumentar}
          >
            <ZoomIn aria-hidden />
          </BotaoDoZoom>
          <BotaoDoZoom rotulo="Ajustar à tela" disabled={!ampliada} onClick={ajustarATela}>
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
