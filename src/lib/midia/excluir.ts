import { eq } from "drizzle-orm";

import { armazenamentoS3, type Armazenamento } from "@/lib/armazenamento";
import { registrarAtividade } from "@/lib/atividade";
import { banco } from "@/lib/db";
import { midia } from "@/lib/db/schema";
import { pode, SemPermissao } from "@/lib/permissoes";

import type { QuemEnvia } from "./enviar";
import { ErroMidia } from "./erros";
import { usosDasMidias } from "./usos";

/**
 * Exclui um arquivo da Mídia que não esteja em uso (RF49, RN16). A exclusão é definitiva e pede
 * confirmação na tela. A linha é travada (FOR UPDATE) enquanto os usos são contados: quem for
 * passar a usar o arquivo ao mesmo tempo espera, e a chave estrangeira da midia_uso também impede.
 *
 * O objeto do S3 é apagado depois do commit. Se o S3 falhar, o objeto fica órfão no bucket
 * versionado (D3) e o erro vai para o log; a exclusão no banco continua valendo.
 */
export async function excluirMidia(
  id: string,
  deps: { quem: QuemEnvia; armazenamento?: Armazenamento },
): Promise<void> {
  const armazenamento = deps.armazenamento ?? armazenamentoS3;

  const chave = await banco().transaction(async (tx) => {
    const [arquivo] = await tx.select().from(midia).where(eq(midia.id, id)).for("update");
    if (!arquivo) throw new ErroMidia("nao_encontrada", "Este arquivo não está mais na Mídia. Atualize a página.");

    // Primeiro o perfil; só quem pode excluir fica sabendo onde o arquivo é usado.
    if (!pode(deps.quem, "excluir", { tipo: "midia", emUso: false })) throw new SemPermissao("excluir", "midia");
    const usos = (await usosDasMidias([id], tx)).get(id) ?? [];
    if (!pode(deps.quem, "excluir", { tipo: "midia", emUso: usos.length > 0 })) {
      const conteudos = usos.length === 1 ? "1 conteúdo" : `${usos.length} conteúdos`;
      throw new ErroMidia("em_uso", `Não é possível excluir: o arquivo está em uso em ${conteudos}.`, usos);
    }

    await tx.delete(midia).where(eq(midia.id, id));
    await registrarAtividade(tx, {
      ator: { tipo: "pessoa", id: deps.quem.id },
      acao: "midia.excluir",
      area: "midia",
      alvo: { tipo: "midia", id, rotulo: arquivo.nomeArquivo },
      detalhe: { tipo: arquivo.tipo, mime: arquivo.mime, bytes: arquivo.bytes },
    });
    return arquivo.chaveR2;
  });

  await armazenamento.apagar(chave).catch((erro: unknown) => {
    console.error(`[midia] Não foi possível apagar ${chave} do armazenamento.`, erro);
  });
}
