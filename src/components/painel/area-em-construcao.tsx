import { EstadoDaTela } from "@/components/painel/estado-da-tela";

/** Área que já existe no menu e já confere a permissão, mas cuja tela chega em outro ticket. */
export function AreaEmConstrucao({ nome }: { nome: string }) {
  return (
    <EstadoDaTela
      icone="/painel/menu-documento.svg"
      eyebrow={nome}
      titulo="Esta área chega em breve"
      acao={{ rotulo: "Voltar para a Visão geral", href: "/painel" }}
    >
      A tela de {nome} ainda está sendo construída. Por enquanto, use as outras áreas do menu.
    </EstadoDaTela>
  );
}
