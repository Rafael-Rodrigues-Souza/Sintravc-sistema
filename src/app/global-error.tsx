"use client";

import "./globals.css";

/**
 * Erro no layout raiz (último recurso): página 500 sem as fontes nem o tema do site, só com o CSS.
 * N2, E23. As outras falhas caem em app/error.tsx ou em (site)/error.tsx.
 */
export default function ErroGlobal({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="pt-BR">
      <body className="flex min-h-dvh items-center bg-fundo-pagina font-sans">
        <main className="conteudo-site flex flex-col gap-4 py-14">
          <p className="texto-eyebrow text-destaque-azul">Erro 500</p>
          <h1 className="texto-titulo-secao-mobile text-texto-primario">O site está fora do ar por um momento</h1>
          <p className="texto-corpo text-texto-secundario">
            Pode ser um erro nosso ou uma manutenção programada. Não foi nada que você fez. Tente de novo em alguns minutos.
          </p>
          <button
            type="button"
            onClick={reset}
            className="texto-botao h-12 self-start rounded-full bg-destaque-amarelo px-6 text-destaque-amarelo-texto"
          >
            Tentar de novo
          </button>
        </main>
      </body>
    </html>
  );
}
