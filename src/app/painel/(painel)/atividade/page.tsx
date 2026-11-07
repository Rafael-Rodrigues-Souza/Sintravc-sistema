import type { Metadata } from "next";

import { AreaEmConstrucao } from "@/components/painel/area-em-construcao";
import { exigirArea } from "@/lib/acesso/sessao-da-equipe";

export const metadata: Metadata = { title: "Atividade" };

export default async function PaginaAtividade() {
  await exigirArea("atividade");
  return <AreaEmConstrucao nome="Atividade" />;
}
