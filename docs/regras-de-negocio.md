> Convertido automaticamente do .docx original em Documents\SINTRAVC (v1.1, 03/11/2026). A fonte da verdade passa a ser este .md.

**SINTRAVC · DOCUMENTAÇÃO DO PROJETO · 05**

# Regras de negócio

As regras que o sistema precisa cumprir, independentemente da tela

| **Projeto** | SINTRAVC — Site, Painel de gestão e Área do associado (versão 2.0) |
|---|---|
| **Cliente** | SINTRAVC — Sindicato dos Rodoviários de Vitória da Conquista |
| **Responsável** | Rafael Rodrigues Souza |
| **Versão · data** | 1.1 · 03/11/2026 |
| **Base** | Protótipo no Figma “Oficial Sintra Site” (telas desktop e mobile, temas claro e escuro) |

## 1. Sobre as regras

Regras de negócio descrevem decisões do sindicato que valem em qualquer tela ou canal. Elas devem ser verificadas no servidor, não só na interface. Cada regra tem um ID (RN) citado nos requisitos (documento 02).

## 2. Regras por área

### 2.1 Acesso

| **ID** | **Regra** | **Descrição** |
|---|---|---|
| RN01 | **Login só com filiação ativa** | A situação da filiação é consultada na API do sindicato a cada login. Só entra quem está Ativo. Inativo, Pausado ou Desfiliado é bloqueado na hora, com alerta para procurar o atendimento e botão de WhatsApp. Se a situação mudar, o acesso muda no próximo login. Se a API não responder, vale a última consulta de até 24 horas (com “Ativo”, entra e fica marcado para reconferência); sem consulta recente, o acesso é bloqueado com aviso de indisponibilidade. Falha da API nunca cancela agendamentos (E22). |
| RN02 | **Primeiro acesso somente para sócios** | Não existe cadastro aberto. O primeiro acesso exige CPF e matrícula conferidos na API; se ativo, a pessoa cria e-mail e senha e aceita os termos (LGPD). Depois entra só com CPF e senha. Nome, empresa e situação vêm da API e não são editáveis no site. |
| RN51 | **Senha e sessão do associado** (E04) | A senha tem no mínimo 8 caracteres, com letras e números, e não pode ser o CPF nem a data de nascimento. Depois de 5 erros seguidos, o login fica bloqueado por 15 minutos. Com “Lembrar de mim”, a sessão dura 30 dias; sem ele, termina ao fechar o navegador. A situação da filiação (ex.: “Pausada”) só aparece depois de CPF e senha corretos. |
| RN52 | **Recuperação de senha do associado** (E03) | A pessoa informa o CPF. A resposta é sempre a mesma: “Se este CPF tiver acesso, enviamos um link para o e-mail cadastrado”, sem mostrar o e-mail, porque filiação sindical é dado sensível. O link vale 1 hora e uma única vez. Ao trocar a senha, as outras sessões são encerradas e chega um e-mail de “senha alterada”. |
| RN53 | **Trocar e-mail ou senha do associado** (E06) | As duas trocas pedem a senha atual. O novo e-mail só passa a valer depois de confirmado pelo link enviado a ele (válido por 24 horas). O e-mail antigo recebe um aviso da troca. |

### 2.2 Site

| **ID** | **Regra** | **Descrição** |
|---|---|---|
| RN03 | **Filiação pelo WhatsApp** | O site não tem formulário de filiação. “Filiar-se” abre conversa com a recepção, com mensagem pronta. O número vem de Configurações › Site › WhatsApp da recepção. O processo é interno do sindicato. |
| RN13 | **Documentos só oficiais** | A área Documentos reúne apenas editais e acordos/convenções em PDF. Comunicados não são publicados como PDF. |
| RN40 | **Carteirinha visual** | Não há carteirinha digital válida: a imagem em Benefícios é apenas ilustrativa e o passe físico continua sendo o documento válido. |
| RN41 | **Atalho Agendar** | O atalho “Agendar” na Home aparece somente para o associado conectado. |
| RN45 | **Privacidade e cookies** | O aviso de cookies aparece na primeira visita. Política de privacidade e termos de uso são redigidos pelo advogado do sindicato. |

### 2.3 Painel

