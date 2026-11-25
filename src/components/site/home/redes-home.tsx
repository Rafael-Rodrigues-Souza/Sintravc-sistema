import { IconeFigma } from "@/components/icone-figma";
import { CabecalhoDeSecao } from "@/components/site/partes-da-pagina";
import { redesComLink } from "@/components/site/redes";
import { HOME_PAGINA } from "@/conteudo/site";
import type { ConfigSite } from "@/lib/config-site";
import { cn } from "@/lib/utils";

const t = HOME_PAGINA;

/** "@sintravc.ba" a partir do endereço do perfil; sem caminho, o nome da rede. */
function perfil(href: string): string | null {
  const caminho = new URL(href).pathname.split("/").filter(Boolean)[0];
  if (!caminho) return null;
  return caminho.startsWith("@") ? caminho : `@${caminho}`;
}

/** 1200 → "1.200". */
const numero = (n: number) => n.toLocaleString("pt-BR");

/**
 * Redes do sindicato (Figma 34:706 / 36:847; RF01, P6, E57, E62). Só as redes com link (E57). O
 * número de cada uma (“1.200 rodoviários já recebem os avisos por aqui”) vem da ConfigSite
 * (`contadores`, P6): sem número, a linha some. O cartão inteiro é o link. Os posts de exemplo do
 * Figma não entram (não há integração com as redes).
 */
export function RedesHome({ redes, contadores }: { redes: ConfigSite["redes"]; contadores: ConfigSite["contadores"] }) {
  const lista = redesComLink(redes);
  if (lista.length === 0) return null;
  return (
    <section aria-labelledby="redes-home" className="conteudo-site flex flex-col gap-6 pt-11 pb-12 lg:gap-9 lg:pt-24 lg:pb-24">
      <CabecalhoDeSecao id="redes-home" eyebrow={t.redesEyebrow} titulo={t.redesTitulo} texto={<span className="hidden lg:inline">{t.redesTexto}</span>} />
      <ul className={cn("grid gap-4 lg:gap-5", lista.length >= 3 ? "lg:grid-cols-3" : lista.length === 2 ? "lg:grid-cols-2" : "")} data-testid="redes-home">
        {lista.map((rede) => {
          const textos = t.redes[rede.chave];
          const escuro = rede.chave === "canalWhatsapp";
          const contador = contadores[rede.chave as keyof ConfigSite["contadores"]] ?? null;
          const subtitulo = rede.chave === "instagram" ? (perfil(rede.href) ?? textos.subtitulo) : textos.subtitulo;
          return (
            <li key={rede.chave} className="flex">
              <a
                href={rede.href}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "group flex w-full flex-col gap-4 rounded-[20px] border p-4 outline-none focus-visible:ring-[3px] focus-visible:ring-ring lg:gap-5 lg:rounded-[24px] lg:p-7",
                  escuro ? "border-fundo-marinho bg-fundo-marinho text-texto-invertido" : "border-borda-padrao bg-fundo-superficie text-texto-primario hover:shadow-[0_8px_24px_rgb(2_31_75/0.08)]",
                )}
              >
                <span className="flex items-center gap-3.5">
                  <span
                    aria-hidden
                    className={cn(
                      "flex size-12 shrink-0 items-center justify-center rounded-[12px] lg:size-[52px]",
                      escuro ? "bg-destaque-amarelo text-destaque-marinho-fixo" : "bg-destaque-azul-suave text-destaque-azul",
                    )}
                  >
                    <IconeFigma src={rede.icone} tamanho={24} />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="texto-titulo-card break-words">{rede.nome}</span>
                    <span className={cn("texto-pequeno", escuro ? "text-texto-invertido-sec" : "text-texto-secundario")}>{subtitulo}</span>
                  </span>
                  <IconeFigma src="/site/icone-seta-diagonal.svg" tamanho={20} className={cn("lg:hidden", escuro ? "text-destaque-amarelo" : "text-destaque-azul")} />
                </span>
                <span className={cn("hidden texto-corpo lg:block", escuro ? "text-texto-invertido-sec" : "text-texto-secundario")}>{textos.texto}</span>
                {contador !== null ? (
                  <span
                    data-testid={`contador-${rede.chave}`}
                    className={cn("flex items-center gap-2.5 rounded-[14px] px-4 py-3 texto-pequeno", escuro ? "bg-sobre-escuro-superficie text-texto-invertido" : "bg-fundo-superficie-alt text-texto-primario")}
                  >
                    <span aria-hidden className="size-2 shrink-0 rounded-full bg-sobre-escuro-ao-vivo" />
                    {numero(contador)} {textos.contador}
                  </span>
                ) : null}
                <span
                  aria-hidden
                  className={cn(
                    "mt-auto hidden h-12 items-center justify-center gap-2 rounded-full texto-botao lg:flex",
                    escuro ? "bg-destaque-amarelo text-destaque-amarelo-texto" : "border-[1.5px] border-borda-forte text-texto-primario group-hover:bg-fundo-superficie-alt",
                  )}
                >
                  <IconeFigma src={escuro ? "/site/icone-whatsapp.svg" : "/site/icone-seta-diagonal.svg"} tamanho={16} />
                  {textos.acao}
                </span>
                <span className="sr-only">(abre em nova aba)</span>
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
