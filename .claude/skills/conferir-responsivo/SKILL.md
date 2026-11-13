---
name: conferir-responsivo
description: Confere a responsividade de telas do SINTRAVC com o Playwright do projeto. Varre a janela com mouse (janela reduzida, tela dividida, telas baixas) e testa os perfis de celular, tablet em pé e deitado com toque e notebook, nos temas claro e escuro, com os tamanhos de RESPONSIVO no playwright.config.ts. Compara com o Figma desktop e mobile. Entrega uma lista de pontos por tela e tamanho, sem corrigir. Use quando pedirem para conferir, testar ou revisar a responsividade, o celular, o tablet, telas baixas ou o tema escuro de uma tela, e antes de dar por pronta uma tela nova.
---

# Conferir responsividade

Só confere e relata. **Não corrija nada**, nem o que parecer óbvio: a lista volta para quem pediu decidir.

A responsividade não é só o celular (E48). Vale também para a janela reduzida, para a tela dividida com outra aba, para telas baixas e para o tablet, que uma operadora do sindicato usa para trabalhar, com toque, em pé e deitado.

**Os tamanhos ficam num lugar só:** o objeto `RESPONSIVO` do `playwright.config.ts`. `RESPONSIVO.perfis` são os perfis (um projeto do Playwright cada) e `RESPONSIVO.varredura` é a janela que a skill percorre. Para saber os números, leia esse objeto; não os copie para docs.

## 1. Preparar

- Telas: as rotas que a pessoa indicou. Se não indicou, pergunte quais.
- O app precisa estar rodando. Se não estiver, suba com `pnpm dev` (porta 3000) e anote o PID para parar no fim.
- Telas do painel pedem login. Em dev, use uma pessoa do `pnpm dev:pessoas-teste` e passe por variável de ambiente:
  `RESPONSIVO_EMAIL`, `RESPONSIVO_SENHA` e `RESPONSIVO_TOTP` (o segredo das duas etapas que o comando mostra). Não rode `--recriar` sem pedir: ele troca os códigos do aplicativo da pessoa. O login usa o mesmo `e2e/entrar.ts` dos testes.

## 2. Medir e tirar os prints

```bash
pnpm exec tsx .claude/skills/conferir-responsivo/conferir.ts inicio painel/entrar
RESPONSIVO_EMAIL=... RESPONSIVO_SENHA=... RESPONSIVO_TOTP=... \
  pnpm exec tsx .claude/skills/conferir-responsivo/conferir.ts --entrar painel painel/conteudos
```

- As rotas vão sem a barra inicial, e `inicio` é a página inicial (o Git Bash do Windows estraga argumentos que começam com `/`).
- `--rapido` dobra o passo da varredura e usa só duas alturas, para uma olhada rápida. A conferência de verdade é sem ele.
- `--url` muda o endereço (padrão `http://localhost:3000`).

O script faz duas passadas, nos temas claro e escuro:

| Passada | Tamanhos | O que simula |
|---|---|---|
| Varredura com mouse | `RESPONSIVO.varredura`: larguras de passo em passo, em cada altura | janela reduzida, tela dividida, notebook baixo, monitor grande |
| Perfis | `RESPONSIVO.perfis`: celular, tablet em pé e deitado (com `isMobile` e `hasTouch`) e notebook (mouse) | os mesmos tamanhos dos projetos `@responsivo`; o tablet também é girado para a posição do outro perfil sem recarregar a página |

Tudo vai para `.scratch/responsivo/<data-hora>/`, pasta que o git ignora:

- `ref-<tela>-<perfil>-<tema>-<tamanho>.png`: **print de referência de cada perfil, sempre**, com ou sem problema. É o que se compara com o Figma.
- `<tela>-<modo>-<tema>-<tamanho>.png`: print dos tamanhos com problema, um por problema novo.
- `resultado.md` e `resultado.json`: cada ponto com as faixas de largura por altura em que aparece (ex.: `altura 800: 1040–1920`); elementos repetidos (linhas de tabela) vêm juntos, como “e mais 18 iguais a ele”.

### O que o script mede

| Ponto | Onde | Como mede |
|---|---|---|
| Rolagem lateral | todos | a página é mais larga que a tela, e quais elementos passam da borda |
| Texto cortado | todos | reticências, `line-clamp` ou `overflow` escondido com texto próprio maior que a caixa (ignora o `sr-only`) |
| Esmagado | todos | item de flex que encolheu abaixo do tamanho natural (na coluna, a altura de qualquer item; na linha, a largura do que é clicável); item de grid menor que o conteúdo; caixa de altura fixa que corta o conteúdo |
| Texto sobreposto | todos | linhas de texto de elementos diferentes que se cruzam, já recortadas pelo `overflow` dos pais; com diálogo aberto, só conta o texto de dentro dele |
| Quebrou a linha | todos | linha flex com `wrap` cujos itens foram para baixo uns dos outros |
| Barra de rolagem | todos | área com rolagem interna cuja barra aparece e ocupa espaço (o script mostra as barras, que o Playwright esconde por padrão) |
| Menu sem botão | todos | `<nav>` escondido sem botão visível com `aria-controls` apontando para o id dele |
| Alvo pequeno | toque | link, botão, campo ou papel clicável com largura ou altura abaixo de 44 px; link no meio de um parágrafo fica de fora (o WCAG dispensa) |
| Só com o mouse | toque | regra `:hover` que mostra uma ação que no toque continua escondida, sem a mesma ação visível em outro lugar (o Tailwind põe o `hover:` dentro de `@media (hover: hover)`) |
| Conferir à mão | toque | clicável transparente ou invisível sem regra `:hover` que explique: o script não sabe se há outro caminho pelo toque |
| Ao girar | tablet | ponto que só aparece depois de girar o tablet sem recarregar, e não ao abrir a página já na outra posição |

