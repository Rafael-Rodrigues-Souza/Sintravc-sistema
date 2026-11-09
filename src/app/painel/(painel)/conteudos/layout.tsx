import { exigirArea } from "@/lib/acesso/sessao-da-equipe";

/**
 * Confere a permissão antes do loading.tsx: dentro do limite de carregamento a resposta já
 * começou (status 200) e o forbidden() não consegue mais responder 403 (como na Mídia).
 */
export default async function LayoutConteudos({ children }: { children: React.ReactNode }) {
  await exigirArea("conteudos");
  return children;
}
