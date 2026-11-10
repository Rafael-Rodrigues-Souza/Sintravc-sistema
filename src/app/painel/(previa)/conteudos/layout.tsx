import { forbidden } from "next/navigation";

import { exigirArea } from "@/lib/acesso/sessao-da-equipe";
import { pode } from "@/lib/permissoes";

/**
 * Confere a permissão antes do loading.tsx da prévia: dentro do limite de carregamento a resposta
 * já começou (status 200) e o forbidden() não consegue mais responder 403 (como em Conteúdos).
 * A prévia é parte do editor: além da área, exige poder editar notícia.
 */
export default async function LayoutPreviaConteudos({ children }: { children: React.ReactNode }) {
  const pessoa = await exigirArea("conteudos");
  if (!pode(pessoa.quem, "editar", { tipo: "noticia" })) forbidden();
  return children;
}
