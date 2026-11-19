import Link from "next/link";

import { IconeFigma } from "@/components/icone-figma";
import type { ConfigSite } from "@/lib/config-site";
import { formatarTelefone, linkTelefone } from "@/lib/config-site/links";

import { BotaoCookies } from "./aviso-cookies";
import { Logo } from "./logo";
import { CONTATO, DOCUMENTOS, INICIO, NOTICIAS, POLITICA, RADIO, SINDICATO, TERMOS, type ItemDeMenu } from "./navegacao";
import { redesComLink } from "./redes";
import { TextoDoSite } from "./texto-do-site";

const link =
  "rounded-sm outline-none hover:text-texto-invertido focus-visible:ring-2 focus-visible:ring-destaque-amarelo";

function Coluna({ titulo, itens, extra }: { titulo: string; itens: ItemDeMenu[]; extra?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3.5">
      <h2 className="texto-eyebrow text-destaque-amarelo">{titulo}</h2>
      <ul className="texto-corpo flex flex-col gap-1 text-texto-invertido-sec">
        {itens.map((item) => (
          <li key={item.href}>
            <Link href={item.href} className={`${link} alvo-toque inline-flex min-h-8 items-center whitespace-nowrap`}>
              {item.rotulo}
            </Link>
          </li>
        ))}
        {extra}
      </ul>
    </div>
  );
}

/**
 * Rodapé da Fase 1 (Figma 295:51171 / 295:51234; N13), sem “Entrar” (E01). Contato da ConfigSite
 * (RN43). O link “Cookies” reabre o aviso (E56). Sempre marinho, com a logo branca.
 */
export function Rodape({ config, linkFiliacao }: { config: ConfigSite; linkFiliacao: string }) {
  const { contato } = config;
  const redes = redesComLink(config.redes);
  const ano = new Date().getFullYear();

  return (
    <footer className="bg-fundo-marinho-profundo text-texto-invertido-sec print:hidden">
      <div className="conteudo-site flex flex-col gap-10 pt-12 pb-10 lg:flex-row lg:justify-between lg:gap-12 lg:pt-[72px] lg:pb-14">
        <div className="flex flex-col gap-5 lg:max-w-[300px]">
          <Logo sempreBranca className="h-16" />
          <p className="texto-corpo">Sindicato dos Rodoviários de Vitória da Conquista. Representando quem move a cidade.</p>
          {redes.length > 0 ? (
            <ul className="flex gap-2.5" aria-label="Redes sociais">
              {redes.map((r) => (
                <li key={r.nome}>
                  <a
                    href={r.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={r.nome}
                    className="flex size-11 items-center justify-center rounded-full border border-sobre-escuro-borda bg-sobre-escuro-superficie text-texto-invertido outline-none hover:bg-sobre-escuro-chip focus-visible:ring-2 focus-visible:ring-destaque-amarelo"
                  >
                    <IconeFigma src={r.icone} tamanho={20} />
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <nav aria-label="Rodapé" className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 lg:flex lg:gap-12 xl:gap-16">
          <Coluna titulo="Navegação" itens={[INICIO, NOTICIAS, RADIO, CONTATO]} />
          <Coluna titulo="Sindicato" itens={SINDICATO.itens} />
          <Coluna titulo="Documentos" itens={DOCUMENTOS.itens} />
          <Coluna
            titulo="Associado"
            itens={[]}
            extra={
              <li>
                <a href={linkFiliacao} target="_blank" rel="noopener noreferrer" className={`${link} alvo-toque inline-flex min-h-8 items-center whitespace-nowrap`}>
                  Filiar-se<span className="sr-only"> pelo WhatsApp</span>
                </a>
              </li>
            }
          />
        </nav>

        <address className="flex flex-col gap-3.5 not-italic lg:max-w-[260px]">
          <h2 className="texto-eyebrow text-destaque-amarelo">Contato</h2>
          <p className="texto-corpo flex gap-2.5">
            <IconeFigma src="/site/icone-local.svg" tamanho={16} className="mt-1" />
            <span>
              {contato.endereco}, {contato.cidade}
              <br />
              <TextoDoSite texto={contato.cep} />
            </span>
          </p>
          <p className="texto-corpo flex gap-2.5">
            <IconeFigma src="/site/icone-telefone.svg" tamanho={16} className="mt-1" />
            <a href={linkTelefone(contato.telefone)} className={link} data-testid="rodape-telefone">
              {formatarTelefone(contato.telefone)}
            </a>
          </p>
          <p className="texto-corpo flex gap-2.5">
            <IconeFigma src="/site/icone-relogio.svg" tamanho={16} className="mt-1" />
            <TextoDoSite texto={contato.horario} />
          </p>
        </address>
      </div>

      <div className="conteudo-site">
        <div className="texto-pequeno flex flex-col gap-3 border-t border-sobre-escuro-divisor pt-6 pb-7 lg:flex-row lg:items-center lg:justify-between">
          <p>© {ano} SINTRAVC — Sindicato dos Rodoviários de Vitória da Conquista</p>
          <ul className="flex flex-wrap gap-x-6 gap-y-1 text-texto-invertido">
            {[POLITICA, TERMOS].map((item) => (
              <li key={item.href}>
                <Link href={item.href} className={`${link} alvo-toque inline-flex min-h-8 items-center whitespace-nowrap`}>
                  {item.rotulo}
                </Link>
              </li>
            ))}
            <li>
              <BotaoCookies className={`${link} alvo-toque inline-flex min-h-8 items-center`} />
            </li>
          </ul>
          <a href="#topo" className={`${link} alvo-toque inline-flex min-h-8 items-center gap-2 text-texto-invertido`}>
            Voltar ao topo
            <IconeFigma src="/site/icone-seta-cima.svg" tamanho={16} />
          </a>
        </div>
      </div>
    </footer>
  );
}
