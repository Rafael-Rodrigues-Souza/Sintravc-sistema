/**
 * Dados que viajam entre a tela e o servidor (server actions) têm de ser JSON simples.
 *
 * O ProseMirror (base do Tiptap) cria os atributos de cada nó com Object.create(null). O React não
 * envia objetos sem protótipo para uma server action: no lugar, manda uma "referência temporária",
 * que no servidor é uma função opaca e dá erro em qualquer leitura. Por isso a tela converte antes de
 * enviar (paraJsonSimples) e o servidor recusa o que não for JSON simples (ehJsonSimples).
 */

/** Cópia em JSON puro: objetos comuns, listas, texto, número, booleano e nulo. */
export function paraJsonSimples<T>(valor: T): T {
  return JSON.parse(JSON.stringify(valor)) as T;
}

/**
 * É JSON simples? Confere sem ler campos de nada que não seja objeto comum ou lista (uma referência
 * temporária do React chega como função, e ler um campo dela dá erro).
 */
export function ehJsonSimples(valor: unknown): boolean {
  if (valor === null) return true;
  switch (typeof valor) {
    case "string":
    case "boolean":
      return true;
    case "number":
      return Number.isFinite(valor);
    case "object": {
      if (Array.isArray(valor)) return valor.every(ehJsonSimples);
      const prototipo = Object.getPrototypeOf(valor);
      if (prototipo !== Object.prototype && prototipo !== null) return false;
      return Object.values(valor).every(ehJsonSimples);
    }
    default:
      return false;
  }
}
