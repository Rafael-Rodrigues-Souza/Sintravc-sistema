# Correções a fazer no Figma

**O que é este arquivo.** Lista as divergências entre o Figma e os docs v1.1. Quando um doc é explícito, ele vale, e a tela é que está desatualizada. Os itens vêm da `analise-figma.md` e da revisão de 05/11/2026.

**Como usar.**
- O código deve seguir a coluna **Vale**, mesmo antes de o Figma ser corrigido.
- Ao corrigir a tela no Figma, marque o item como feito.

| # | Tela no Figma | Está assim | Vale | Fonte | Feito |
|---|---|---|---|---|---|
| C1 | Mídia (116:2727) | `foto-assembleia.heic` aparece recusado: “Formato não aceito. Envie em JPG, PNG ou WebP (até 10 MB)”. | HEIC é aceito e convertido no servidor para JPG ou WebP. Trocar o exemplo de erro por um formato realmente não aceito (ex.: `.gif` ou `.pdf` acima do tamanho). | RN15 | ☐ |
| C1 | Visão geral · Notificações (113:2228) | O título diz “Falha no envio de imagem” e o texto diz que a foto “foi convertida para JPG automaticamente”. | Título de sucesso, ex.: “Imagem convertida”. | RN15 | ☐ |
| C2 | Editor · Documento oficial (114:1972) | “Ao terminar, o estado muda para ‘Encerrado’ e você recebe um aviso.” | O estado de publicação não muda no fim da vigência. “Vigente” e “Encerrado” são um **selo calculado** pelas datas de vigência. O aviso continua (RN44). | RN10, RN44 | ☐ |
| C2 | Documentos · Acordos coletivos (75:1438) e Editais (73:629) | Os selos “VIGENTE”, “ENCERRADO” e “Prazo” se parecem com estados. | Mantêm o mesmo visual, mas são documentados como selo de vigência, separado do estado de publicação. | RN10 | ☐ |
| C3 | Conteúdos · Edição rápida (115:2324) | Item do tipo “Comunicado”, com categoria “Comunicados” e a opção “Fixar no topo de Notícias”. | Comunicado é só faixa, com área própria (Comunicados). Trocar o exemplo por uma notícia. “Fixar no topo de Notícias” vale só para notícia; ver o item R9 da análise. | RN14 | ☐ |
| C3 | Conteúdos · Calendário (115:2992) | Filtro “Comunicados 7” e comunicados no grid. | Mostra comunicados só para consulta: barras do período em cor própria, sem arrastar; o clique abre a área Comunicados (E17). | RN14, E17 | ☐ |
| C9 | Configurações · Categorias / Regras de segurança (117:3030) | “Confirmar documentos oficiais”, “Verificação em duas etapas” e “Justificativa ao ocultar conteúdo” aparecem como interruptores. | As três regras são fixas. A aba vira só leitura, com o título “Regras fixas do sistema” e sem interruptores (RF55). | RN04, RN11, RN12, RNF02 | ☐ |
| C15 | Configurações · Site (167:18333) | “Diretoria … entra numa próxima etapa.” | A Diretoria fica fora desta versão; a equipe técnica atualiza. O texto pode continuar, mas sem prometer uma etapa. | `escopo.md` | ☐ |
| E03 | Entrar · Recuperar senha (155:9386 / 155:9482) | “Enviamos o link para jo•••@gmail.com. Ele vale por 30 minutos.” | Resposta genérica, sem o e-mail: “Se este CPF tiver acesso, enviamos um link para o e-mail cadastrado. Ele vale por 1 hora.” | `decisoes.md` E03 | ☐ |
| RN08 | Atividade (116:3074) | “07:58 Carlos Ribeiro criou a categoria ‘Saúde e segurança’”. Carlos é do perfil Comunicação. | Categorias são exclusivas do Administrador geral. Trocar a pessoa do exemplo por Mariana Souza (ADM). | RN08 | ☐ |
| E10 | Agenda · todos os serviços (205:32599) | Os itens dos serviços “Somente consulta” parecem clicáveis. | Mostram só o horário e o nome, sem abrir o detalhe. | RN56 | ☐ |
| E11 | Agendamentos · Detalhe (190:25620) | Ana (Salões) vê “Assessoria jurídica 07/10 · Concluído” no histórico do Gilson. | O histórico mostra só os serviços da pessoa que está vendo. Tirar a linha do jurídico. | RN56 | ☐ |
| E12 | Benefícios · Novo parceiro (167:18087) | Só tem “Válido até”. | Acrescentar “Começa em” (opcional). | RN57 | ☐ |
| E13 | Editor · Notícia (112:1091) | “Destacar na página inicial · Ocupa o card principal da Home.” | Trocar pelo link “Destacar na Home”, que abre a Página inicial com a notícia sugerida. | RF46 | ☐ |
| E14 | Editor · Notícia (112:1091) | Não tem a opção de fixar (ela só está na Edição rápida 115:2324). | Acrescentar “Fixar no topo de Notícias até <data>” na seção Publicação. | RN58 | ☐ |
| E15 | Configurações · Nova categoria (117:3453) | “Onde aparece” só tem Notícias e Documentos. | Acrescentar a opção Rádio Chofer (temas dos episódios). | RF54 | ☐ |
| E16 | Agenda · Presença pendente (244:37671) | “você e o Administrador geral são avisados”. | “você é avisado e o Administrador geral recebe um resumo do dia”. | RN30 | ☐ |
| E18 | Relatórios (216:34990), Atividade (116:3074) | Estado “Atendido” (ex.: “Salão masculino, 10:00 · Atendido”). | O estado é “Concluído”. “Atendido” fica só no botão de ação do detalhe. | E18 | ☐ |
| E18 | Editor · Confirmar publicação (113:1314) | “03/11/2026 às 08h00 (horário de Brasília)”. | “03/11/2026 às 08h00”. | E18 | ☐ |

