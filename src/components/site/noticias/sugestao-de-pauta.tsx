import { IconeFigma } from "@/components/icone-figma";
import { Button } from "@/components/ui/button";
import { SUGESTAO_DE_PAUTA } from "@/conteudo/site";

/**
 * “Tem uma sugestão de pauta?” (Figma 80:991; E59): abre a conversa com a recepção no WhatsApp, sem
 * mensagem pronta, como o ícone da barra quando não há canal (E57).
 */
export function SugestaoDePauta({ linkWhatsApp }: { linkWhatsApp: string }) {
  const t = SUGESTAO_DE_PAUTA;
  return (
    <section
      aria-labelledby="sugestao-de-pauta"
      className="flex flex-col gap-5 rounded-[24px] bg-fundo-marinho px-6 py-8 sm:flex-row sm:items-center sm:gap-7 lg:rounded-[28px] lg:px-12 lg:py-10"
    >
      <span aria-hidden className="flex size-16 shrink-0 items-center justify-center rounded-[18px] bg-destaque-amarelo text-destaque-marinho-fixo">
        <IconeFigma src="/site/comunicado-megafone.svg" tamanho={30} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <h2 id="sugestao-de-pauta" className="texto-titulo-destaque-mobile text-texto-invertido lg:texto-titulo-card-grande">
          {t.titulo}
        </h2>
        <p className="texto-corpo text-texto-invertido-sec">{t.texto}</p>
      </div>
      <Button asChild className="w-full shrink-0 sm:w-auto">
        <a href={linkWhatsApp} target="_blank" rel="noopener noreferrer">
          <IconeFigma src="/site/icone-whatsapp.svg" tamanho={18} />
          {t.acao}
        </a>
      </Button>
    </section>
  );
}
