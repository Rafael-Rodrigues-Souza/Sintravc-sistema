# Guia visual do SINTRAVC

Este é o guia de aparência do site público e do painel. Leia antes de criar ou mudar uma tela. Ele nasceu do passe de design da issue #75 (E63) e descreve a direção escolhida pela diretoria do sindicato e o que já existe no resto do site.

Este guia **não repete valores**. Cores, fontes e tamanhos de tela ficam num lugar só, e aqui só se aponta para eles.

## Princípios

O site é para o trabalhador rodoviário de Vitória da Conquista, que muitas vezes abre o celular no intervalo, com pressa e com sol na tela.

1. **Simples.** Uma ideia por bloco. Se precisar explicar como usa, está complicado.
2. **Intuitivo.** O botão diz o que faz (“Filiar-se pelo WhatsApp”, “Ler notícia”, “Publicar alterações”), e a mesma ação tem o mesmo nome em todo lugar.
3. **Moderno sem modismo.** Formas arredondadas, espaço para respirar, letra condensada forte nos títulos. Nada de efeito que só enfeita.
4. **Acolhedor.** O topo é claro e calmo, sem faixas pesadas empilhadas. O marinho e o amarelo do sindicato aparecem onde chamam a atenção, não em tudo.
5. **Legível sempre.** Contraste AA nos dois temas (RNF09), toque de pelo menos o mínimo do `RESPONSIVO`, foco visível no teclado e respeito ao “reduzir movimento”.

## Cores e tokens

- **Onde ficam:** `src/app/globals.css`. Os tokens vêm do Figma (coleção “SINTRAVC 2.0”), em dois modos, `:root` (claro) e `.dark` (escuro). Para mudar uma cor, mude ali e no Figma.
- **Use sempre o token, nunca o hexadecimal:** `fundo-*`, `texto-*`, `borda-*`, `destaque-*`, `etiqueta-*`, `status-*` e `sobre-escuro-*` (para texto e controles sobre fundo marinho, iguais nos dois temas).
- **Papéis:**
  - **Marinho** (`fundo-marinho`, `fundo-marinho-profundo`): blocos de destaque (o carrossel da Home, o rodapé, o Filie-se). Nos dois temas.
  - **Amarelo** (`destaque-amarelo`, com texto `destaque-amarelo-texto`): a ação principal (“Filiar-se”, “Ler notícia”) e a faixa de comunicado. Um amarelo por área da tela, no máximo dois.
  - **Azul** (`destaque-azul`, `destaque-azul-suave`): links, o item atual do menu (pílula) e as seleções no painel.
  - **Vermelho** (`destaque-vermelho`): só perigo (excluir, tirar do ar).
- **Tema escuro:** toda tela nova é conferida nos dois temas. Fundo branco esquecido e logo que some no escuro são defeito.

## Tipografia

- **Famílias:** Barlow (texto) e Barlow Condensed (títulos), carregadas em `src/app/layout.tsx`.
- **Estilos:** os utilitários `texto-*` de `globals.css` (`texto-display`, `texto-titulo-secao`, `texto-titulo-card`, `texto-corpo`, `texto-pequeno`, `texto-navegacao`, `texto-botao`, `texto-eyebrow`, `texto-etiqueta`…). Use um deles antes de criar tamanho novo.
- **Títulos do carrossel (E63):** condensada em negrito, em caixa normal. A caixa alta fica para etiquetas curtas (selos, “Comunicado”).
- **Linhas:** até cerca de 70 caracteres no texto corrido. A frase da Chamada tem limite no Parametro (`home.chamada_frase_maximo`) justamente para caber grande.

## Espaço, raios e sombras

- **Largura:** o utilitário `conteudo-site` dá a largura do conteúdo e as margens do celular e do tablet. Não crie outra.
- **Espaçamento:** a escala do Tailwind. Blocos do site respiram mais no computador (`lg:py-*`) do que no celular.
- **Raios:** campos e controles pequenos usam os raios do tema (`rounded-md`, `rounded-lg`); botões são pílula (`rounded-full`); cartões do site ficam entre 14 e 24 px, e o maior raio vai para o maior bloco. Cartão dentro de cartão tem raio menor que o de fora.
- **Sombras:** poucas. O cabeçalho ganha sombra só depois de rolar; menus e diálogos têm sombra para sair do fundo. Cartão parado na página usa borda (`borda-padrao`), não sombra.

