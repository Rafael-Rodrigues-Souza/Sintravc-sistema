/**
 * Código de recuperação como a pessoa digitou → formato guardado (XXXXX-XXXXX, só maiúsculas; E37).
 * Aceita minúsculas, espaços e qualquer traço (o celular troca "-" por "–"). Sem 10 caracteres,
 * devolve vazio: a tela pede o código de novo, sem gastar uma tentativa.
 */
export function normalizarCodigoRecuperacao(digitado: string): string {
  const bruto = digitado.toUpperCase().replace(/[\s\p{Pd}]/gu, "");
  if (!/^[A-Z0-9]{10}$/.test(bruto)) return "";
  return `${bruto.slice(0, 5)}-${bruto.slice(5)}`;
}
