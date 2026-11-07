import type { Metadata } from "next";

import { AreaEmConstrucao } from "@/components/painel/area-em-construcao";
import { exigirArea } from "@/lib/acesso/sessao-da-equipe";

export const metadata: Metadata = { title: "Conteúdos" };

export default async function PaginaConteudos() {
  await exigirArea("conteudos");
  return <AreaEmConstrucao nome="Conteúdos" />;
}
