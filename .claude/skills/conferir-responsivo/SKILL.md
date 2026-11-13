---
name: conferir-responsivo
description: Confere a responsividade de telas do SINTRAVC com o Playwright do projeto, em 375, 768 e 1280 px, nos temas claro e escuro, e compara com o Figma mobile. Entrega uma lista de pontos por tela e largura, sem corrigir. Use quando pedirem para conferir, testar ou revisar a responsividade, o celular ou o tema escuro de uma tela, e antes de dar por pronta uma tela nova.
---

# Conferir responsividade

Só confere e relata. **Não corrija nada**, nem o que parecer óbvio: a lista volta para quem pediu decidir.

## 1. Preparar

- Telas: as rotas que a pessoa indicou (ex.: `/`, `/painel/conteudos`). Se não indicou, pergunte quais.
- O app precisa estar rodando. Se não estiver, suba com `pnpm dev` (porta 3000) e anote o PID para parar no fim.
- Telas do painel pedem login. Em dev, use uma pessoa do `pnpm dev:pessoas-teste` e passe por variável de ambiente:
  `RESPONSIVO_EMAIL`, `RESPONSIVO_SENHA` e `RESPONSIVO_TOTP` (o segredo das duas etapas que o comando mostra).

## 2. Tirar os prints e medir

```bash
pnpm exec tsx .claude/skills/conferir-responsivo/conferir.ts inicio painel/entrar
RESPONSIVO_EMAIL=... RESPONSIVO_SENHA=... RESPONSIVO_TOTP=... \
  pnpm exec tsx .claude/skills/conferir-responsivo/conferir.ts --entrar painel painel/conteudos
```

As rotas vão sem a barra inicial, e `inicio` é a página inicial (o Git Bash do Windows estraga argumentos que começam com `/`).

O script abre cada tela em 375, 768 e 1280 px, no claro e no escuro, salva a página inteira em `.scratch/responsivo/<data-hora>/` (pasta ignorada pelo git) e grava `resultado.json`. Ele já mede:

| Ponto | Como mede |
|---|---|
| Rolagem lateral | a página é mais larga que a tela, e quais elementos passam da borda |
| Texto cortado | elemento com `overflow` escondido ou reticências cujo conteúdo é maior que a caixa |
| Botão pequeno | link, botão, campo ou papel clicável com largura ou altura abaixo de 44 px |
| Menu que some | `<nav>` escondido sem nenhum botão visível com `aria-controls` ou `aria-expanded` |

As medições são pistas, não sentença. Confira cada uma no print antes de pôr na lista (um link dentro de um parágrafo, por exemplo, pode ser menor que 44 px de propósito).

## 3. Olhar os prints

Abra os prints com a ferramenta de leitura de imagem e procure o que o script não mede:

- **Itens que não empilham:** em 375 px, colunas, cards, filtros e botões lado a lado que ficaram espremidos em vez de irem um embaixo do outro.
- Texto cortado ou sobreposto que escapou da medição (por exemplo, por posição absoluta).
- Tema escuro: texto sem contraste, fundo branco esquecido, ícone ou logo que some no fundo escuro.
- Menu: no celular, o botão de abrir aparece e, aberto, mostra todos os itens.

Para conferir o menu aberto ou outro estado, rode um passo extra com o Playwright (clicar e tirar o print) em vez de supor.

## 4. Comparar com o Figma mobile

1. Procure a tela em `docs/analise-figma.md` §1. A coluna “ID (D / M)” traz o ID mobile depois da barra; “—” quer dizer que não há versão mobile, e aí a comparação fica de fora (diga isso no relatório).
2. Antes, leia `docs/correcoes-figma.md`: o que está ali vale sobre o Figma.
3. Com o ID mobile, abra o print do Figma (MCP do Figma, arquivo `2mlqSKCNy170C8y0CyL5de`, `create_session` e depois `get_screenshot`). Só leitura: não edite o Figma.
4. Compare com o print de 375 px no tema claro (e com o frame escuro, se existir): ordem dos blocos, o que aparece e o que some, tamanhos de botão e de texto, espaçamentos grandes.

## 5. Entregar

Uma lista por tela e por largura, sem corrigir. Para cada ponto: o que está errado, onde (elemento ou trecho), tema, o caminho do print e, se for diferença com o Figma, o ID do frame.

```markdown
## /painel/conteudos

### 375 px
- [claro e escuro] Rolagem lateral: a tabela tem 612 px. Print: .scratch/responsivo/2026-11-13-14-20/painel_conteudos-375-claro.png
- [claro] Botão “Menu” com 40 px de altura (mínimo 44).
- [Figma 81:995] No Figma, o filtro vem antes da busca, aqui vem depois.

### 768 px
- Nada encontrado.

### 1280 px
- Nada encontrado.
```

No fim, diga onde estão os prints e quais telas ficaram sem comparação com o Figma (sem versão mobile). Se você subiu o `pnpm dev`, pare o servidor e confira que a porta 3000 ficou livre (no Windows, `taskkill /PID <pid> /T /F`).