| **ID** | **Regra** | **Descrição** |
|---|---|---|
| RN04 | **Acesso da equipe separado** | A equipe usa login próprio, separado do associado, com e-mail individual e verificação em duas etapas por aplicativo autenticador. |
| RN05 | **Bloqueio por tentativas** | Após 5 tentativas erradas de login da equipe, a conta fica bloqueada por 15 minutos e o administrador é avisado. |
| RN06 | **Três perfis e menu filtrado** | Perfis: Administrador geral, Comunicação e Atendimento. Áreas sem permissão não aparecem no menu da pessoa. |
| RN07 | **O que a Comunicação faz** | Cria, edita e publica notícias (inclusive sobre acordos e editais, com link do documento oficial), comunicados, episódios do Rádio Chofer, destaques da página inicial e mídia. Apenas vê e baixa editais e acordos. |
| RN08 | **O que é exclusivo do Administrador geral** | Publicar, substituir ou remover editais e acordos/convenções; benefícios e parceiros; configurações do site e categorias; equipe, perfis e segurança; serviços de agendamento e responsáveis; Atividade (auditoria). |
| RN09 | **Sem aprovação; confirmação no que é sensível** | Não há etapa de aprovação: o perfil define quem publica. Ações de alto impacto (publicar documento oficial, encerrar comunicado, ocultar, arquivar, excluir) pedem confirmação e ficam registradas em Atividade. |
| RN10 | **Ciclo de vida do conteúdo** | Estados: Rascunho (não aparece; salvo automaticamente), Agendado (entra no ar sozinho na data e hora), Publicado (visível; as edições ficam numa cópia de trabalho e valem ao publicar as alterações, E42), Oculto (fora do site, pode voltar), Arquivado (fora do site e das listas, com histórico e anexos; pode ser restaurado como rascunho). Encerrado vale só para comunicados. |
| RN11 | **Ocultar exige motivo** | Ao ocultar um conteúdo publicado, o motivo é obrigatório e fica registrado. |
| RN12 | **Documento oficial** | Editais e acordos são publicados só em PDF e exigem confirmação de que o arquivo é a versão oficial e assinada. |
| RN15 | **Imagens** | Aceita JPG, PNG, WebP e HEIC. HEIC é convertido no servidor para JPG e o tamanho é reduzido (E39). Vale para Mídia, capas de notícia e logos de parceiros. Texto alternativo é obrigatório para publicar. |
| RN16 | **Exclusão de mídia** | Só pode ser excluído arquivo que não esteja em uso. A exclusão é definitiva e pede confirmação. |
| RN18 | **Auditoria imutável** | Toda ação relevante (publicar, ocultar, arquivar, excluir, encerrar, alterar permissões, cancelar, remarcar, exceção, exportar) gera registro em Atividade com pessoa, data, hora e motivo. Registros não podem ser alterados nem excluídos. |
| RN42 | **Mensagens do sistema** | Avisos rápidos aparecem no canto inferior direito e somem em 6 segundos; erros ficam até serem fechados. Sem internet, aparece um aviso; só o editor de notícia e de documento guarda o rascunho no navegador e o salva quando a conexão voltar (E02). |
| RN44 | **Tarefas automáticas** | A Visão geral lista tarefas geradas pelo sistema: documento com vigência terminando em 2 dias, publicação agendada para hoje, rascunhos parados há mais de 7 dias e imagens sem texto alternativo. |
| RN46 | **Convite da equipe** | Só o Administrador geral convida. O convite chega por e-mail com link único, válido por 48 horas. Antes do primeiro acesso, a pessoa cria a senha, ativa as duas etapas e guarda os códigos de recuperação. Reenviar um convite invalida o anterior. Convites ficam registrados em Atividade. |
| RN47 | **Senha da equipe** | Mínimo de 10 caracteres, com letras e números, diferente do e-mail, do nome e das 3 últimas senhas. |
| RN48 | **Recuperação de senha da equipe** | A própria pessoa pede um link em “Esqueci minha senha”. O link vale 1 hora e uma única vez. A resposta na tela é a mesma exista ou não o e-mail, para não revelar quem tem acesso. Ao trocar a senha, as outras sessões são encerradas e chega um e-mail de “senha alterada”. A verificação em duas etapas continua sendo exigida. Trocar a senha pelo link libera a conta bloqueada por tentativas (E38). |
| RN49 | **Códigos de recuperação** | Na ativação das duas etapas são gerados 8 códigos de uso único, mostrados uma só vez. Cada código substitui o código do aplicativo em uma entrada. Sem celular e sem códigos, só o Administrador geral redefine as duas etapas, com motivo obrigatório e após confirmar a identidade; os códigos antigos deixam de valer e tudo fica em Atividade. |
| RN50 | **Mínimo de administradores** | O painel precisa ter sempre pelo menos 2 administradores gerais ativos. O sistema impede desativar ou mudar o perfil de um administrador se isso deixar menos de 2. |
| RN54 | **Exclusão definitiva** (E07) | Só pode ser excluído de vez um rascunho que nunca foi publicado, pelo autor ou pelo Administrador geral, com confirmação. O que já foi ao ar nunca é apagado, só arquivado. Arquivos de mídia seguem a RN16. |
| RN55 | **Trabalho em equipe e perfil único** (E08, E09) | Cada pessoa tem um único perfil. Na Comunicação, qualquer pessoa edita, publica, oculta e arquiva conteúdo de qualquer autor; a Atividade registra quem fez cada ação. |

