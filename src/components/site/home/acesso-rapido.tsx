import { ClipboardList, FileText, Gift } from "lucide-react";
import Link from "next/link";

import { IconeFigma } from "@/components/icone-figma";
import { CabecalhoDeSecao } from "@/components/site/partes-da-pagina";
import { LINKS } from "@/components/site/navegacao";
import { HOME_PAGINA } from "@/conteudo/site";
import { cn } from "@/lib/utils";

const t = HOME_PAGINA;

/**
 * Acesso rápido (Figma 33:593 / 35:787; RF01, RN41). Acordos coletivos, Benefícios, Editais e o
 * WhatsApp da recepção. O atalho “Agendar” é só do associado conectado, na Fase 2 (CA-US01.3).
 */
export function AcessoRapido({ linkWhatsApp }: { linkWhatsApp: string }) {
  const atalhos = [
    { ...t.atalhos.acordos, href: LINKS.acordos.href, icone: <FileText aria-hidden className="size-5" />, externo: false },
    { ...t.atalhos.beneficios, href: LINKS.beneficios.href, icone: <Gift aria-hidden className="size-5" />, externo: false },
    { ...t.atalhos.editais, href: LINKS.editais.href, icone: <ClipboardList aria-hidden className="size-5" />, externo: false },
    { ...t.atalhos.whatsapp, href: linkWhatsApp, icone: <IconeFigma src="/site/icone-conversa.svg" tamanho={20} />, externo: true },
  ];
  return (
    <section aria-labelledby="acesso-rapido" className="conteudo-site flex flex-col gap-6 pt-11 pb-11 lg:gap-9 lg:pt-[88px] lg:pb-12">
      <CabecalhoDeSecao id="acesso-rapido" eyebrow={t.acessoEyebrow} titulo={t.acessoTitulo} texto={<span className="hidden lg:inline">{t.acessoTexto}</span>} />
      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-5" data-testid="acesso-rapido">
        {atalhos.map((a, i) => {
          const destaque = i === atalhos.length - 1;
          const Elemento = a.externo ? "a" : Link;
          return (
            <li key={a.titulo} className="flex">
              <Elemento
                href={a.href}
                {...(a.externo ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className={cn(
                  "group flex w-full flex-col justify-between gap-6 rounded-[20px] border p-4 outline-none focus-visible:ring-[3px] focus-visible:ring-ring sm:p-6 lg:min-h-[232px] lg:rounded-[24px]",
                  destaque
                    ? "border-destaque-amarelo bg-destaque-amarelo text-destaque-amarelo-texto hover:brightness-95"
                    : "border-borda-padrao bg-fundo-superficie text-texto-primario hover:shadow-[0_8px_24px_rgb(2_31_75/0.08)]",
                )}
              >
                <span className="flex items-start justify-between gap-3">
                  <span
                    aria-hidden
                    className={cn(
                      "flex size-12 items-center justify-center rounded-[12px] lg:size-[52px]",
                      destaque ? "bg-destaque-marinho-fixo text-destaque-amarelo" : "bg-destaque-azul-suave text-destaque-azul",
                    )}
                  >
                    {a.icone}
                  </span>
                  <IconeFigma src="/site/icone-seta-diagonal.svg" tamanho={18} className={destaque ? "text-destaque-marinho-fixo" : "text-destaque-azul"} />
                </span>
                <span className="flex flex-col gap-1.5">
                  <span className="texto-titulo-card break-words">{a.titulo}</span>
                  <span className={cn("texto-pequeno", destaque ? "opacity-85" : "text-texto-secundario")}>{a.texto}</span>
                  {a.externo ? <span className="sr-only">(abre o WhatsApp em nova aba)</span> : null}
                </span>
              </Elemento>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
