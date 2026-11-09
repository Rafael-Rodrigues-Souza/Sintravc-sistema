import type { Arquivo, Armazenamento } from "@/lib/armazenamento";

/** Armazenamento falso para os testes da Mídia: guarda os objetos num Map. `falhar` simula o S3 fora do ar. */
export function armazenamentoEmMemoria(opcoes: { falharAoEnviar?: boolean; falharAoApagar?: boolean } = {}) {
  const objetos = new Map<string, Arquivo>();
  const armazenamento: Armazenamento = {
    async enviar(arquivo) {
      if (opcoes.falharAoEnviar) throw new Error("S3 fora do ar (simulado)");
      objetos.set(arquivo.chave, arquivo);
      return { chave: arquivo.chave, url: `http://s3.teste/${arquivo.chave}` };
    },
    async apagar(chave) {
      if (opcoes.falharAoApagar) throw new Error("S3 fora do ar (simulado)");
      objetos.delete(chave);
    },
  };
  return { armazenamento, objetos };
}
