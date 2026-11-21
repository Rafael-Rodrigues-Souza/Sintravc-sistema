import { exigirArea } from "@/lib/acesso/sessao-da-equipe";

/**
 * Confere a permissão antes do loading.tsx: dentro do limite de carregamento a resposta já
 * começou (status 200) e o forbidden() não consegue mais responder 403 (CA-US19.3).
 */
export default async function LayoutComunicados({ children }: { children: React.ReactNode }) {
  await exigirArea("comunicados");
  return children;
}