### 2.4 Site e painel

| **ID** | **Regra** | **Descrição** |
|---|---|---|
| RN14 | **Comunicado é faixa** | Comunicado é uma faixa no topo de todas as páginas, com período de início e fim. Rascunho não aparece; agendado entra sozinho no início; publicado aparece em todas as páginas; encerra sozinho no fim. Vários no ar se alternam na ordem da fila. Encerrar antes pede confirmação e fica em Atividade. Encerrado pode ser duplicado. |
| RN17 | **Rádio Chofer sem vídeo no servidor** | Episódios são cadastrados por link do YouTube; nenhum vídeo é guardado no servidor do site. Título, capa e duração são preenchidos a partir do YouTube; o player é carregado só no clique. |
| RN43 | **Configurações como fonte única** | Endereço, horários, telefones, WhatsApp e redes sociais exibidos no site vêm de Configurações › Site. |
| RN57 | **Período do parceiro** (E12) | O parceiro tem “Começa em” (opcional; vazio = entra ao publicar) e “Válido até” (opcional; vazio = sem prazo). Com início futuro, fica Agendado e entra sozinho. Ao vencer, sai do site e vai para Arquivado. |
| RN58 | **Notícia fixada** (E14) | Só uma notícia fica fixada no topo da página Notícias, até a data escolhida. Fixar outra substitui a anterior, com aviso. Sem fixada, o destaque é a notícia mais recente. Os destaques da Home são controlados só pela área Página inicial (E13). |
| RN59 | **E-mail × notificação** (E19–E21) | O e-mail é usado só para mensagens transacionais: conta, segurança, falhas de publicação e agendamentos. Os avisos do sindicato aos associados são notificações no site, geradas automaticamente quando entra no ar um edital, acordo, comunicado ou parceiro; notícias comuns não geram. Para a equipe, só vão por e-mail os eventos de segurança e a publicação agendada que falhou; o resto fica nas notificações do painel. |

### 2.5 Agendamentos

