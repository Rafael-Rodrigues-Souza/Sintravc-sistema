import { Play } from "lucide-react";

import { AlternarTema } from "@/components/alternar-tema";
import { Button } from "@/components/ui/button";
import { Campo } from "@/components/ui/campo";

/**
 * Vitrine provisória da base (issue #1): mostra que o tema e os componentes funcionam.
 * Será trocada pelo conteúdo real nos tickets das telas.
 */
export function VitrineBase({ titulo }: { titulo: string }) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-5xl flex-col gap-10 px-6 py-12">
      <header className="flex items-center justify-between gap-4">
        <div>
          <p className="texto-eyebrow text-destaque-azul">SINTRAVC 2.0</p>
          <h1 className="texto-titulo-secao-mobile md:texto-titulo-secao">{titulo}</h1>
        </div>
        <AlternarTema />
      </header>

      <section aria-labelledby="botoes" className="flex flex-col gap-4">
        <h2 id="botoes" className="texto-titulo-card">
          Botão
        </h2>
        <div className="flex flex-wrap gap-4">
          <Button>
            <Play aria-hidden />
            Primário
          </Button>
          <Button variant="secundario">Secundário</Button>
          <Button variant="marinho">Marinho</Button>
          <Button variant="perigo">Perigo</Button>
        </div>
        <div className="flex flex-wrap gap-4 rounded-[var(--radius)] bg-fundo-marinho p-6">
          <Button variant="sobre-escuro">
            <Play aria-hidden />
            Sobre escuro
          </Button>
        </div>
      </section>

      <section aria-labelledby="campos" className="flex flex-col gap-4">
        <h2 id="campos" className="texto-titulo-card">
          Campo
        </h2>
        <div className="grid gap-6 md:grid-cols-3">
          <Campo id="campo-padrao" rotulo="Rótulo" placeholder="Placeholder" ajuda="Texto de ajuda" />
          <Campo
            id="campo-foco"
            rotulo="Rótulo (clique para ver o foco)"
            placeholder="Placeholder"
            ajuda="Texto de ajuda"
          />
          <Campo
            id="campo-erro"
            rotulo="Rótulo"
            placeholder="Placeholder"
            erro="Informe um e-mail válido, como nome@exemplo.com."
          />
        </div>
      </section>
    </div>
  );
}
