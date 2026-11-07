import type { Metadata } from "next";

import { AreaEmConstrucao } from "@/components/painel/area-em-construcao";
import { exigirArea } from "@/lib/acesso/sessao-da-equipe";

export const metadata: Metadata = { title: "Equipe e perfis" };

export default async function PaginaEquipe() {
  await exigirArea("equipe");
  return <AreaEmConstrucao nome="Equipe e perfis" />;
}
