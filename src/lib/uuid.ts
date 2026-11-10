const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** O texto é um uuid (ex.: id vindo da URL ou do navegador)? */
export function ehUuid(texto: unknown): texto is string {
  return typeof texto === "string" && UUID.test(texto);
}