## Telas a desenhar (novas)

Pelas decisões da entrevista. As demais seguem o padrão do E23.

| # | Tela | Origem | Fase | Feito |
|---|---|---|---|---|
| N1 | Sem permissão (403), no painel e na Área do associado | E23 | 1 | ☐ |
| N2 | Erro 500 / manutenção | E23 | 1 | ☐ |
| N3 | Sessão expirada (volta para a mesma página depois do login) | E05, E23 | 1 | ☐ |
| N4 | Conflito de versões do rascunho | E02, E23 | 1 | ☐ |
| N5 | Desativar acesso (confirmação, com a regra dos 2 ADMs) | RN50, E23 | 1 | ☐ |
| N6 | E-mails da equipe: conta bloqueada, duas etapas redefinidas, publicação agendada falhou | E21 | 1 | ☐ |
| N7 | Nova senha do associado e link vencido | E03 | 2 | ☐ |
| N8 | Meus dados: “Confirme seu novo e-mail” (pendente) | E06 | 2 | ☐ |
| N9 | Excluir meu acesso (confirmação e resultado) | E23 | 2 | ☐ |
| N10 | Horário tomado na hora de confirmar | E23 | 2 | ☐ |
| N11 | Sistema do sindicato indisponível (login, primeiro acesso e balcão) | E22 | 2 | ☐ |
| N12 | E-mails do associado (ver o catálogo em `decisoes.md` › C.6) | E21 | 2 | ☐ |
| N13 | Variante do cabeçalho, do menu mobile e do rodapé da Fase 1, sem “Entrar” | E01 | 1 | ☐ |
| N14 | Editor · Histórico de versões (painel lateral, com restaurar como rascunho) | E31 | 1 | ☐ |
| N15 | E-mail “Seu acesso será excluído” (conta inativa há 2 anos) | E25 | 2 | ☐ |

## Ignorados (dados de exemplo)

Não afetam regras e não precisam de correção no Figma:

- **C4:** datas diferentes na Edição rápida.
- **C7:** contadores de Conteúdos.
- **C14:** matrícula do Gilson.
