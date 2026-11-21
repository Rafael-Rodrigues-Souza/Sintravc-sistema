import Link from "next/link";

import { IconeFigma } from "@/components/icone-figma";
import { TextoDoSite } from "@/components/site/texto-do-site";
import { Button } from "@/components/ui/button";
import { DOCUMENTOS_PAGINA } from "@/conteudo/site";

const caixaDoIcone = "flex size-12 items-center justify-center rounded-[14px]";

/** “Transparência e informação” (Figma 73:1075): cartão marinho da lateral de Editais. */
export function Transparencia() {
  const t = DOCUMENTOS_PAGINA.transparencia;
  return (
    <section aria-labelledby="transparencia" className="flex flex-col items-start gap-3.5 rounded-[24px] bg-fundo-marinho p-7">
      <span aria-hidden className={`${caixaDoIcone} bg-destaque-amarelo text-destaque-marinho-fixo`}>
        <IconeFigma src="/site/icone-escudo-check.svg" tamanho={24} />
      </span>
      <h2 id="transparencia" className="texto-titulo-card text-texto-invertido">
        {t.titulo}
      </h2>
      <p className="texto-corpo text-texto-invertido-sec">{t.texto}</p>
    </section>
  );
}

/** “Receba os avisos no celular” (Figma 73:1082): só com o canal do WhatsApp na ConfigSite (E57). */
export function AvisosNoCelular({ linkCanal }: { linkCanal: string }) {
  const t = DOCUMENTOS_PAGINA.canal;
  return (
    <section aria-labelledby="avisos-no-celular" className="flex flex-col items-start gap-3.5 rounded-[24px] border border-borda-padrao bg-fundo-superficie p-7">
      <span aria-hidden className={`${caixaDoIcone} bg-destaque-azul-suave text-destaque-azul`}>
        <IconeFigma src="/site/icone-sino.svg" tamanho={24} />
      </span>
      <h2 id="avisos-no-celular" className="texto-titulo-card text-texto-primario">
        {t.titulo}
      </h2>
      <p className="texto-corpo text-texto-secundario">{t.texto}</p>
      <Button asChild className="w-full">
        <a href={linkCanal} target="_blank" rel="noopener noreferrer">
          <IconeFigma src="/site/icone-whatsapp.svg" tamanho={18} />
          {t.acao}
        </a>
      </Button>
    </section>
  );
}

/** “Não encontrou o que procura?” (Figma 73:1095): leva ao Contato. */
export function NaoEncontrou() {
  const t = DOCUMENTOS_PAGINA.naoEncontrou;
  return (
    <section aria-labelledby="nao-encontrou" className="flex flex-col items-start gap-3 rounded-[24px] bg-fundo-superficie-alt px-7 py-6">
      <h2 id="nao-encontrou" className="flex items-center gap-2.5 texto-titulo-card-pequeno text-texto-primario">
        <IconeFigma src="/site/icone-info.svg" tamanho={20} className="text-destaque-azul" />
        {t.titulo}
      </h2>
      <p className="texto-pequeno text-texto-secundario">{t.texto}</p>
      <Link
        href="/contato"
        className="alvo-toque inline-flex items-center gap-1.5 rounded-sm texto-botao text-destaque-azul outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring"
      >
        {t.acao}
        <IconeFigma src="/site/icone-seta-direita.svg" tamanho={16} />
      </Link>
    </section>
  );
}

/** “Como ler um acordo coletivo” (Figma 75:1793). */
export function ComoLer() {
  const t = DOCUMENTOS_PAGINA.comoLer;
  return (
    <section aria-labelledby="como-ler" className="flex flex-col items-start gap-4 rounded-[24px] border border-borda-padrao bg-fundo-superficie p-7">
      <span aria-hidden className={`${caixaDoIcone} bg-destaque-azul-suave text-destaque-azul`}>
        <IconeFigma src="/site/icone-documento.svg" tamanho={24} />
      </span>
      <h2 id="como-ler" className="texto-titulo-card text-texto-primario">
        {t.titulo}
      </h2>
      <ul className="flex flex-col gap-4">
        {t.passos.map((passo) => (
          <li key={passo} className="flex items-start gap-2.5 texto-pequeno text-texto-secundario">
            <span aria-hidden className="flex size-[22px] shrink-0 items-center justify-center rounded-full bg-destaque-amarelo text-destaque-marinho-fixo">
              <IconeFigma src="/site/icone-check.svg" tamanho={14} />
            </span>
            {passo}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** “Tem dúvidas sobre um acordo coletivo?” (Figma 75:1819): o texto é o marcador até o D10; o botão abre o WhatsApp da recepção (E59). */
export function DuvidasSobreAcordo({ linkWhatsApp }: { linkWhatsApp: string }) {
  const t = DOCUMENTOS_PAGINA.duvidas;
  return (
    <section aria-labelledby="duvidas-acordo" className="flex flex-col items-start gap-3.5 rounded-[24px] bg-fundo-marinho p-7">
      <span aria-hidden className={`${caixaDoIcone} bg-destaque-amarelo text-destaque-marinho-fixo`}>
        <IconeFigma src="/site/icone-balanca.svg" tamanho={24} />
      </span>
      <h2 id="duvidas-acordo" className="texto-titulo-card text-texto-invertido">
        {t.titulo}
      </h2>
      <p className="texto-corpo text-texto-invertido-sec">
        <TextoDoSite texto={t.texto} />
      </p>
      <Button asChild className="mt-1 w-full">
        <a href={linkWhatsApp} target="_blank" rel="noopener noreferrer">
          <IconeFigma src="/site/icone-whatsapp.svg" tamanho={18} />
          {t.acao}
        </a>
      </Button>
    </section>
  );
}

/** Aviso “Importante” abaixo da lista de Acordos (Figma 75:1784). */
export function AvisoImportante() {
  const t = DOCUMENTOS_PAGINA.importante;
  return (
    <aside aria-labelledby="aviso-importante" className="flex items-start gap-3.5 rounded-[16px] bg-destaque-azul-suave p-5">
      <IconeFigma src="/site/icone-info.svg" tamanho={22} className="mt-px text-destaque-azul" />
      <div className="flex flex-col gap-1">
        <h2 id="aviso-importante" className="texto-titulo-card-pequeno text-texto-primario">
          {t.titulo}
        </h2>
        <p className="texto-pequeno text-texto-secundario">{t.texto}</p>
      </div>
    </aside>
  );
}
