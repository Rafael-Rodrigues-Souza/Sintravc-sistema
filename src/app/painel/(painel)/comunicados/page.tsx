import type { Metadata } from "next";

import { AreaEmConstrucao } from "@/components/painel/area-em-construcao";
import { exigirArea } from "@/lib/acesso/sessao-da-equipe";

export const metadata: Metadata = { title: "Comunicados" };

export default async function PaginaComunicados() {
  await exigirArea("comunicados");
  return <AreaEmConstrucao nome="Comunicados" />;
}
