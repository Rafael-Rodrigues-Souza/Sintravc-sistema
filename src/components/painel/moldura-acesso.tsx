import { IconeFigma } from "@/components/icone-figma";
import { Logo } from "@/components/marca/logo";
import { cn } from "@/lib/utils";

/**
 * Moldura das telas de acesso da equipe (Figma 169:18816 desktop, 169:18946 mobile):
 * coluna da marca à esquerda (no celular, faixa no topo) e o formulário à direita. A coluna é marinha
 * nos dois temas: a logo é a versão branca, e a preta na impressão (#61).
 */
const GARANTIAS = [
  "Cada pessoa entra com o próprio e-mail",
  "Verificação em duas etapas obrigatória",
  "Tudo o que é feito fica registrado",
];

export function MolduraAcesso({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-fundo-pagina lg:flex-row">
      <aside className="flex shrink-0 flex-col gap-5 bg-fundo-marinho-profundo px-5 pt-10 pb-8 lg:min-h-dvh lg:w-[560px] lg:justify-between lg:p-14">
        <Logo sempreBranca href={null} alt="SINTRAVC" className="h-16 self-start lg:h-24" />
        <div className="flex flex-col gap-5">
          <Eyebrow cor="amarelo">Painel de gestão</Eyebrow>
          <p className="texto-titulo-secao-mobile text-texto-invertido lg:texto-titulo-secao">
            Área restrita à equipe do sindicato.
          </p>
          <ul className="hidden flex-col gap-5 lg:flex">
            {GARANTIAS.map((texto) => (
              <li key={texto} className="flex items-center gap-2.5 texto-corpo text-texto-invertido-sec">
                <IconeFigma src="/painel/icone-check-marca.svg" tamanho={18} className="text-destaque-amarelo" />
                {texto}
              </li>
            ))}
          </ul>
        </div>
        <p className="hidden texto-pequeno text-texto-invertido-sec lg:block">© 2026 SINTRAVC · Uso interno</p>
      </aside>
      <main className="flex flex-1 justify-center px-5 py-8 lg:items-center lg:p-10">
        <div className="flex w-full max-w-[420px] flex-col gap-[18px]">{children}</div>
      </main>
    </div>
  );
}

export function Eyebrow({
  children,
  cor = "azul",
  className,
}: {
  children: React.ReactNode;
  cor?: "azul" | "amarelo";
  className?: string;
}) {
  return (
    <p
      className={cn(
        "flex items-center gap-2.5 texto-eyebrow",
        cor === "amarelo" ? "text-destaque-amarelo" : "text-destaque-azul",
        className,
      )}
    >
      <span aria-hidden className="h-[3px] w-6 bg-destaque-amarelo" />
      {children}
    </p>
  );
}
