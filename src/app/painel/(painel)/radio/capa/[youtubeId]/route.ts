import { conferirSessaoDaEquipe, sessaoRecusada } from "@/lib/acesso/sessao-da-equipe";
import { lerCapaPadrao, respostaDeImagem } from "@/lib/episodios/capa";
import { pode } from "@/lib/permissoes";
import { ehIdDoYoutube } from "@/lib/youtube/link";
import { youtubeDoSistema } from "@/lib/youtube/youtube";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * A capa do vídeo no painel (E61): a prévia do modal “Adicionar episódio”, antes de salvar, e a lista.
 * Só para quem gerencia o Rádio Chofer; passa pelo servidor, para o painel não depender do
 * i.ytimg.com no navegador. Sem capa no YouTube, a padrão.
 */
export async function GET(request: Request, { params }: { params: Promise<{ youtubeId: string }> }) {
  const pessoa = await conferirSessaoDaEquipe(request.headers);
  if (sessaoRecusada(pessoa)) return new Response(null, { status: 401 });
  if (!pode(pessoa.quem, "gerenciar", { tipo: "radio" })) return new Response(null, { status: 403 });
  const { youtubeId } = await params;
  if (!ehIdDoYoutube(youtubeId)) return new Response(null, { status: 404 });
  const capa = await youtubeDoSistema().baixarCapa(youtubeId);
  return capa ? respostaDeImagem(capa.bytes, capa.tipo, "private, max-age=3600") : respostaDeImagem(await lerCapaPadrao(), "image/jpeg", "private, max-age=300");
}
