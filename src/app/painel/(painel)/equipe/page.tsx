import type { Metadata } from "next";

import { exigirArea } from "@/lib/acesso/sessao-da-equipe";
import { seloDuasEtapas, ultimoAcessoNaLista } from "@/lib/equipe/apresentacao";
import { listarEquipe } from "@/lib/equipe/lista";
import { lerParametro } from "@/lib/parametros";
import { NOME_DO_PERFIL, perfisConvidaveis, pode, type Perfil } from "@/lib/permissoes";
import { cn } from "@/lib/utils";

import { ConvidarPessoa } from "./convidar-pessoa";

export const metadata: Metadata = { title: "Equipe e perfis" };

/**
 * Equipe e perfis, primeira versão (RF51; Figma 168:18397): a lista e "Convidar pessoa".
 * O menu de ações da pessoa (RF76) e os responsáveis por serviço (Fase 2) chegam em outros tickets.
 */
export default async function PaginaEquipe() {
  const pessoa = await exigirArea("equipe");
  const equipe = await listarEquipe();
  const agora = new Date();
  const podeConvidar = pode(pessoa.quem, "convidar", { tipo: "equipe" });

  return (
    <div className="flex flex-col gap-7 px-5 py-8 lg:px-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-col gap-1.5">
          <h1 className="texto-titulo-card-grande text-texto-primario">Equipe e perfis</h1>
          <p className="texto-corpo text-texto-secundario">
            Quem acessa o painel e o que cada perfil pode fazer. Somente administradores gerenciam a equipe.
          </p>
        </div>
        {podeConvidar ? <ConvidarPessoa perfis={perfisConvidaveis()} validadeHoras={await lerParametro("convite.validade_horas")} /> : null}
      </header>

      <section aria-label="Pessoas da equipe" className="@container overflow-hidden rounded-[16px] border border-borda-padrao bg-fundo-superficie">
        {/* Uma grade só (subgrid nas linhas), com as colunas medidas pelo conteúdo de todas as linhas.
            Quem encolhe primeiro são Perfil e Duas etapas; nome e e-mail, por último (E48). “Último
            acesso” só vira coluna no xl e, entre md e xl, aparece embaixo do e-mail. */}
        <div role="table" aria-label="Equipe" className={cn("flex flex-col", GRADE)}>
          <div role="row" className={cn("hidden bg-fundo-superficie-alt px-6 py-2.5", LINHA)}>
            <span role="columnheader" className="texto-etiqueta text-texto-terciario">Pessoa</span>
            <span role="columnheader" className="texto-etiqueta text-texto-terciario">Perfil</span>
            <span role="columnheader" className="texto-etiqueta text-texto-terciario">Duas etapas</span>
            <span role="columnheader" className="hidden texto-etiqueta text-texto-terciario xl:block">Último acesso</span>
          </div>
          {equipe.map((integrante) => {
            const ehVoce = integrante.id === pessoa.id;
            const selo = seloDuasEtapas(integrante);
            return (
              <div
                key={integrante.id}
                role="row"
                className={cn("flex flex-col gap-3 border-b border-borda-padrao px-6 py-3.5 last:border-b-0", LINHA)}
              >
                <div role="cell" className="flex min-w-0 items-center gap-3">
                  {/* Iniciais com contraste de 4,5:1 nos dois temas (RNF09, #48): o marinho fixo só sobre o
                      amarelo do “você”; nos outros, a cor do texto do tema (no claro, quase o marinho do Figma). */}
                  <span
                    aria-hidden
                    data-testid="avatar-da-pessoa"
                    className={cn(
                      "flex size-10 shrink-0 items-center justify-center rounded-full texto-etiqueta",
                      ehVoce ? "bg-destaque-amarelo text-destaque-marinho-fixo" : "bg-status-neutro-fundo text-texto-primario",
                    )}
                  >
                    {iniciais(integrante.nome)}
                  </span>
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <p className={cn("truncate texto-titulo-card-pequeno text-texto-primario", TETO_DA_PESSOA)}>{integrante.nome}</p>
                    <p className={cn("truncate texto-pequeno text-texto-secundario", TETO_DA_PESSOA)}>{integrante.email}</p>
                    {/* Não conta para a largura mínima da Pessoa: só o nome e o e-mail contam. Quando não
                        cabe ao lado, desce para a linha de baixo em vez de ser cortado (#51). */}
                    <p className="hidden texto-pequeno break-words text-texto-terciario [contain:inline-size] md:block xl:hidden">
                      Último acesso: {ultimoAcessoNaLista(integrante, { agora, ehVoce })}
                    </p>
                  </div>
                </div>
                <div role="cell" className="min-w-0">
                  <SeloPerfil perfil={integrante.perfil} />
                </div>
                <div role="cell" className="min-w-0">
                  <SeloSituacao selo={selo} />
                </div>
                <p role="cell" className="texto-pequeno text-texto-secundario md:hidden xl:block">
                  {ultimoAcessoNaLista(integrante, { agora, ehVoce })}
                </p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

/**
 * Colunas da Equipe a partir do md. Pessoa nunca fica menor que o nome e o e-mail inteiros
 * (min-content); Perfil, Duas etapas e Último acesso vão até a largura do desenho, mas encolhem antes
 * da Pessoa até um mínimo fixo (8, 6 e 7rem, onde os selos cabem, quebrando a linha se preciso). A
 * última coluna leva no mínimo também a margem da direita da linha (1.5rem). Com nome ou e-mail longo
 * demais, o corte com reticências é o último recurso (TETO_DA_PESSOA).
 */
const GRADE =
  "md:grid md:grid-cols-[minmax(min-content,1fr)_minmax(8rem,12rem)_minmax(7.5rem,8rem)] md:gap-x-4 xl:grid-cols-[minmax(min-content,1fr)_minmax(8rem,12rem)_minmax(6rem,8rem)_minmax(8.5rem,9rem)]";

/** Cada linha (e o cabeçalho) usa as colunas da GRADE. */
const LINHA = "md:col-span-full md:grid md:grid-cols-subgrid md:items-center md:gap-x-4";

/**
 * Nome e e-mail pedem no máximo a largura da tabela menos o resto da linha no mínimo: margem da
 * esquerda (1.5rem), avatar e vão (3.25rem), vãos entre colunas (1rem cada) e o mínimo das outras
 * colunas da GRADE (a margem da direita já está no mínimo da última). Assim a
 * grade nunca passa da largura da tabela, e o nome só é cortado com as outras colunas no mínimo.
 */
const TETO_DA_PESSOA = "md:max-w-[calc(100cqw_-_1.5rem_-_3.25rem_-_2rem_-_8rem_-_7.5rem)] xl:max-w-[calc(100cqw_-_1.5rem_-_3.25rem_-_3rem_-_8rem_-_6rem_-_8.5rem)]";

/** "Mariana Souza" → "MS". Ignora o que não começa com letra, como "(teste)". */
function iniciais(nome: string) {
  const partes = nome.split(/\s+/).filter((palavra) => /^\p{L}/u.test(palavra));
  return ((partes[0]?.[0] ?? "") + (partes.length > 1 ? (partes.at(-1)?.[0] ?? "") : "")).toUpperCase();
}

const COR_DO_PERFIL: Record<Perfil, string> = {
  ADM: "bg-destaque-azul-suave text-destaque-azul",
  COM: "bg-status-neutro-fundo text-status-neutro-texto",
  ATD: "bg-status-neutro-fundo text-status-neutro-texto",
};

function SeloPerfil({ perfil }: { perfil: Perfil }) {
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-1 texto-etiqueta", COR_DO_PERFIL[perfil])}>
      {NOME_DO_PERFIL[perfil]}
    </span>
  );
}

const SELOS = {
  ativa: { rotulo: "Ativa", cor: "bg-status-sucesso-fundo text-status-sucesso-texto" },
  pendente: { rotulo: "Pendente", cor: "bg-status-aviso-fundo text-status-aviso-texto" },
  desativada: { rotulo: "Desativada", cor: "bg-status-neutro-fundo text-status-neutro-texto" },
} as const;

function SeloSituacao({ selo }: { selo: keyof typeof SELOS }) {
  const { rotulo, cor } = SELOS[selo];
  return <span className={cn("inline-flex rounded-full px-2.5 py-1 texto-etiqueta", cor)}>{rotulo}</span>;
}
