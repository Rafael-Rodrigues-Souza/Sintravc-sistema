import Link from "next/link";

import { Alerta } from "@/components/ui/alerta";
import type { TextoJuridico } from "@/conteudo/juridico";
import { PAGINA_LEGAL } from "@/conteudo/site";
import { cn } from "@/lib/utils";

import { POLITICA, TERMOS } from "./navegacao";
import { Eyebrow, Migalhas } from "./partes-da-pagina";
import { Marcador, TextoDoSite } from "./texto-do-site";

/**
 * Modelo da Política de privacidade (Figma 159:8912 / 159:9121) e dos Termos de uso, que não têm frame
 * e usam o mesmo modelo (D6). O texto vem de src/conteudo/juridico.ts, escrito pelo advogado.
 */
export function PaginaLegal({ titulo, href, texto }: { titulo: string; href: string; texto: TextoJuridico }) {
  const { secoes } = texto;
  return (
    <>
      <section aria-labelledby="titulo-pagina" className="bg-fundo-superficie-alt">
        <div className="conteudo-site flex flex-col gap-4 pt-8 lg:pt-12">
          <Migalhas itens={[{ rotulo: "Início", href: "/" }, { rotulo: titulo }]} />
          <Eyebrow className="mt-2">{PAGINA_LEGAL.eyebrow}</Eyebrow>
          <h1 id="titulo-pagina" className="texto-titulo-secao-mobile text-texto-primario lg:texto-titulo-secao">
            {titulo}
          </h1>
          <p className="texto-pequeno text-texto-secundario">
            Atualizada em <TextoDoSite texto={texto.atualizadoEm} />
          </p>
          <nav aria-label="Documentos legais" className="mt-2">
            <ul className="flex gap-6">
              {[POLITICA, TERMOS].map((item) => {
                const ativo = item.href === href;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={ativo ? "page" : undefined}
                      className={cn(
                        "texto-navegacao flex min-h-12 items-center border-b-[3px] outline-none focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:ring-inset",
                        ativo ? "border-destaque-amarelo text-texto-primario" : "border-transparent text-texto-secundario hover:text-texto-primario",
                      )}
                    >
                      {item.rotulo}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </section>

      <div className={cn("conteudo-site grid gap-8 py-10 lg:gap-16 lg:py-14", secoes.length > 0 && "lg:grid-cols-[220px_1fr]")}>
        {secoes.length > 0 ? (
          <nav aria-label="Nesta página" className="lg:sticky lg:top-28 lg:self-start">
            <p className="texto-eyebrow mb-3 text-texto-terciario">Nesta página</p>
            <ol className="texto-pequeno flex flex-col gap-1">
              {secoes.map((s, i) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="alvo-toque inline-flex min-h-8 items-center rounded-sm text-texto-secundario outline-none hover:text-destaque-azul focus-visible:ring-2 focus-visible:ring-ring">
                    {i + 1}. {s.titulo}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        ) : null}
        <div className="flex max-w-[760px] flex-col gap-8">
          <Alerta tipo="informacao" titulo={PAGINA_LEGAL.alertaTitulo}>
            {PAGINA_LEGAL.alertaTexto}
          </Alerta>
          {secoes.length > 0 ? (
            secoes.map((s, i) => (
              <section key={s.id} aria-labelledby={s.id} className="flex flex-col gap-3">
                <h2 id={s.id} className="texto-titulo-card-grande scroll-mt-28 text-texto-primario">
                  {i + 1}. {s.titulo}
                </h2>
                {s.paragrafos.map((p) => (
                  <p key={p} className="texto-corpo text-texto-secundario">
                    {p}
                  </p>
                ))}
              </section>
            ))
          ) : (
            <p className="texto-corpo">
              <Marcador>[Texto a definir pelo advogado do sindicato]</Marcador>
            </p>
          )}
        </div>
      </div>
    </>
  );
}
