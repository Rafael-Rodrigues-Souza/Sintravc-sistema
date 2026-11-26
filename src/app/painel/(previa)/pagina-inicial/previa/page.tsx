import { ChevronLeft, Eye } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Home } from "@/components/site/home/home";
import { exigirArea } from "@/lib/acesso/sessao-da-equipe";

export const metadata: Metadata = { title: "Prévia da página inicial" };

/**
 * Prévia da página inicial (RF46, CA-US26.1, E62): a mesma Home do site, com o rascunho salvo no
 * lugar do publicado. O botão “Pré-visualizar” salva o que estiver pendente e abre esta tela numa
 * aba nova. O carrossel não troca sozinho aqui.
 */
export default async function PreviaPaginaInicial({ searchParams }: { searchParams: Promise<{ categoria?: string }> }) {
  await exigirArea("pagina_inicial");
  const { categoria } = await searchParams;
  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-30 flex flex-wrap items-center gap-3 bg-fundo-marinho-profundo px-4 py-3 text-texto-invertido sm:px-8">
        <Link
          href="/painel/pagina-inicial"
          className="inline-flex h-11 items-center gap-2 rounded-full border border-sobre-escuro-borda px-4 texto-botao outline-none hover:bg-sobre-escuro-superficie focus-visible:ring-[3px] focus-visible:ring-ring"
        >
          <ChevronLeft aria-hidden className="size-[18px]" />
          Voltar à Página inicial
        </Link>
        <p className="inline-flex items-center gap-1.5 rounded-full bg-destaque-amarelo px-3 py-1 texto-etiqueta text-destaque-amarelo-texto uppercase">
          <Eye aria-hidden className="size-3.5" />
          Prévia · rascunho
        </p>
        <p className="texto-pequeno text-texto-invertido-sec">Assim fica a página inicial depois de publicar. A faixa de comunicado, o menu e o rodapé seguem os do site.</p>
      </header>
      <main id="conteudo" className="flex flex-col bg-fundo-pagina">
        <Home categoria={categoria?.trim() || null} versao="rascunho" />
      </main>
    </div>
  );
}
