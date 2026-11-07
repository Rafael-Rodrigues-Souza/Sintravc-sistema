import type { Metadata } from "next";

import { AreaEmConstrucao } from "@/components/painel/area-em-construcao";
import { exigirArea } from "@/lib/acesso/sessao-da-equipe";

export const metadata: Metadata = { title: "Mídia" };

export default async function PaginaMidia() {
  await exigirArea("midia");
  return <AreaEmConstrucao nome="Mídia" />;
}
