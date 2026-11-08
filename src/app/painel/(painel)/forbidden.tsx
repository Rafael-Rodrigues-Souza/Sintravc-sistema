import { headers } from "next/headers";

import { EstadoDaTela } from "@/components/painel/estado-da-tela";
import { CABECALHO_CAMINHO, sessaoDaEquipe } from "@/lib/acesso/sessao-da-equipe";
import { NOME_DO_PERFIL } from "@/lib/permissoes";
import { areaDoCaminho } from "@/lib/permissoes/menu";


/** Sem permissão (403), N1 (Figma 293:42423). Vem de exigirArea() → forbidden(). */
export default async function SemPermissao() {
  const pessoa = await sessaoDaEquipe();
  const area = areaDoCaminho((await headers()).get(CABECALHO_CAMINHO) ?? "");

  return (
    <EstadoDaTela
      icone="/painel/estado-cadeado.svg"
      eyebrow="Erro 403 · Sem permissão"
      titulo="Você não tem acesso a esta área"
      acao={{ rotulo: "Voltar para a Visão geral", href: "/painel" }}
    >
      Seu perfil ({NOME_DO_PERFIL[pessoa.perfil]}) não abre {area?.rotulo ?? "esta área"}. Se você precisa dessa área, peça
      a um Administrador geral.
    </EstadoDaTela>
  );
}
