import type { Metadata } from "next";

import { AreaEmConstrucao } from "@/components/painel/area-em-construcao";
import { exigirArea } from "@/lib/acesso/sessao-da-equipe";

export const metadata: Metadata = { title: "Benefícios" };

export default async function PaginaBeneficios() {
  await exigirArea("beneficios");
  return <AreaEmConstrucao nome="Benefícios" />;
}
