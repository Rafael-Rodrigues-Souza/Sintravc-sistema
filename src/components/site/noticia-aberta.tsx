import { CalendarDays, Clock, FileText, Link2, MapPin } from "lucide-react";

import type { DocCorpo } from "@/lib/conteudos/dados";
import { dataHoraNaBahia } from "@/lib/datas";

import { CorpoMateria } from "./corpo-materia";

/** O que a página da notícia mostra. A prévia do painel (#9) e a página pública (#15) montam a partir do banco. */
export type NoticiaParaLer = {
  titulo: string;
  linhaFina: string;
  lide: string;
  corpo: DocCorpo;
  capa: { url: string; alt: string; legenda: string } | null;
  categoria: string | null;
  assinatura: string;
  local: string;
  /** Nula na prévia de algo nunca publicado: a data aparece como "Ainda não publicada". */
  publicadoEm: Date | null;
  /** Só quando houve alteração depois da publicação. */
  atualizadoEm: Date | null;
  minutosDeLeitura: number;
  palavrasChave: string[];
  links: { tipo: "fonte" | "anexo"; titulo: string; href: string }[];
};

/**
 * Notícia aberta (Figma 100:15159 e 100:15345). Usa container queries (`@container`): a mesma
 * peça se ajusta à largura de onde está, inclusive na moldura "Celular" da prévia (122:5800).
 */
export function NoticiaAberta({ noticia }: { noticia: NoticiaParaLer }) {
  const iniciais = noticia.assinatura
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
  const fontes = noticia.links;

  return (
    <article className="@container bg-fundo-pagina">
      <header className="bg-fundo-marinho px-4 pt-6 pb-8 text-texto-invertido @3xl:px-10 @3xl:pt-8 @3xl:pb-10">
        <div className="mx-auto flex max-w-[1120px] flex-col gap-4">
          <nav aria-label="Você está em" className="texto-pequeno text-texto-invertido-sec">
            <ol className="flex flex-wrap items-center gap-2">
              <li>Início</li>
              <li aria-hidden>›</li>
              <li>Notícias</li>
              {noticia.categoria ? (
                <>
                  <li aria-hidden>›</li>
                  <li className="text-texto-invertido">{noticia.categoria}</li>
                </>
              ) : null}
            </ol>
          </nav>
          {noticia.categoria ? (
            <p className="flex items-center gap-3 texto-eyebrow text-destaque-amarelo">
              <span aria-hidden className="h-0.5 w-6 bg-destaque-amarelo" />
              {noticia.categoria}
            </p>
          ) : null}
          <h1 className="texto-manchete-mobile text-texto-invertido @3xl:texto-manchete">{noticia.titulo}</h1>
          {noticia.linhaFina ? (
            <p className="texto-lide-mobile text-texto-invertido-sec @3xl:texto-linha-fina">{noticia.linhaFina}</p>
          ) : null}
          <div className="mt-2 flex flex-col gap-4 border-t border-sobre-escuro-divisor pt-5 @3xl:flex-row @3xl:flex-wrap @3xl:items-center @3xl:gap-6">
            <div className="flex items-center gap-3">
              <span aria-hidden className="flex size-11 items-center justify-center rounded-full bg-destaque-amarelo texto-botao text-destaque-amarelo-texto">
                {iniciais}
              </span>
              <div className="flex flex-col">
                <p className="texto-corpo">
                  <span className="text-texto-invertido-sec">Por </span>
                  <span className="font-semibold">{noticia.assinatura}</span>
                </p>
                {noticia.local ? (
                  <p className="flex items-center gap-1.5 texto-pequeno text-texto-invertido-sec">
                    <MapPin aria-hidden className="size-4" />
                    {noticia.local}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="flex flex-col gap-1 texto-pequeno text-texto-invertido-sec">
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="flex items-center gap-1.5">
                  <CalendarDays aria-hidden className="size-4" />
                  {noticia.publicadoEm ? (
                    <time dateTime={noticia.publicadoEm.toISOString()}>{dataHoraNaBahia(noticia.publicadoEm)}</time>
                  ) : (
                    "Ainda não publicada"
                  )}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock aria-hidden className="size-4" />
                  {noticia.minutosDeLeitura} min de leitura
                </span>
              </p>
              {noticia.atualizadoEm ? (
                <p>
                  Atualizado em <time dateTime={noticia.atualizadoEm.toISOString()}>{dataHoraNaBahia(noticia.atualizadoEm)}</time>
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[820px] flex-col gap-8 px-4 py-8 @3xl:px-10 @3xl:py-12">
        {noticia.capa ? (
          <figure className="flex flex-col gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={noticia.capa.url} alt={noticia.capa.alt} className="aspect-video w-full rounded-[20px] object-cover" />
            {noticia.capa.legenda ? (
              <figcaption className="texto-pequeno text-texto-secundario">{noticia.capa.legenda}</figcaption>
            ) : null}
          </figure>
        ) : null}

        {noticia.lide ? (
          <p className="texto-corpo-materia-mobile font-semibold text-texto-primario @3xl:texto-corpo-materia">{noticia.lide}</p>
        ) : null}
        <CorpoMateria corpo={noticia.corpo} />

        {fontes.length > 0 ? (
          <section aria-labelledby="fontes-da-noticia" className="flex flex-col gap-3">
            <h2 id="fontes-da-noticia" className="texto-eyebrow text-texto-secundario">
              Fontes e anexos
            </h2>
            <ul className="flex flex-col gap-2">
              {fontes.map((link) => (
                <li key={`${link.tipo}-${link.href}`}>
                  <a
                    href={link.href}
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-[14px] border border-borda-padrao bg-fundo-superficie px-4 py-3 texto-corpo text-texto-primario outline-none hover:bg-fundo-superficie-alt focus-visible:ring-[3px] focus-visible:ring-ring"
                  >
                    {link.tipo === "anexo" ? <FileText aria-hidden className="size-5 shrink-0" /> : <Link2 aria-hidden className="size-5 shrink-0" />}
                    <span className="min-w-0 break-words">{link.titulo || link.href}</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {noticia.palavrasChave.length > 0 ? (
          <section aria-labelledby="assuntos-da-noticia" className="flex flex-col gap-3">
            <h2 id="assuntos-da-noticia" className="texto-eyebrow text-texto-secundario">
              Assuntos relacionados
            </h2>
            <ul className="flex flex-wrap gap-2">
              {noticia.palavrasChave.map((palavra) => (
                <li key={palavra} className="rounded-full border border-borda-padrao bg-fundo-superficie px-3 py-1.5 texto-pequeno text-texto-primario">
                  {palavra}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </article>
  );
}
