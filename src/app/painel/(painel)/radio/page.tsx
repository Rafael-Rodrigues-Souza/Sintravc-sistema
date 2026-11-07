import type { Metadata } from "next";

import { AreaEmConstrucao } from "@/components/painel/area-em-construcao";
import { exigirArea } from "@/lib/acesso/sessao-da-equipe";

export const metadata: Metadata = { title: "Rádio Chofer" };

export default async function PaginaRadio() {
  await exigirArea("radio");
  return <AreaEmConstrucao nome="Rádio Chofer" />;
}
