import type { Metadata } from "next";
import { Barlow, Barlow_Condensed } from "next/font/google";

import { ProvedorTema } from "@/components/provedor-tema";
import { Toaster } from "@/components/ui/sonner";

import "./globals.css";

// Só os pesos usados nos estilos de texto 2.0 do Figma.
const barlow = Barlow({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-barlow",
});

const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["700", "800"],
  display: "swap",
  variable: "--font-barlow-condensed",
});

/**
 * `metadataBase` vem do URL_SITE: a prévia do link no WhatsApp e no Facebook precisa de endereço
 * completo na imagem (og:image, RNF08, E59). Sem a variável (build sem ambiente), cai no local.
 */
export function generateMetadata(): Metadata {
  let base: URL;
  try {
    base = new URL(process.env.URL_SITE ?? "http://localhost:3000");
  } catch {
    base = new URL("http://localhost:3000");
  }
  return {
    metadataBase: base,
    title: {
      default: "SINTRAVC",
      template: "%s · SINTRAVC",
    },
    description: "Sindicato dos Rodoviários de Vitória da Conquista.",
    openGraph: { siteName: "SINTRAVC", locale: "pt_BR", type: "website" },
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="pt-BR"
      className={`${barlow.variable} ${barlowCondensed.variable}`}
      suppressHydrationWarning
    >
      <body>
        <ProvedorTema>
          {children}
          <Toaster />
        </ProvedorTema>
      </body>
    </html>
  );
}
