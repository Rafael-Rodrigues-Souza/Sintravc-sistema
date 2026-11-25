import type { Metadata } from "next";

import { Home } from "@/components/site/home/home";

export const metadata: Metadata = {
  description: "Notícias, documentos, benefícios e o Rádio Chofer do Sindicato dos Rodoviários de Vitória da Conquista.",
};

/**
 * Página inicial do site (RF01, US01, E62). Renderizada a cada visita: o carrossel segue o relógio
 * (E62) e o que a equipe publica aparece na hora. `?categoria=<slug>` filtra as últimas notícias.
 */
export default async function PaginaInicial({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { categoria } = await searchParams;
  return <Home categoria={typeof categoria === "string" && categoria.trim() ? categoria.trim().slice(0, 80) : null} />;
}
