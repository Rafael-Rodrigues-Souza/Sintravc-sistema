import type { Metadata } from "next";
import Link from "next/link";

import { IconeFigma } from "@/components/icone-figma";
import { LINKS } from "@/components/site/navegacao";
import { Eyebrow, Migalhas } from "@/components/site/partes-da-pagina";
import { Button } from "@/components/ui/button";
import { COMUNICADOS_PAGINA } from "@/conteudo/site";
import { comunicadosNoAr } from "@/lib/comunicados/faixa";
import { dataHoraNaBahia } from "@/lib/datas";

export const metadata: Metadata = {
  title: "Comunicados",
  description: "Os avisos do SINTRAVC que estão no ar agora: horários, assembleias e outros recados do sindicato.",
};

/**
 * Comunicados (E58; sem frame no Figma). Todos os comunicados no ar agora, na ordem da fila,
 * inclusive os que a pessoa fechou pelo X da faixa: o X só esconde a faixa. Cada um aparece inteiro,
 * com o “Saiba mais” e até quando fica no ar. Sem nenhum, o vazio do E23.
 */
export default async function PaginaComunicados() {
  const comunicados = await comunicadosNoAr();
  const t = COMUNICADOS_PAGINA;

  return (
    <>
      <section aria-labelledby="titulo-pagina" className="bg-fundo-superficie-alt">
        <div className="conteudo-site flex flex-col gap-4 pt-8 pb-8 lg:pt-12 lg:pb-12">
          <Migalhas itens={[{ rotulo: "Início", href: "/" }, { rotulo: LINKS.comunicados.rotulo }]} />
          <Eyebrow className="mt-2">{t.eyebrow}</Eyebrow>
          <h1 id="titulo-pagina" className="texto-titulo-secao-mobile text-texto-primario lg:texto-titulo-secao">
            {t.titulo}
          </h1>
          <p className="max-w-[640px] texto-corpo text-texto-secundario">{t.texto}</p>
        </div>
      </section>

      <div className="conteudo-site py-10 lg:py-14">
        {comunicados.length === 0 ? (
          <section className="mx-auto flex max-w-[560px] flex-col items-center gap-3 rounded-[16px] border border-borda-padrao bg-fundo-superficie px-6 py-10 text-center">
            <span className="flex size-16 items-center justify-center rounded-full bg-status-neutro-fundo text-texto-secundario">
              <IconeFigma src="/site/comunicado-megafone.svg" tamanho={28} />
            </span>
            <h2 className="texto-titulo-card text-texto-primario">{t.vazioTitulo}</h2>
            <p className="max-w-[420px] texto-pequeno text-texto-secundario">{t.vazioTexto}</p>
            <Button asChild variant="secundario" className="mt-1">
              <Link href={LINKS.inicio.href}>{t.vazioAcao}</Link>
            </Button>
          </section>
        ) : (
          <ol aria-label="Comunicados no ar, na ordem da fila" className="mx-auto flex max-w-3xl flex-col gap-4 lg:gap-5">
            {comunicados.map((c) => (
              <li key={c.id}>
                <article
                  aria-labelledby={`comunicado-${c.id}`}
                  className="flex flex-col gap-4 rounded-[20px] bg-destaque-amarelo p-5 text-destaque-marinho-fixo lg:p-8"
                >
                  <p className="flex items-center gap-2 texto-eyebrow uppercase">
                    <IconeFigma src="/site/comunicado-megafone.svg" tamanho={18} />
                    Comunicado
                  </p>
                  <p id={`comunicado-${c.id}`} className="texto-titulo-card break-words">
                    {c.mensagem}
                  </p>
                  <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
                    <p className="texto-pequeno">
                      No ar até <time dateTime={c.fim.toISOString()}>{dataHoraNaBahia(c.fim)}</time>
                    </p>
                    {c.link ? (
                      <a
                        href={c.link.href}
                        {...(c.link.externo ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                        className="alvo-toque flex items-center gap-1.5 rounded-[6px] texto-botao underline underline-offset-2 outline-none focus-visible:ring-[3px] focus-visible:ring-destaque-marinho-fixo"
                      >
                        Saiba mais
                        <span className="sr-only">: {c.mensagem}</span>
                        {c.link.externo ? <span className="sr-only"> (abre em outra aba)</span> : null}
                        <IconeFigma src="/site/comunicado-seta-direita.svg" tamanho={16} />
                      </a>
                    ) : null}
                  </div>
                </article>
              </li>
            ))}
          </ol>
        )}
      </div>
    </>
  );
}
