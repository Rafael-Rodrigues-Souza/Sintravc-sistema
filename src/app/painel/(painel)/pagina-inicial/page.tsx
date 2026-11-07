import type { Metadata } from "next";

import { AreaEmConstrucao } from "@/components/painel/area-em-construcao";
import { exigirArea } from "@/lib/acesso/sessao-da-equipe";

export const metadata: Metadata = { title: "Página inicial" };

export default async function PaginaPaginaInicial() {
  await exigirArea("pagina_inicial");
  return <AreaEmConstrucao nome="Página inicial" />;
}
