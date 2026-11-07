import type { Metadata } from "next";
import { forbidden, redirect } from "next/navigation";

import { EstadoDaTela } from "@/components/painel/estado-da-tela";
import { sessaoDaEquipe } from "@/lib/acesso/sessao-da-equipe";
import { itensDoMenu } from "@/lib/permissoes/menu";

export const metadata: Metadata = { title: "Visão geral" };

/** Visão geral (o conteúdo vem no ticket dela). Quem não tem a Visão geral vai para a 1ª área que pode abrir. */
export default async function PaginaVisaoGeral() {
  const pessoa = await sessaoDaEquipe();
  const itens = itensDoMenu(pessoa.quem).flatMap((g) => g.itens);
  if (!itens.some((i) => i.area === "visao_geral")) {
    if (itens[0]) redirect(itens[0].href);
    forbidden();
  }
  const primeiroNome = pessoa.nome.split(" ")[0];

  return (
    <EstadoDaTela
      icone="/painel/menu-grade.svg"
      eyebrow="Visão geral"
      titulo={`Olá, ${primeiroNome}`}
      acao={{ rotulo: "Ver site público", href: "/" }}
    >
      O resumo do que está no ar e do que precisa de atenção chega em breve. Use o menu para abrir as áreas do seu
      perfil.
    </EstadoDaTela>
  );
}
