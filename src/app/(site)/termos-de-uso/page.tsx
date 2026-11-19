import type { Metadata } from "next";

import { TERMOS } from "@/components/site/navegacao";
import { PaginaLegal } from "@/components/site/pagina-legal";
import { TERMOS_DE_USO } from "@/conteudo/juridico";

export const metadata: Metadata = {
  title: "Termos de uso",
  description: "Regras de uso do site do SINTRAVC.",
};

/** Termos de uso (RF09, RN45): sem frame no Figma, no mesmo modelo da Política (D6). */
export default function PaginaTermos() {
  return <PaginaLegal titulo={TERMOS.rotulo} href={TERMOS.href} texto={TERMOS_DE_USO} />;
}
