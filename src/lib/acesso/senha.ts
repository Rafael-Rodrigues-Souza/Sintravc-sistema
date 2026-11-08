/** Requisitos da senha da equipe (RN47). A tela mostra cada um com o seu aviso. */
export type RequisitoDaSenha = "minimo" | "letras_e_numeros" | "diferente_do_email" | "diferente_do_nome";

/** Sem acentos, sem espaços, em minúsculas: "José Antônio" e "joseantonio" contam como iguais. */
function comparavel(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, "")
    .toLowerCase();
}

export function validarSenhaDaEquipe(dados: {
  senha: string;
  email: string;
  nome: string;
  /** equipe.senha_minimo_caracteres, do Parametro. */
  minimo: number;
}): RequisitoDaSenha[] {
  const { senha, email, nome, minimo } = dados;
  const faltando: RequisitoDaSenha[] = [];
  if (senha.length < minimo) faltando.push("minimo");
  if (!/\p{L}/u.test(senha) || !/\p{N}/u.test(senha)) faltando.push("letras_e_numeros");

  const senhaComparavel = comparavel(senha);
  const emailInteiro = comparavel(email);
  const antesDoArroba = emailInteiro.split("@")[0] ?? "";
  if (senhaComparavel === emailInteiro || senhaComparavel === antesDoArroba) faltando.push("diferente_do_email");
  if (senhaComparavel === comparavel(nome)) faltando.push("diferente_do_nome");
  return faltando;
}