Nas conferências de toque, fica de fora o que é escondido de propósito: texto só para leitor de tela (`sr-only`), campo escondido sob um rótulo visível (ex.: campo de arquivo) e o que está com `aria-hidden` ou `inert`.

As medições são pistas, não sentença. Confira cada uma no print antes de pôr na lista. Nem toda quebra de linha é erro (filtros que descem para a linha de baixo no celular podem ser o esperado), e nem todo texto cortado é erro (título longo numa tabela com reticências pode ser de propósito, se o título inteiro aparece em outro lugar). O que vier como **conferir à mão** vai para a lista nessa categoria, e não como defeito.

## 3. Olhar os prints

Abra os prints com a ferramenta de leitura de imagem e procure o que o script não mede:

- **Itens que não empilham:** colunas, cards, filtros e botões lado a lado que ficaram espremidos em vez de irem um embaixo do outro.
- **Telas baixas:** o menu lateral e os painéis fixos precisam rolar, e não encolher os itens.
- Tema escuro: texto sem contraste, fundo branco esquecido, ícone ou logo que some no fundo escuro.
- Menu: nos perfis estreitos, o botão de abrir aparece e, aberto, mostra todos os itens.

Para conferir o menu aberto, um diálogo ou outro estado, rode um passo extra com o Playwright (clicar e tirar o print) em vez de supor.

## 4. Exemplos já encontrados no painel

São problemas reais, achados pelo Rafael e confirmados pelo script em 13/11/2026. Servem para calibrar o que procurar; se ainda estiverem lá, entram na lista.

1. **“Criar conteúdo” esmagado no menu lateral em telas baixas.** No tablet deitado, no notebook, na tela dividida e em qualquer largura a partir de 1040 px com até 800 px de altura, o botão fica com 18 px em vez de 48. Os itens do `<nav>` encolhem em vez de o menu rolar. O script mostra como `esmagado · <button> “Criar conteúdo” · altura 18 px, o natural é 48 px`.
2. **Barra de rolagem na borda do menu lateral.** Nas mesmas alturas, com mouse, a barra aparece na borda direita do menu (15 px de barra). O script mostra como `barra de rolagem · <nav#menu-do-painel>`.
3. **Em Conteúdos, “Criar conteúdo” quebra para baixo de Lista/Calendário** (também com 1280 px de largura). A linha com o modo de ver e o botão tem `flex-wrap` e não cabe ao lado do título. O script mostra como `quebrou a linha · <nav> “Modo de ver” | <button> “Criar conteúdo”`.

## 5. Comparar com o Figma, desktop e mobile

1. Antes, leia `docs/correcoes-figma.md`: o que está ali vale sobre o Figma.
2. Procure a tela em `docs/analise-figma.md` §1. No site, a coluna “ID (D / M)” traz o desktop antes da barra e o mobile depois. No painel, a coluna “ID” traz o desktop e, entre parênteses, o mobile (ex.: Conteúdos `110:845 (M 120:3650)`). “—” ou a falta do “(M …)” quer dizer que aquela versão não existe, e a comparação dela fica de fora (diga isso no relatório).
3. Abra os frames pelo MCP do Figma (arquivo `2mlqSKCNy170C8y0CyL5de`, `create_session` e depois `get_screenshot`). Só leitura: não edite o Figma.
4. Compare com os prints de referência (`ref-*.png`): o frame desktop com o do notebook e o do tablet deitado, e o mobile com o do celular. Use o tema claro (e o frame escuro, se existir). Olhe a ordem dos blocos, o que aparece e o que some, os tamanhos de botão e de texto e os espaçamentos grandes.
5. O Figma não tem tablet em pé nem telas baixas. Nesses tamanhos, o critério é não quebrar: nada esmagado, cortado, sobreposto ou fora da tela, e as ações ao alcance do toque.

## 6. Entregar

Uma lista por tela e por tamanho, sem corrigir. Para cada ponto: o que está errado, onde (elemento ou trecho), em que tamanhos e temas, o caminho do print e, se for diferença com o Figma, o ID do frame. Junte os tamanhos em faixas, como o `resultado.md` faz. Separe o que é **conferir à mão**.

```markdown
## /painel/conteudos

### Janela com mouse
- [claro e escuro] “Criar conteúdo” do menu lateral esmagado (18 px, natural 48) com até 800 px de altura, de 1040 a 1920 px de largura. Print: .scratch/responsivo/2026-11-13-14-20/painel_conteudos-mouse-claro-1040x600.png
- [Figma 110:845] <o que o frame desktop mostra> × <o que a tela mostra no print de referência do notebook>.

### Tablet deitado
- [claro e escuro] Caixas de seleção da tabela com 20×20 px (mínimo 44).

### Tablet em pé
- Nada além dos pontos acima.

### Celular
- [claro] Botão “Menu” com 36 px de altura (mínimo 44).

### Conferir à mão
- [celular] <button> “…” invisível no toque: ver se a ação existe por outro caminho.
```

No fim, diga onde estão os prints e quais telas ficaram sem comparação com o Figma (sem versão desktop ou mobile). Se você subiu o `pnpm dev`, pare o servidor e confira que a porta 3000 ficou livre (no Windows, `taskkill /PID <pid> /T /F`).
