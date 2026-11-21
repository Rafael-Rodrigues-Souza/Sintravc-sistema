import { IconeFigma } from "@/components/icone-figma";
import { TextoDoSite } from "@/components/site/texto-do-site";
import { Button } from "@/components/ui/button";
import { NOTICIA_LATERAL } from "@/conteudo/site";

/**
 * “Precisa de orientação?” (Figma 100:15318; E59). O texto depende do sindicato (D10): até lá,
 * o marcador visível. O botão abre a conversa com a recepção no WhatsApp.
 */
export function PrecisaDeOrientacao({ linkWhatsApp }: { linkWhatsApp: string }) {
  const t = NOTICIA_LATERAL;
  return (
    <section aria-labelledby="precisa-de-orientacao" className="flex flex-col items-start gap-4 rounded-[24px] bg-fundo-marinho p-8">
      <span aria-hidden className="flex size-14 items-center justify-center rounded-full bg-destaque-amarelo text-destaque-marinho-fixo">
        <IconeFigma src="/site/icone-juridico.svg" tamanho={26} />
      </span>
      <h2 id="precisa-de-orientacao" className="texto-titulo-card-grande text-texto-invertido">
        {t.orientacaoTitulo}
      </h2>
      <p className="texto-corpo text-texto-invertido-sec">
        <TextoDoSite texto={t.orientacaoTexto} />
      </p>
      <Button asChild className="mt-1">
        <a href={linkWhatsApp} target="_blank" rel="noopener noreferrer">
          <IconeFigma src="/site/icone-whatsapp.svg" tamanho={18} />
          {t.orientacaoAcao}
        </a>
      </Button>
    </section>
  );
}

/** “Receba as notícias no WhatsApp” (Figma 100:15325): só aparece quando o sindicato tem canal (E57). */
export function CanalNoWhatsApp({ linkCanal }: { linkCanal: string }) {
  const t = NOTICIA_LATERAL;
  return (
    <section aria-labelledby="canal-no-whatsapp" className="flex flex-col items-start gap-3.5 rounded-[24px] bg-fundo-superficie-alt p-7">
      <span aria-hidden className="flex size-12 items-center justify-center rounded-full bg-destaque-azul-suave text-destaque-azul">
        <IconeFigma src="/site/icone-sino.svg" tamanho={22} />
      </span>
      <h2 id="canal-no-whatsapp" className="texto-titulo-card text-texto-primario">
        {t.canalTitulo}
      </h2>
      <p className="texto-pequeno text-texto-secundario">{t.canalTexto}</p>
      <Button asChild variant="secundario">
        <a href={linkCanal} target="_blank" rel="noopener noreferrer">
          <IconeFigma src="/site/icone-whatsapp.svg" tamanho={18} />
          {t.canalAcao}
        </a>
      </Button>
    </section>
  );
}
