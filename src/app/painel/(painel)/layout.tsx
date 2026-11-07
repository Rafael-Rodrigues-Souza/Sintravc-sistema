import type { Metadata } from "next";

import { NavegacaoLateral } from "@/components/painel/navegacao-lateral";
import { sessaoDaEquipe } from "@/lib/acesso/sessao-da-equipe";
import { pode } from "@/lib/permissoes";
import { itensDoMenu } from "@/lib/permissoes/menu";

import { acaoSair } from "../(acesso)/acoes";

export const metadata: Metadata = {
  title: { default: "Painel", template: "%s · Painel · SINTRAVC" },
  robots: { index: false, follow: false },
};

/** Moldura do painel: só abre com sessão válida da equipe (E05). O menu sai de pode() (RN06). */
export default async function LayoutPainel({ children }: { children: React.ReactNode }) {
  const pessoa = await sessaoDaEquipe();

  return (
    <div className="flex min-h-dvh flex-col bg-fundo-pagina lg:flex-row">
      <NavegacaoLateral
        grupos={itensDoMenu(pessoa.quem)}
        podeCriarConteudo={pode(pessoa.quem, "criar", { tipo: "noticia" })}
        pessoa={{ nome: pessoa.nome, perfil: pessoa.perfil }}
        sair={acaoSair}
      />
      <main className="flex min-w-0 flex-1 flex-col">{children}</main>
    </div>
  );
}
