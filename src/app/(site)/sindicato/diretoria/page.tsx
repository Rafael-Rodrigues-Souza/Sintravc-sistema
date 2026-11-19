import type { Metadata } from "next";

import { IconeFigma } from "@/components/icone-figma";
import { AbasSindicato } from "@/components/site/abas-sindicato";
import { FilieSe } from "@/components/site/filie-se";
import { SINDICATO } from "@/components/site/navegacao";
import { CabecalhoDeSecao, Eyebrow, FotoPendente, Migalhas } from "@/components/site/partes-da-pagina";
import { TextoDoSite } from "@/components/site/texto-do-site";
import { Button } from "@/components/ui/button";
import { DIRETORIA, FALAR_COM_A_DIRETORIA, iniciais, type MembroDaDiretoria } from "@/conteudo/site";
import { lerConfigSite } from "@/lib/config-site";
import { linkWhatsApp } from "@/lib/config-site/links";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Diretoria",
  description: "Conheça quem representa e defende a categoria dos rodoviários de Vitória da Conquista.",
};

/** Destaque do presidente (grande) e do vice (menor): foto (iniciais por enquanto) ao lado do nome. */
function Destaque({ membro, mensagem, tamanho }: { membro: MembroDaDiretoria; mensagem?: string; tamanho: "grande" | "medio" }) {
  const grande = tamanho === "grande";
  return (
    <article
      aria-label={membro.cargo}
      className={cn(
        "grid overflow-hidden rounded-[24px] border border-borda-padrao bg-fundo-superficie",
        grande ? "sm:grid-cols-[minmax(0,2fr)_3fr]" : "grid-cols-[112px_1fr] sm:grid-cols-[180px_1fr]",
      )}
    >
      <FotoPendente iniciais={iniciais(membro.nome)} className={grande ? "aspect-[4/3] sm:aspect-auto sm:min-h-[320px]" : "min-h-[150px]"} rotulo={grande ? "[Foto a definir pelo sindicato]" : "[Foto]"} />
      <div className={cn("flex flex-col justify-center gap-3", grande ? "p-6 lg:p-12" : "p-5 lg:p-8")}>
        <Eyebrow>{membro.cargo}</Eyebrow>
        <h2 className={cn("text-texto-primario", grande ? "texto-titulo-secao-mobile lg:texto-titulo-secao" : "texto-titulo-card-grande")}>{membro.nome}</h2>
        {mensagem ? (
          <p className="texto-corpo flex gap-3 text-texto-secundario lg:texto-corpo-grande">
            <IconeFigma src="/site/icone-aspas.svg" tamanho={20} className="mt-1 text-destaque-amarelo" />
            <TextoDoSite texto={mensagem} />
          </p>
        ) : null}
      </div>
    </article>
  );
}

/** Sindicato › Diretoria (Figma 58:996 / 58:1368; RF03, US07). Estática nesta versão (C15). */
export default async function PaginaDiretoria() {
  const config = await lerConfigSite();
  const [presidente, vice, ...demais] = DIRETORIA.membros;
  const whatsapp = linkWhatsApp(config.contato.whatsappRecepcao);

  const numeros = [
    { valor: String(DIRETORIA.membros.length), rotulo: "membros na diretoria", icone: "/site/icone-pessoas.svg" },
    { valor: DIRETORIA.gestao, rotulo: "mandato atual", icone: "/site/icone-valor-autonomia.svg" },
    { valor: DIRETORIA.eleicao, rotulo: "eleição em assembleia", icone: "/site/icone-valor-responsabilidade.svg" },
  ];

  return (
    <>
      <section aria-labelledby="titulo-pagina" className="bg-fundo-marinho text-texto-invertido">
        <div className="conteudo-site flex flex-col gap-8 py-8 lg:flex-row lg:items-center lg:justify-between lg:py-14">
          <div className="flex flex-col gap-4">
            <Migalhas sobreEscuro itens={[{ rotulo: "Início", href: "/" }, { rotulo: "Sindicato" }, { rotulo: "Diretoria" }]} />
            <Eyebrow sobreEscuro className="mt-2 lg:mt-6">
              Gestão <TextoDoSite texto={DIRETORIA.gestao} />
            </Eyebrow>
            <h1 id="titulo-pagina" className="texto-display-mobile lg:texto-display">
              Diretoria
            </h1>
            <p className="texto-corpo max-w-[520px] text-texto-invertido-sec lg:texto-corpo-grande">{DIRETORIA.descricao}</p>
          </div>
          <dl className="flex flex-col divide-y divide-sobre-escuro-divisor rounded-[20px] border border-sobre-escuro-borda bg-sobre-escuro-superficie px-5 lg:min-w-[340px]">
            {numeros.map((n) => (
              <div key={n.rotulo} className="flex items-center gap-4 py-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-destaque-amarelo text-destaque-amarelo-texto">
                  <IconeFigma src={n.icone} tamanho={20} />
                </span>
                <div className="flex flex-col-reverse">
                  <dt className="texto-pequeno text-texto-invertido-sec">{n.rotulo}</dt>
                  <dd className="font-condensed text-[26px] leading-tight font-bold">
                    <TextoDoSite texto={n.valor} />
                  </dd>
                </div>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <AbasSindicato atual={SINDICATO.itens[1]!.href} />

      <div className="conteudo-site flex flex-col gap-6 pt-10 lg:gap-8 lg:pt-14">
        <Destaque membro={presidente!} mensagem={DIRETORIA.mensagemDoPresidente} tamanho="grande" />
        <Destaque membro={vice!} tamanho="medio" />
      </div>

      <section aria-labelledby="nossa-diretoria" className="conteudo-site flex flex-col gap-8 py-14 lg:gap-10 lg:py-20">
        <CabecalhoDeSecao
          id="nossa-diretoria"
          eyebrow={
            <>
              Gestão <TextoDoSite texto={DIRETORIA.gestao} />
            </>
          }
          titulo="Nossa diretoria"
          texto={<TextoDoSite texto={DIRETORIA.sobreAEscolha} />}
        />
        <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 lg:gap-6">
          {demais.map((membro) => (
            <li key={membro.nome} className="flex flex-col overflow-hidden rounded-[20px] border border-borda-padrao bg-fundo-superficie">
              <FotoPendente iniciais={iniciais(membro.nome)} rotulo="[Foto]" className="aspect-[4/3]" />
              <div className="flex flex-1 flex-col gap-1.5 p-4 lg:p-5">
                <p className="texto-etiqueta text-destaque-azul">{membro.cargo}</p>
                <h3 className="texto-titulo-card-pequeno text-texto-primario">{membro.nome}</h3>
              </div>
            </li>
          ))}
          <li className="flex flex-col gap-3 rounded-[20px] bg-destaque-amarelo p-4 text-destaque-amarelo-texto lg:p-6">
            <IconeFigma src="/site/icone-whatsapp.svg" tamanho={24} />
            <h3 className="texto-titulo-card">{FALAR_COM_A_DIRETORIA.titulo}</h3>
            <p className="texto-pequeno flex-1 opacity-85">{FALAR_COM_A_DIRETORIA.texto}</p>
            <Button asChild variant="marinho" className="h-auto min-h-12 w-full py-3 whitespace-normal">
              <a href={whatsapp} target="_blank" rel="noopener noreferrer">
                <IconeFigma src="/site/icone-whatsapp.svg" tamanho={18} />
                Fale no WhatsApp
              </a>
            </Button>
          </li>
        </ul>
      </section>

      <FilieSe linkFiliacao={linkWhatsApp(config.contato.whatsappRecepcao, config.mensagemFiliacao)} />
    </>
  );
}
