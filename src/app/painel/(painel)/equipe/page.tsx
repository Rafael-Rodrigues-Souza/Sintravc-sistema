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

      <section aria-label="Pessoas da equipe" className="overflow-hidden rounded-[16px] border border-borda-padrao bg-fundo-superficie">
        {/* A mesma grade no cabeçalho e nas linhas. Pessoa fica com o espaço que sobra; “Último acesso”
            só vira coluna no xl e, entre md e xl, aparece embaixo do e-mail (E48). */}
        <div role="table" aria-label="Equipe" className="flex flex-col">
          <div role="row" className={cn("hidden bg-fundo-superficie-alt px-6 py-2.5", GRADE)}>
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
                className={cn("flex flex-col gap-3 border-b border-borda-padrao px-6 py-3.5 last:border-b-0", GRADE)}
              >
                <div role="cell" className="flex min-w-0 items-center gap-3">
                  <span
                    aria-hidden
                    className={cn(
                      "flex size-10 shrink-0 items-center justify-center rounded-full texto-etiqueta text-destaque-marinho-fixo",
                      ehVoce ? "bg-destaque-amarelo" : "bg-status-neutro-fundo",
                    )}
                  >
                    {iniciais(integrante.nome)}
                  </span>
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <p className="truncate texto-titulo-card-pequeno text-texto-primario">{integrante.nome}</p>
                    <p className="truncate texto-pequeno text-texto-secundario">{integrante.email}</p>
                    <p className="hidden truncate texto-pequeno text-texto-terciario md:block xl:hidden">
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

/** Colunas da Equipe a partir do md: Pessoa com o que sobra, as outras com largura fixa. */
const GRADE =
  "md:grid md:grid-cols-[minmax(0,1fr)_12rem_8rem] md:items-center md:gap-4 xl:grid-cols-[minmax(0,1fr)_12rem_8rem_9rem]";

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
