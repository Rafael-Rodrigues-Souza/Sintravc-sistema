import type { Metadata } from "next";

import { POLITICA } from "@/components/site/navegacao";
import { PaginaLegal } from "@/components/site/pagina-legal";
import { POLITICA_DE_PRIVACIDADE } from "@/conteudo/juridico";

export const metadata: Metadata = {
  title: "Política de privacidade",
  description: "Como o SINTRAVC trata os seus dados.",
};

/** Política de privacidade (Figma 159:8912 / 159:9121; RF09, RN45). Texto do advogado (D6, D9). */
export default function PaginaPolitica() {
  return <PaginaLegal titulo={POLITICA.rotulo} href={POLITICA.href} texto={POLITICA_DE_PRIVACIDADE} />;
}