| **ID** | **Regra** | **Descrição** |
|---|---|---|
| RN19 | **Serviços e responsáveis** | Só o Administrador geral cria serviços e define responsáveis. No Atendimento, a pessoa edita apenas duração, dias/horários e local dos seus serviços; nome, descrição, ícone, responsável e limite aparecem travados (“Definido pelo Administrador geral”). |
| RN20 | **Atendimento só nos próprios serviços** | A pessoa do Atendimento edita, bloqueia, cancela, remarca, agenda e registra presença apenas nos serviços em que é responsável. Os demais aparecem como “Somente consulta”. O Administrador geral opera todos. |
| RN21 | **Filtro padrão da agenda** | Para o Atendimento, a Agenda do dia abre em “Meus serviços”. O filtro escolhido fica salvo por pessoa. |
| RN56 | **Privacidade na agenda** (E10, E11) | Nos serviços de outros responsáveis, o Atendimento vê só a grade (livre, ocupado, bloqueado) e o nome de quem marcou, sem abrir o detalhe. No detalhe de um agendamento, o histórico do associado mostra só os serviços pelos quais quem está vendo é responsável. O Administrador geral vê tudo. Tudo é conferido no servidor. |
| RN22 | **Serviço aberto no site** | Um serviço só aparece para os associados quando estiver “aberto no site”. Desligado, fica salvo e só a equipe vê. Marcação de exames aparece como indisponível. |
| RN23 | **Confirmação automática** | Ao escolher um horário livre, o agendamento é confirmado na hora, depois de conferir na API se a filiação continua ativa. Se não estiver ativa, não agenda e mostra o contato do atendimento. |
| RN24 | **Antecedência** | Só horários livres, com até 30 dias de antecedência. |
| RN25 | **Um agendamento ativo por serviço** | Cada pessoa (associado ou dependente) pode ter apenas 1 agendamento ativo (confirmado e futuro) por serviço. |
| RN26 | **Limite por mês, por pessoa** | Cada serviço tem “Sem limite” ou “Limitar por mês (N)”. O limite conta por pessoa (associado e cada dependente) e pela data do atendimento: contam confirmados, realizados e faltas; cancelados não contam. Remarcar não conta como novo uso. Exemplos: Jurídico sem limite; Salões 2 por mês; Exames 1 por mês. |
| RN27 | **Prazo do associado** | O associado pode cancelar ou remarcar pelo site até 2 horas antes do horário. Depois disso, só pelo atendimento. |
| RN28 | **Cancelamento pela equipe** | Quando o Atendimento cancela ou remarca, o motivo é obrigatório e o associado é avisado. |
| RN29 | **Lembretes** | Lembretes 1 dia antes e 2 horas antes, por e-mail e notificação. Sem e-mail cadastrado (ex.: agendamento de balcão), não há lembrete automático e tudo fica em Atividade. |
| RN30 | **Presença** | No dia, o Atendimento registra Concluído ou Faltou. Sem registro até o fim do dia, o atendimento vira “Pendente de registro”: cada responsável é avisado das pendências dos seus serviços e o Administrador geral recebe um resumo diário (E16). O atendimento não entra no relatório até ser resolvido. |
| RN31 | **Suspensão por faltas** | 2 faltas no mês (calendário) bloqueiam novos agendamentos por 15 dias só da pessoa que faltou (associado ou dependente); os demais da família continuam marcando (E29). |
| RN32 | **Filiação deixa de ser ativa** | A situação é conferida na API todos os dias e a cada login. Se mudar para Inativo, Pausado ou Desfiliado, os agendamentos futuros são cancelados automaticamente, os horários voltam a ficar livres, o associado é avisado por e-mail e os responsáveis veem em Atividade. |
| RN33 | **Agendamento no balcão** | Feito no painel por quem é responsável pelo serviço: busca o associado por nome, CPF ou matrícula, escolhe ele ou um dependente, e o sistema confere filiação e limite. Com limite atingido, é permitida exceção com motivo obrigatório. |
| RN34 | **Dependentes** | Os serviços valem para o associado e para os dependentes cadastrados no sistema do sindicato. |
| RN35 | **Bloqueios e feriados** | Quem já tinha horário em período bloqueado é avisado e o horário é cancelado. |
| RN36 | **Capacidade por horário** | Cada serviço define quantos atendimentos acontecem ao mesmo tempo; um horário fica indisponível quando a capacidade é atingida. |
| RN37 | **Quem altera as regras** | Só o Administrador geral altera as regras para os associados (limites e parâmetros dos serviços). |
| RN38 | **Relatórios** | Realizado = presença registrada. O Atendimento vê relatórios só dos seus serviços. A exportação (PDF ou Excel) mostra aviso de LGPD e fica registrada em Atividade. |

### 2.6 Área do associado

| **ID** | **Regra** | **Descrição** |
|---|---|---|
| RN39 | **Dados do associado** | Dados da filiação vêm do sistema do sindicato e não podem ser alterados pelo site. O associado altera e-mail, celular e senha, pode baixar seus dados ou excluir o acesso; a filiação não muda. |

## 3. Parâmetros das regras

Valores que hoje são fixos nas regras. Recomenda-se guardá-los em configuração, para que possam mudar sem alterar o código.

