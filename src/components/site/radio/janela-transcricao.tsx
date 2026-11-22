"use client";

import { Dialog as DialogPrimitive } from "radix-ui";
import * as React from "react";

import { IconeFigma } from "@/components/icone-figma";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useFecharPeloVoltar } from "@/components/use-fechar-pelo-voltar";
import { RADIO_PAGINA } from "@/conteudo/site";
import { cn } from "@/lib/utils";

const botaoNoEscuro =
  "alvo-toque flex size-10 shrink-0 items-center justify-center rounded-full bg-sobre-escuro-chip outline-none hover:bg-sobre-escuro-borda focus-visible:ring-[3px] focus-visible:ring-texto-invertido";

type Estado = { tipo: "carregando" } | { tipo: "pronta"; texto: string } | { tipo: "erro" };

/**
 * “Ler transcrição” (E55): o link abre uma janela por cima da página, no estilo da janela dos
 * comunicados (E58), com rolagem própria. O texto só é pedido ao abrir (pode ter 150.000 caracteres).
 * Fecha pelo X, pelo Esc, por um toque fora e pelo voltar do celular; o foco volta para o link.
 */
export function LerTranscricao({ youtubeId, numero, titulo, className }: { youtubeId: string; numero: number; titulo: string; className?: string }) {
  const [aberta, setAberta] = React.useState(false);
  const [estado, setEstado] = React.useState<Estado>({ tipo: "carregando" });
  const gatilho = React.useRef<HTMLButtonElement>(null);
  const mudar = useFecharPeloVoltar(`transcricao-${youtubeId}`, aberta, setAberta);

  const carregar = React.useCallback(async () => {
    setEstado({ tipo: "carregando" });
    try {
      const resposta = await fetch(`/radio-chofer/transcricao/${youtubeId}`);
      if (!resposta.ok) throw new Error(String(resposta.status));
      setEstado({ tipo: "pronta", texto: await resposta.text() });
    } catch {
      setEstado({ tipo: "erro" });
    }
  }, [youtubeId]);

  const abrir = () => {
    setAberta(true);
    if (estado.tipo !== "pronta") void carregar();
  };

  return (
    <>
      <button
        ref={gatilho}
        type="button"
        onClick={abrir}
        aria-haspopup="dialog"
        className={cn(
          "alvo-toque self-start texto-pequeno font-semibold text-destaque-azul underline underline-offset-4 outline-none hover:no-underline focus-visible:ring-[3px] focus-visible:ring-ring",
          className,
        )}
      >
        {RADIO_PAGINA.lerTranscricao}
        <span className="sr-only"> do Ep. {numero}</span>
      </button>
      <DialogPrimitive.Root open={aberta} onOpenChange={mudar}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-fundo-visualizador data-[state=open]:animate-in data-[state=open]:fade-in-0 motion-reduce:animate-none" />
          <DialogPrimitive.Content
            data-testid="janela-transcricao"
            data-fundo
            onCloseAutoFocus={(evento) => {
              evento.preventDefault();
              gatilho.current?.focus();
            }}
            onClick={(evento) => {
              // Tocar fora (no fundo, fora do cartão e dos botões) fecha.
              if ((evento.target as HTMLElement).hasAttribute("data-fundo")) mudar(false);
            }}
            className="fixed inset-0 z-50 flex flex-col text-texto-invertido outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 motion-reduce:animate-none"
          >
            <div className="flex items-center gap-3 bg-fundo-marinho-profundo px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 lg:px-8">
              <DialogPrimitive.Title className="min-w-0 flex-1 texto-titulo-card">
                {RADIO_PAGINA.transcricao} · Ep. {numero}
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="sr-only">{`${titulo}. Esc fecha.`}</DialogPrimitive.Description>
              <DialogPrimitive.Close aria-label="Fechar" className={botaoNoEscuro}>
                <IconeFigma src="/painel/icone-fechar.svg" tamanho={18} />
              </DialogPrimitive.Close>
            </div>
            <div data-fundo className="flex min-h-0 flex-1 flex-col items-center px-4 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] lg:px-8">
              <article className="flex max-h-full w-full max-w-3xl min-h-0 flex-col gap-4 rounded-[20px] bg-fundo-superficie text-texto-primario">
                <p className="px-6 pt-6 texto-titulo-card break-words lg:px-10 lg:pt-8">{titulo}</p>
                <div className="min-h-0 overflow-y-auto px-6 pb-6 lg:px-10 lg:pb-8" tabIndex={0} aria-label={`${RADIO_PAGINA.transcricao} do Ep. ${numero}`}>
                  {estado.tipo === "carregando" ? (
                    <div aria-busy="true" aria-label={RADIO_PAGINA.transcricaoCarregando} className="flex flex-col gap-3">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-11/12" />
                      <Skeleton className="h-4 w-4/5" />
                    </div>
                  ) : estado.tipo === "erro" ? (
                    <div role="alert" className="flex flex-col items-start gap-3">
                      <p className="texto-corpo text-texto-secundario">{RADIO_PAGINA.transcricaoErro}</p>
                      <Button variant="secundario" size="pequeno" onClick={() => void carregar()}>
                        {RADIO_PAGINA.tentarDeNovo}
                      </Button>
                    </div>
                  ) : (
                    <p data-testid="texto-da-transcricao" className="texto-corpo break-words whitespace-pre-line text-texto-primario">
                      {estado.texto}
                    </p>
                  )}
                </div>
              </article>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  );
}
