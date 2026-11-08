/**
 * Como cada pessoa aparece na lista Equipe e perfis (Figma 168:18397). Funções puras,
 * com as datas no horário da Bahia (RNF06).
 */

type Situacao = "pendente" | "ativa" | "desativada";

/** Coluna "Duas etapas": o convite não aceito fica Pendente (CA-US29.2). */
export function seloDuasEtapas(pessoa: { situacao: Situacao; duasEtapasAtivas: boolean }) {
  if (pessoa.situacao === "desativada") return "desativada";
  if (pessoa.situacao === "pendente" || !pessoa.duasEtapasAtivas) return "pendente";
  return "ativa";
}

const FUSO = "America/Bahia";
const DIA_MS = 24 * 60 * 60 * 1000;

/** Dia do calendário na Bahia, como número de dias desde 1970 (para contar "hoje", "ontem"…). */
function diaNaBahia(data: Date) {
  const [ano, mes, dia] = new Intl.DateTimeFormat("en-CA", { timeZone: FUSO, year: "numeric", month: "2-digit", day: "2-digit" })
    .format(data)
    .split("-")
    .map(Number);
  return Math.round(Date.UTC(ano!, mes! - 1, dia!) / DIA_MS);
}

function horaNaBahia(data: Date) {
  const partes = new Intl.DateTimeFormat("pt-BR", {
    timeZone: FUSO,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(data);
  const p = (tipo: Intl.DateTimeFormatPartTypes) => partes.find((x) => x.type === tipo)?.value ?? "";
  return `${p("hour")}h${p("minute")}`;
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
  return new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, day: "2-digit", month: "2-digit", year: "numeric" }).format(
    pessoa.ultimoAcesso,
  );
}