## Tamanhos de tela

Os tamanhos ficam só no objeto `RESPONSIVO` do `playwright.config.ts`. No celular e no tablet em pé, a tela segue o frame mobile do Figma (E49) ou, sem ele, o padrão mobile do E50. Para conferir, use a skill `conferir-responsivo`. A varredura do fim do bloco do site roda também a skill `web-design-guidelines`.

## Imagens

- **Só pela Mídia**, nunca no repositório (o repositório é público). Exemplos e testes usam imagens geradas no código.
- **Foto com pessoa só com autorização** (D12).
- **Texto alternativo sempre**: descreve o que a foto mostra, para quem não vê.
- **Tom:** fotos reais do dia a dia da categoria (ônibus, garagem, sede, assembleia), com luz natural. Evite banco de imagens genérico e montagem com texto dentro da foto: o texto vai na página, por cima, com contraste.
- **Corte:** o CSS corta (`object-cover`). Para o carrossel, prefira fotos horizontais com um lado mais calmo, onde fica o texto. O peso das imagens é a issue #77.

## Padrões de componentes

### Topo (E63)

- **Cabeçalho:** logo, menu, alternador de tema e “Filiar-se”. Sem busca e sem telefone. Preso no alto; sem borda no topo da página, com borda e sombra leve depois de rolar (`cabecalho-fixo.tsx`).
- **Menu:** o item atual fica numa pílula azul-clara; os outros ganham um fundo leve com o mouse. Submenus abrem no clique, no toque e no teclado.
- **Celular:** logo, tema e o botão do menu. O menu em tela cheia tem as seções, o “Filiar-se pelo WhatsApp”, o telefone e o horário.
- **Faixa de comunicado:** amarela de ponta a ponta, logo abaixo do cabeçalho, com as regras do E58.

### Carrossel da Home (E62, E63)

- A foto ocupa a seção marinha de ponta a ponta. O texto fica sobre um degradê marinho forte do lado dele (embaixo no celular, à esquerda no computador). É isso que garante o contraste com qualquer foto.
- Tipos: notícia (com capa), episódio, programa e Chamada (foto, frase, texto de apoio e botão para um destino fechado).
- Altura da tela: do fim do topo até o fim da janela, com mínimo e máximo (o “Acesso rápido” não aparece logo de cara).
- Controles: Anterior, Próximo e os traços (um por slide; o atual mais longo e amarelo; tocar leva ao slide), deslize e ←/→. Sem botão Pausar: a troca para com o mouse em cima ou o foco dentro, para de vez quando a pessoa passa os slides e não acontece com “reduzir movimento” (como a faixa do E58).

### Cartões

- Fundo `fundo-superficie`, borda `borda-padrao`, raio de cartão e padding generoso. Selo de categoria com as cores de `selo-categoria.tsx`; sobre fundo marinho, o selo ganha um contorno claro.

### Botões

- `src/components/ui/button.tsx`: `primario` (amarelo, a ação principal), `secundario` (contorno), `perigo` (vermelho). Um primário por bloco.
- Sobre fundo marinho, o secundário usa os tokens `sobre-escuro-*`.
- Botão que abre fora do site (WhatsApp) mostra o ícone e abre em outra aba.

### Estados (E23)

- **Formulários:** o Alerta 2.0 (`alerta.tsx`) no topo do formulário e a mensagem embaixo do campo, ligada por `aria-describedby`.
- **Vazio:** ícone, uma frase e uma ação.
- **Carregando:** Skeleton (`skeleton.tsx`).
- **Confirmação:** AlertDialog (`alert-dialog.tsx`).
- **Avisos rápidos:** Sonner (`sonner.tsx`).

## O que evitar

- Faixas de cores diferentes empilhadas no topo (era o incômodo da #75).
- Texto sobre foto sem degradê ou fundo que garanta contraste.
- Hexadecimal solto no código, tamanho de tela repetido fora do `RESPONSIVO`, fonte nova.
- Caixa alta em frase longa, amarelo em todo lugar, sombra em todo cartão.
- Movimento que não responde a um gesto da pessoa, a não ser a troca do carrossel e da faixa de comunicado, que param com o mouse, o foco e o gesto da pessoa e respeitam o “reduzir movimento”.
- Conteúdo inventado: textos institucionais e jurídicos vêm do sindicato (veja o `CLAUDE.md`).
