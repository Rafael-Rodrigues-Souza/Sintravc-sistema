import { exigirArea } from "@/lib/acesso/sessao-da-equipe";

/**
 * Confere a permissão antes do loading.tsx da prévia: dentro do limite de carregamento a resposta
 * já começou (status 200) e o forbidden() não consegue mais responder 403 (como em Conteúdos).
 */
export default async function LayoutPreviaConteudos({ children }: { children: React.ReactNode }) {
  await exigirArea("conteudos");
  return children;
}
