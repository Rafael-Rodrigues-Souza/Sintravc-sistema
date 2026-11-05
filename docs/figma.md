# Figma: como editar o arquivo

Arquivo `2mlqSKCNy170C8y0CyL5de` (“Oficial Sintra Site”). Os IDs das telas estão em `analise-figma.md` §1; aqui ficam as convenções, os componentes e as armadilhas. Correções que ainda não foram feitas no Figma estão em `correcoes-figma.md`.

## Convenções

- **Edite sempre a página de origem.** “Todas as telas” (134:629) é uma cópia só para leitura: gere de novo depois de editar.
- **Tema escuro** = clone do frame claro + `setExplicitVariableModeForCollection(coleção 30:531, modo '53:0')`. A coleção antiga 30:559 foi apagada.
- Cada página tem as seções “… 2.0 — Tema claro” e “… 2.0 — Tema escuro”.
- **Nome dos frames:** `<Página> 2.0 — <Tela> — Desktop|Mobile — Claro|Escuro`. No painel: `Painel 2.0 — <Área · estado> — Desktop — Claro`.
- Reutilize os componentes abaixo; não crie estilos novos.
- Em seções claras, o sobretítulo usa `destaque/azul` (não `destaque/amarelo-texto`).
- Os estilos de texto antigos Comum/Desktop/Mobile não se usam em frames 2.0. Os estilos 2.0 incluem Rótulo, Corpo destaque, Título destaque mobile e Número destaque (+ mobile).

## Páginas

| Página | ID |
|---|---|
| Todas as telas (cópia, só leitura) | 134:629 |
| Home (+ componentes do site) | 30:530 |
| Notícias | 77:10458 |
| Sindicato | 45:1384 |
| Documentos | 67:7610 |
| Rádio Chofer | 157:8304 |
| Contato | 68:10457 |
| Entrar (associado) | 43:1237 |
| Área do associado | 184:13091 |
| Páginas de apoio (menu mobile, menu da conta, 404, privacidade, cookies) | 159:8304 |
| Painel de gestão | 85:12611 |

## Componentes do site

No frame “Componentes 2.0” (31:530), na página Home.

| Componente | ID |
|---|---|
| Site/Barra superior | 54:818 |
| Site/Cabeçalho desktop (Sessão=Visitante 54:860 / Conectado) | 155:11686 |
| Site/Cabeçalho mobile (Visitante 54:890) | 155:11704 |
| Site/Filie-se desktop / mobile | 54:907 / 54:918 |
| Site/Rodapé desktop / mobile | 54:963 / 54:998 |
| Site/Faixa de comunicado desktop / mobile | 153:8927 / 153:8949 |
| Site/Aviso de cookies desktop / mobile | 158:9425 / 158:9440 |
| Alerta 2.0 (Erro, Aviso, Sucesso, Informação) | 153:9018 |
| Horário 2.0 (Livre, Selecionado, Indisponível) | 182:26430 |
| Botão 2.0 | 31:601 |
| Campo 2.0 | 63:853 |
| Checkbox | 63:863 |
| Chip filtro | 71:1462 |
| Card documento | 72:1462 |
| Etiqueta | 31:583 |
| Ícones: youtube, whatsapp, usuario, megafone | 6:41, 6:32, 31:561, 54:748 |

O cabeçalho Conectado tem o sino com contador e o item “Rádio Chofer” no menu. Status 2.0 tem os estados de agendamento Confirmado, Concluído, Cancelado e Faltou.

## Componentes do painel

| Componente | ID |
|---|---|
| Navegação (grupos “Grupo — X”, itens “Item — X”) | 107:715 |
| Status (inclui Encerrado e Estado=Pendente 244:37588) | 107:648 |
| Navegação inferior (mobile) | 169:19085 |
| Barra do app (mobile) | 169:19114 |

Seções do painel: Mapa, fluxos e estados 122:13130 (h 7102); Desktop claro 122:13131 (começa em y=7502, h 29568, largura 8080); Mobile claro 122:13132 (y=37470); Componentes 122:17429. A seção escura do desktop fica em x=8480. Ao reorganizar linhas: tolerância de agrupamento 600 e espaço de 200.

Nas telas do painel, a navegação esconde os itens que o perfil não pode ver. Ao marcar o item ativo (`navActive`), pule os rótulos de grupo.

## Tokens

Coleção 30:531 (modos Claro e Escuro 53:0). Além das cores de marca: `sobre-escuro/{superficie,chip,divisor,borda,inativo,ao-vivo}`, `status/*` e `fundo/sobreposicao`.

## Armadilhas do `use_figma`

- Nós de outras páginas valem `null` até `await page.loadAsync()`.
- Um erro desfaz a chamada inteira.
- Um espaçador de auto layout vazio nasce com 100 px de altura.
- Filho com posição absoluta não aceita FILL.
- Para esconder itens de menu, percorra uma cópia (`[...menu.children]`), nunca a lista viva.
