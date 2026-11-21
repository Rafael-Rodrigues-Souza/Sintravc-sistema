import type { Metadata } from "next";

import { exigirArea } from "@/lib/acesso/sessao-da-equipe";
import { urlPublica } from "@/lib/armazenamento";
import { bahiaEmCampos, dataNaBahia } from "@/lib/datas";
import { lerEnvArmazenamento } from "@/lib/env";
import { listarEpisodios, proximoNumero, temasDoRadio, ultimoProgramaMarcado } from "@/lib/episodios/episodios";
import { lerProgramaAoVivo } from "@/lib/episodios/gravar-programa";
import { textoDaHora } from "@/lib/episodios/programa";
import { limitesDaMidia } from "@/lib/midia/enviar";
import { erroDeTamanho } from "@/lib/midia/erros";
import { pode } from "@/lib/permissoes";
import { textoDaDuracao } from "@/lib/youtube/duracao";

import { AreaRadio, type EpisodioNaLista } from "./area-radio";

export const metadata: Metadata = { title: "Rádio Chofer" };

const POR_PAGINA = 20;

/**
 * Rádio Chofer no painel (RF45, P10; Figma 166:17373 e o modal 166:17629): o programa ao vivo, a
 * lista de episódios com o estado e o menu ⋯, e “Adicionar episódio”. Sem frame mobile: segue o E50.
 * `?novo=1` abre o modal vazio (menu “Criar conteúdo”).
 */
export default async function PaginaRadio({ searchParams }: { searchParams: Promise<{ pagina?: string; novo?: string }> }) {
  const pessoa = await exigirArea("radio");
  const p = await searchParams;
  const pagina = Math.max(1, Number.parseInt(p.pagina ?? "1", 10) || 1);
  const deps = { quem: pessoa.quem };
  const podeGerenciar = pode(pessoa.quem, "gerenciar", { tipo: "radio" });

  const [lista, programa, numero, temas, ultimo, limites] = await Promise.all([
    listarEpisodios({ pagina, porPagina: POR_PAGINA }, deps),
    lerProgramaAoVivo(deps),
    podeGerenciar ? proximoNumero(deps) : Promise.resolve(1),
    podeGerenciar ? temasDoRadio(deps) : Promise.resolve([]),
    ultimoProgramaMarcado(deps),
    limitesDaMidia(),
  ]);
  const env = lista.itens.some((e) => e.capaChave) ? lerEnvArmazenamento() : null;

  const episodios: EpisodioNaLista[] = lista.itens.map((e) => ({
    id: e.id,
    numero: e.numero,
    titulo: e.titulo,
    capaUrl: e.capaChave && env ? urlPublica(e.capaChave, env) : `/painel/radio/capa/${e.youtubeId}`,
    exibicao: e.exibicaoEm ? `${dataNaBahia(e.exibicaoEm)} · ${textoDaHora(bahiaEmCampos(e.exibicaoEm).hora)}` : null,
    duracao: e.duracaoSeg ? textoDaDuracao(e.duracaoSeg) : null,
    duracaoSeg: e.duracaoSeg,
    ultimoPrograma: e.ultimoPrograma,
    situacao: e.situacao,
    podeExcluir: e.situacao === "rascunho" && !e.jaPublicado,
  }));

  return (
    <AreaRadio
      episodios={episodios}
      pagina={pagina}
      totalDePaginas={Math.max(1, Math.ceil(lista.total / POR_PAGINA))}
      programa={programa}
      podeGerenciar={podeGerenciar}
      proximoNumero={numero}
      temas={temas}
      ultimoMarcado={ultimo}
      limites={{ tamanhoMaximoBytes: limites.tamanhoMaximoBytes, mensagemDeTamanho: erroDeTamanho(limites.tamanhoMaximoBytes).message }}
      novo={p.novo === "1"}
    />
  );
}
