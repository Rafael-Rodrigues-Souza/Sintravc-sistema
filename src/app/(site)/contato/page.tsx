import type { Metadata } from "next";

import { IconeFigma } from "@/components/icone-figma";
import { FilieSe } from "@/components/site/filie-se";
import { MapaComConsentimento } from "@/components/site/mapa-com-consentimento";
import { redesDoSite } from "@/components/site/redes";
import { CabecalhoDeSecao, Eyebrow, FotoPendente, Migalhas, TopoComFoto } from "@/components/site/partes-da-pagina";
import { Marcador, TextoDoSite } from "@/components/site/texto-do-site";
import { Button } from "@/components/ui/button";
import { CONTATO_PAGINA } from "@/conteudo/site";
import { lerConfigSite } from "@/lib/config-site";
import { formatarTelefone, formatarWhatsApp, linkEmail, linkFiliacao, linkMapaEmbutido, linkRota, linkTelefone, linkWhatsApp } from "@/lib/config-site/links";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Contato",
  description: "Telefone, WhatsApp, e-mail, endereço e horário de atendimento do SINTRAVC.",
};

const linkComSeta =
  "texto-botao alvo-toque inline-flex items-center gap-1.5 self-start rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring";

/** Contato (Figma 87:629 / 89:964; RF06, US05). Tudo vem da ConfigSite (RN43). */
export default async function PaginaContato() {
  const config = await lerConfigSite();
  const { contato, redes } = config;
  const enderecoCompleto = `${contato.endereco}, ${contato.cidade}`;
  const whatsapp = linkWhatsApp(contato.whatsappRecepcao);
  const telefone = formatarTelefone(contato.telefone);
  const numeroDoWhatsapp = formatarWhatsApp(contato.whatsappRecepcao);

  const redesSociais = redesDoSite(redes);
  const { hero, canais, sede, redes: textoRedes } = CONTATO_PAGINA;

  return (
    <>
      <section aria-labelledby="titulo-pagina" className="bg-fundo-marinho text-texto-invertido">
        <TopoComFoto
          texto={
            <>
              <Migalhas sobreEscuro itens={[{ rotulo: "Início", href: "/" }, { rotulo: "Contato" }]} />
              <Eyebrow sobreEscuro className="mt-2 lg:mt-6">
                {hero.eyebrow}
              </Eyebrow>
              <h1 id="titulo-pagina" className="texto-display-mobile lg:texto-display">
                {hero.titulo}
              </h1>
              <p className="texto-corpo max-w-[560px] text-texto-invertido-sec lg:texto-corpo-grande">
                {hero.texto}
              </p>
              <p className="texto-pequeno flex items-center gap-2 self-start rounded-full border border-sobre-escuro-borda bg-sobre-escuro-superficie px-3 py-1.5">
                <span aria-hidden className="size-2 shrink-0 rounded-full bg-destaque-amarelo" />
                <span>
                  Atendimento: <TextoDoSite texto={contato.horario} />
                </span>
              </p>
            </>
          }
          foto={
            <>
              <FotoPendente className="aspect-[358/250] w-full justify-start rounded-[24px] pt-8 lg:aspect-[4/3]" />
              <p className="absolute right-5 bottom-5 left-5 flex max-w-[300px] items-center gap-3 rounded-[16px] bg-destaque-amarelo p-4 text-destaque-amarelo-texto">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-destaque-marinho-fixo text-destaque-amarelo">
                  <IconeFigma src="/site/icone-local.svg" tamanho={18} />
                </span>
                <span className="flex flex-col">
                  <span className="font-bold">{hero.presencial}</span>
                  <span className="texto-pequeno">Sede em {contato.cidade}</span>
                </span>
              </p>
            </>
          }
          acoes={
            <>
              <Button asChild>
                <a href={whatsapp} target="_blank" rel="noopener noreferrer">
                  <IconeFigma src="/site/icone-whatsapp.svg" tamanho={18} />
                  Chamar no WhatsApp
                </a>
              </Button>
              <Button asChild variant="sobre-escuro">
                <a href={linkTelefone(contato.telefone)}>
                  <IconeFigma src="/site/icone-telefone.svg" tamanho={18} />
                  Ligar para o sindicato
                </a>
              </Button>
            </>
          }
        />
      </section>

      {/* Canais */}
      <section aria-labelledby="canais" className="conteudo-site flex flex-col gap-8 py-14 lg:gap-10 lg:py-20">
        <CabecalhoDeSecao
          id="canais"
          eyebrow={canais.eyebrow}
          titulo={canais.titulo}
          texto={canais.texto}
        />
        <ul className="grid gap-4 lg:grid-cols-3 lg:gap-6">
          <li className="flex flex-col gap-3 rounded-[20px] border border-borda-padrao bg-fundo-superficie p-6">
            <span className="flex size-11 items-center justify-center rounded-[12px] bg-destaque-azul-suave text-destaque-azul">
              <IconeFigma src="/site/icone-telefone.svg" tamanho={22} />
            </span>
            <h3 className="texto-titulo-card-grande mt-2 text-texto-primario">Telefone</h3>
            <p className="font-bold text-destaque-azul" data-testid="contato-telefone">
              {telefone}
            </p>
            <p className="texto-pequeno flex-1 text-texto-secundario">{canais.telefone}</p>
            <a href={linkTelefone(contato.telefone)} className={cn(linkComSeta, "text-destaque-azul")}>
              Ligar agora
              <IconeFigma src="/site/icone-seta-direita.svg" tamanho={16} />
            </a>
          </li>
          <li className="flex flex-col gap-3 rounded-[20px] bg-fundo-marinho p-6 text-texto-invertido">
            <div className="flex items-start justify-between">
              <span className="flex size-11 items-center justify-center rounded-[12px] bg-destaque-amarelo text-destaque-amarelo-texto">
                <IconeFigma src="/site/icone-whatsapp.svg" tamanho={22} />
              </span>
              <span className="texto-etiqueta rounded-full bg-destaque-amarelo px-2.5 py-1 text-destaque-amarelo-texto">Mais rápido</span>
            </div>
            <h3 className="texto-titulo-card-grande mt-2">WhatsApp</h3>
            <p className="font-bold text-destaque-amarelo">{numeroDoWhatsapp}</p>
            <p className="texto-pequeno flex-1 text-texto-invertido-sec">{canais.whatsapp}</p>
            <Button asChild className="w-full">
              <a href={whatsapp} target="_blank" rel="noopener noreferrer">
                <IconeFigma src="/site/icone-whatsapp.svg" tamanho={18} />
                Abrir conversa
              </a>
            </Button>
          </li>
          <li className="flex flex-col gap-3 rounded-[20px] border border-borda-padrao bg-fundo-superficie p-6">
            <span className="flex size-11 items-center justify-center rounded-[12px] bg-destaque-azul-suave text-destaque-azul">
              <IconeFigma src="/site/icone-email.svg" tamanho={22} />
            </span>
            <h3 className="texto-titulo-card-grande mt-2 text-texto-primario">E-mail</h3>
            <p className="font-bold break-all text-destaque-azul">{contato.email}</p>
            <p className="texto-pequeno flex-1 text-texto-secundario">{canais.email}</p>
            <a href={linkEmail(contato.email)} className={cn(linkComSeta, "text-destaque-azul")}>
              Enviar e-mail
              <IconeFigma src="/site/icone-seta-direita.svg" tamanho={16} />
            </a>
          </li>
        </ul>
      </section>

      {/* Sede */}
      <section aria-labelledby="sede" className="conteudo-site flex flex-col gap-8 pb-14 lg:gap-10 lg:pb-20">
        <CabecalhoDeSecao id="sede" eyebrow={sede.eyebrow} titulo={sede.titulo} />
        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,380px)_1fr] lg:gap-6">
          <address className="flex flex-col gap-4 rounded-[20px] border border-borda-padrao bg-fundo-superficie p-6 not-italic">
            <span className="flex size-11 items-center justify-center rounded-[12px] bg-fundo-marinho text-destaque-amarelo">
              <IconeFigma src="/site/icone-predio.svg" tamanho={22} />
            </span>
            <h3 className="texto-titulo-card-grande text-texto-primario">{sede.nome}</h3>
            <p className="texto-corpo flex gap-2.5 text-texto-secundario">
              <IconeFigma src="/site/icone-local.svg" tamanho={18} className="mt-1 text-destaque-azul" />
              <span>
                {contato.endereco}
                <br />
                {contato.cidade}
                <br />
                <TextoDoSite texto={contato.cep} prefixo="CEP" />
              </span>
            </p>
            <p className="texto-corpo flex gap-2.5 border-t border-borda-padrao pt-4 text-texto-secundario">
              <IconeFigma src="/site/icone-relogio.svg" tamanho={18} className="mt-1 text-destaque-azul" />
              <TextoDoSite texto={contato.horario} />
            </p>
            <p className="texto-pequeno flex items-center gap-2 rounded-[10px] bg-destaque-azul-suave px-3 py-2 text-texto-primario">
              <IconeFigma src="/site/icone-info.svg" tamanho={16} className="text-destaque-azul" />
              {sede.confirmeOHorario}
            </p>
            <Button asChild className="mt-auto h-auto min-h-12 py-3 whitespace-normal">
              <a href={linkRota(enderecoCompleto)} target="_blank" rel="noopener noreferrer">
                <IconeFigma src="/site/icone-seta-diagonal.svg" tamanho={18} />
                Abrir rota no Google Maps
              </a>
            </Button>
          </address>
          <MapaComConsentimento src={linkMapaEmbutido(enderecoCompleto)} className="min-h-[320px] lg:min-h-[420px]" />
        </div>
      </section>

      {/* Redes */}
      <section aria-labelledby="redes" className="bg-fundo-marinho text-texto-invertido">
        <div className="conteudo-site grid gap-8 py-14 lg:grid-cols-[minmax(0,400px)_1fr] lg:items-center lg:gap-16 lg:py-20">
          <div className="flex flex-col gap-4">
            <Eyebrow sobreEscuro>{textoRedes.eyebrow}</Eyebrow>
            <h2 id="redes" className="texto-titulo-secao-mobile lg:texto-titulo-secao">
              {textoRedes.titulo}
            </h2>
            <p className="texto-corpo text-texto-invertido-sec">{textoRedes.texto}</p>
          </div>
          <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-[repeat(2,minmax(0,1fr))] lg:gap-4">
            {redesSociais.map((rede) => {
              const conteudo = (
                <>
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-[12px] bg-destaque-amarelo text-destaque-amarelo-texto">
                    <IconeFigma src={rede.icone} tamanho={22} />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="font-bold">{rede.nome}</span>
                    {rede.href ? (
                      <span className="texto-pequeno truncate text-texto-invertido-sec">{rede.href.replace(/^https:\/\/(www\.)?/, "")}</span>
                    ) : (
                      <Marcador className="texto-pequeno self-start">[Link a definir pelo sindicato]</Marcador>
                    )}
                  </span>
                  {rede.href ? <IconeFigma src="/site/icone-seta-diagonal.svg" tamanho={18} /> : null}
                </>
              );
              const caixa = "flex min-h-[76px] items-center gap-4 rounded-[16px] border border-sobre-escuro-borda bg-sobre-escuro-superficie p-4";
              return (
                <li key={rede.nome} className="min-w-0">
                  {rede.href ? (
                    <a href={rede.href} target="_blank" rel="noopener noreferrer" className={cn(caixa, "outline-none hover:bg-sobre-escuro-chip focus-visible:ring-[3px] focus-visible:ring-destaque-amarelo")}>
                      {conteudo}
                    </a>
                  ) : (
                    <div className={caixa}>{conteudo}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <div className="pt-14 lg:pt-20">
        <FilieSe linkFiliacao={linkFiliacao(config)} />
      </div>
    </>
  );
}
