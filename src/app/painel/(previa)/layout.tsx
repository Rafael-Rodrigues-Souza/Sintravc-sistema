import type { Metadata } from "next";

import { FaixaSemInternet } from "@/components/painel/faixa-sem-internet";
import { sessaoDaEquipe } from "@/lib/acesso/sessao-da-equipe";

export const metadata: Metadata = {
  title: { default: "Prévia", template: "%s · Painel · SINTRAVC" },
  robots: { index: false, follow: false },
};

/** Telas do painel em tela cheia, sem o menu lateral (Figma 122:5800). Só abrem com sessão da equipe (E05). */
export default async function LayoutPrevia({ children }: { children: React.ReactNode }) {
  await sessaoDaEquipe();
  return (
    <div className="flex min-h-dvh flex-col bg-fundo-pagina">
      <FaixaSemInternet />
      {children}
    </div>
  );
}
