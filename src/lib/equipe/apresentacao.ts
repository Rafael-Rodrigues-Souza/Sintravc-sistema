/**
 * Como cada pessoa aparece na lista Equipe e perfis (Figma 168:18397). Funções puras,
 * com as datas no horário da Bahia (RNF06).
 */

import { dataNaBahia, diaNaBahia, horaNaBahia } from "@/lib/datas";
import type { pessoaEquipe } from "@/lib/db/schema";

type Situacao = (typeof pessoaEquipe.$inferSelect)["situacao"];

/** Coluna "Duas etapas": o convite não aceito fica Pendente (CA-US29.2). */
export function seloDuasEtapas(pessoa: { situacao: Situacao; duasEtapasAtivas: boolean }) {
  if (pessoa.situacao === "desativada") return "desativada";
  if (pessoa.situacao === "pendente" || !pessoa.duasEtapasAtivas) return "pendente";
  return "ativa";
}

/** Coluna "Último acesso". */
export function ultimoAcessoNaLista(
  pessoa: { situacao: Situacao; ultimoAcesso: Date | null },
  { agora, ehVoce }: { agora: Date; ehVoce: boolean },
): string {
  if (pessoa.situacao === "pendente") return "Convite enviado";
  if (ehVoce) return "Agora (você)";
  if (!pessoa.ultimoAcesso) return "Ainda não entrou";

  const dias = diaNaBahia(agora) - diaNaBahia(pessoa.ultimoAcesso);
  if (dias <= 0) return `Hoje, ${horaNaBahia(pessoa.ultimoAcesso)}`;
  if (dias === 1) return `Ontem, ${horaNaBahia(pessoa.ultimoAcesso)}`;
  if (dias <= 7) return `Há ${dias} dias`;
  return dataNaBahia(pessoa.ultimoAcesso);
}
