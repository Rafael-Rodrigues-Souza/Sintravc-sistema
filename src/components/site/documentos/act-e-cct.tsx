import { IconeFigma } from "@/components/icone-figma";
import { Eyebrow } from "@/components/site/partes-da-pagina";
import { DOCUMENTOS_PAGINA } from "@/conteudo/site";

/**
 * “Qual é a diferença?” no topo da lista de Acordos (Figma 75:1566 / 76:1801): a introdução marinho
 * e um cartão para ACT e outro para CCT. É o destino do botão “Entenda ACT e CCT” do topo. No
 * celular, os três empilhados; do `lg`, lado a lado.
 */
export function ActECct() {
  const t = DOCUMENTOS_PAGINA.actECct;
  return (
    <section id="entenda-act-e-cct" aria-labelledby="titulo-act-e-cct" className="conteudo-site grid scroll-mt-24 gap-4 pt-10 lg:grid-cols-[420px_1fr_1fr] lg:gap-5 lg:pt-16">
      <div className="flex flex-col gap-3.5 rounded-[24px] bg-fundo-marinho p-6 lg:p-9">
        <Eyebrow sobreEscuro>{t.eyebrow}</Eyebrow>
        <h2 id="titulo-act-e-cct" className="texto-titulo-card-grande text-texto-invertido">
          {t.titulo}
        </h2>
        <p className="texto-corpo text-texto-invertido-sec">{t.texto}</p>
      </div>
      <Conceito icone="/site/icone-predio.svg" {...t.act} />
      <Conceito icone="/site/icone-pessoas.svg" {...t.cct} />
    </section>
  );
}

function Conceito({ icone, sigla, nome, texto }: { icone: string; sigla: string; nome: string; texto: string }) {
  return (
    <div className="flex flex-col gap-3 rounded-[24px] border border-borda-padrao bg-fundo-superficie p-6 lg:p-8">
      {/* Celular: ícone ao lado da sigla e do nome. Do lg: ícone e sigla grande numa linha, o nome embaixo. */}
      <h3 className="grid grid-cols-[auto_1fr] items-center gap-x-3.5 lg:gap-y-4">
        <span aria-hidden className="row-span-2 flex size-[52px] items-center justify-center rounded-[14px] bg-destaque-azul-suave text-destaque-azul lg:row-span-1">
          <IconeFigma src={icone} tamanho={26} />
        </span>
        <span className="texto-titulo-card-grande text-texto-primario lg:texto-titulo-secao">{sigla}</span>
        <span className="col-start-2 texto-navegacao text-texto-secundario lg:col-span-2 lg:col-start-1 lg:texto-titulo-card lg:text-texto-primario">{nome}</span>
      </h3>
      <p className="texto-corpo text-texto-secundario">{texto}</p>
    </div>
  );
}