| **Parâmetro** | **Valor** | **Regra** |
|---|---|---|
| Prazo para o associado cancelar ou remarcar | 2 horas antes | RN27 |
| Antecedência máxima para agendar | 30 dias | RN24 |
| Agendamentos ativos por serviço, por pessoa | 1 | RN25 |
| Faltas no mês que geram suspensão | 2 | RN31 |
| Duração da suspensão | 15 dias | RN31 |
| Lembretes | 1 dia e 2 horas antes | RN29 |
| Limite mensal (exemplos) | Jurídico: sem limite<br>Salões: 2<br>Exames: 1 | RN26 |
| Tentativas de login da equipe | 5 | RN05 |
| Validade do convite da equipe | 48 horas | RN46 |
| Validade do link de nova senha | 1 hora, uso único | RN48 |
| Espera para pedir outro link de nova senha | 1 minuto | RN48, E38 |
| Senha da equipe | mín. 10 caracteres, letras e números; não repetir as 3 últimas | RN47 |
| Códigos de recuperação | 8, de uso único | RN49 |
| Administradores gerais ativos | mínimo 2 | RN50 |
| Senha do associado | mín. 8 caracteres, letras e números | RN51 |
| Tentativas de login do associado | 5 erros → bloqueio de 15 minutos | RN51 |
| Sessão do associado | 30 dias com “Lembrar de mim”; senão, até fechar o navegador | RN51 |
| Link de nova senha do associado | 1 hora, uso único | RN52 |
| Link de confirmação de novo e-mail | 24 horas | RN53 |
| Sessão da equipe | 2 h sem uso ou 12 h após o login | RNF02 |
| Guarda de atendimentos e faltas | 5 anos (provisório) | E25 |
| Guarda da Atividade | 5 anos (provisório) | E25 |
| Guarda de logs de acesso | 6 meses (Marco Civil) | E25 |
| Guarda de notificações | 90 dias | E25 |
| Conta de associado inativa | aviso após 2 anos sem login; exclusão do acesso 30 dias depois | E25 |
| Última consulta válida da API | 24 horas | E22 |
| Tempo de bloqueio após tentativas | 15 minutos | RN05 |
| Tempo de aviso rápido na tela | 6 segundos | RN42 |
| Atualização do site após Configurações | até 1 minuto | RN43 |
| Alerta de vigência de documento | 2 dias antes | RN44 |
| Alerta de rascunho parado | mais de 7 dias | RN44 |
| Tamanho máximo de arquivo na Mídia | 10 MB | R7 |
| Imagens reduzidas acima de | 2400 px no lado maior | RN15, E39 |
| Qualidade do JPG e do WebP gravados | 82 | RN15, E39 |
| Salvamento automático do rascunho | 2 segundos depois de parar de digitar | RF38, E40 |

## 4. Estados

### 4.1 Conteúdo

| **Estado** | **Visível no site?** | **Pode ir para** |
|---|---|---|
| Rascunho | Não | Agendado, Publicado |
| Agendado | Não (até a data) | Publicado (automático), Rascunho |
| Publicado | Sim | Oculto (com motivo), Arquivado |
| Oculto | Não | Publicado, Arquivado |
| Arquivado | Não (nem nas listas) | Rascunho (restaurar) |
| Encerrado (só comunicado) | Não | Duplicar como novo comunicado |

### 4.2 Agendamento

| **Estado** | **Quando** |
|---|---|
| Confirmado | Ao escolher horário livre com filiação ativa (site ou balcão). |
| Concluído | Atendimento registrou presença. |
| Faltou | Atendimento registrou falta. Conta no limite e na suspensão. |
| Cancelado | Pelo associado (até 2 h antes), pela equipe (com motivo), por bloqueio de horário ou por filiação não ativa. Não conta no limite. |
| Pendente de registro | Fim do dia sem presença registrada. Fica fora do relatório até ser resolvido. |

## 5. Pontos a confirmar com o cliente

- **RN25:** “1 agendamento ativo por serviço” foi tratado por pessoa (associado e cada dependente), seguindo a decisão de limite por pessoa.
- **RN30:** horário exato de “fim do dia” para marcar pendências (sugestão: 23h59, horário da Bahia).
- **RN31:** se a contagem de faltas é por mês do calendário ou nos últimos 30 dias (adotado: mês do calendário).
- **RN38 e LGPD:** prazos provisórios definidos em E25; falta a validação do advogado.
- ~~**RN01:** comportamento quando a API do sindicato estiver fora do ar.~~ Decidido em E22.
