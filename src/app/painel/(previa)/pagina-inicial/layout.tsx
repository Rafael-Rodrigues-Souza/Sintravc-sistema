import { exigirArea } from "@/lib/acesso/sessao-da-equipe";

/** Confere a permissão antes do loading.tsx da prévia (403 de verdade, como em Conteúdos). */
export default async function LayoutPreviaPaginaInicial({ children }: { children: React.ReactNode }) {
  await exigirArea("pagina_inicial");
  return children;
}
