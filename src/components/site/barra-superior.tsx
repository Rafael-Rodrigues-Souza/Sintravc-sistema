import { IconeFigma } from "@/components/icone-figma";
import type { ConfigSite } from "@/lib/config-site";
import { formatarTelefone, linkTelefone } from "@/lib/config-site/links";

import { redesComLink } from "./redes";
import { TextoDoSite } from "./texto-do-site";

/**
 * Barra superior (Figma 54:818): cidade, telefone, horário e redes, da ConfigSite (RN43). Só no desktop.
 * O telefone não está no Figma, mas o CA-US05.1 pede (correcoes-figma.md).
 */
export function BarraSuperior({ config }: { config: ConfigSite }) {
  const redes = redesComLink(config.redes);
  return (
    <div className="hidden bg-fundo-marinho-profundo lg:block print:hidden">
      <div className="conteudo-site texto-pequeno flex items-center justify-between gap-6 py-2.5 text-texto-invertido-sec">
        <div className="flex items-center gap-7">
          <p className="flex items-center gap-2">
            <IconeFigma src="/site/icone-local.svg" tamanho={16} />
            {config.contato.cidade}
          </p>
          <p className="flex items-center gap-2">
            <IconeFigma src="/site/icone-telefone.svg" tamanho={16} />
            <a href={linkTelefone(config.contato.telefone)} data-testid="barra-telefone" className="rounded-sm outline-none hover:text-texto-invertido focus-visible:ring-2 focus-visible:ring-destaque-amarelo">
              {formatarTelefone(config.contato.telefone)}
            </a>
          </p>
          <p className="flex items-center gap-2">
            <IconeFigma src="/site/icone-relogio.svg" tamanho={16} />
            <span>
              Atendimento: <TextoDoSite texto={config.contato.horario} />
            </span>
          </p>
        </div>
        {redes.length > 0 ? (
          <div className="flex items-center gap-4">
            <span>Siga o sindicato</span>
            {redes.map((r) => (
              <a key={r.nome} href={r.href} target="_blank" rel="noopener noreferrer" aria-label={r.nome} className="rounded-sm text-texto-invertido outline-none hover:text-destaque-amarelo focus-visible:ring-2 focus-visible:ring-destaque-amarelo">
                <IconeFigma src={r.icone} tamanho={18} />
              </a>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
