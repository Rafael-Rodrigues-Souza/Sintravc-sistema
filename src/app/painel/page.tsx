import type { Metadata } from "next";

import { VitrineBase } from "@/components/vitrine-base";

export const metadata: Metadata = {
  title: "Painel",
  robots: { index: false, follow: false },
};

export default function PaginaPainel() {
  return <VitrineBase titulo="Painel de gestão" />;
}
