> Convertido automaticamente do .docx original em Documents\SINTRAVC (v1.1, 03/11/2026). A fonte da verdade passa a ser este .md.

**SINTRAVC · DOCUMENTAÇÃO DO PROJETO · 02**

# Documento de requisitos

Requisitos funcionais e não funcionais do site, da Área do associado e do painel

| **Projeto** | SINTRAVC — Site, Painel de gestão e Área do associado (versão 2.0) |
|---|---|
| **Cliente** | SINTRAVC — Sindicato dos Rodoviários de Vitória da Conquista |
| **Responsável** | Rafael Rodrigues Souza |
| **Versão · data** | 1.1 · 03/11/2026 |
| **Base** | Protótipo no Figma “Oficial Sintra Site” (telas desktop e mobile, temas claro e escuro) |

## 1. Introdução

Este documento lista o que o sistema deve fazer (requisitos funcionais, **RF** ) e com que qualidade (requisitos não funcionais, **RNF** ). Cada requisito indica o perfil envolvido, a fase de entrega e as regras de negócio (**RN** ) que o detalham, descritas no documento 05.

### 1.1 Legenda de perfis

| **Sigla** | **Perfil** |
|---|---|
| VIS | Visitante |
| ASS | Associado |
| ADM | Administrador geral |
| COM | Comunicação |
| ATD | Atendimento |
| SIS | Sistema (ação automática, sem pessoa) |

## 2. Requisitos funcionais

### 2.1 M01 · Site público

Home, Notícias, Sindicato (Instituição, Diretoria, Benefícios), Documentos, Rádio Chofer, Contato e páginas de apoio.

| **ID** | **Requisito** | **Perfil** | **Fase** | **Regras** |
|---|---|---|---|---|
| RF01 | Exibir a Home com faixa de comunicado, carrossel “Em destaque”, acesso rápido (Acordos coletivos, Benefícios, Editais, WhatsApp), últimas notícias com filtro por categoria, último programa do Rádio Chofer, redes sociais e seção Filie-se. | VIS, ASS | 1 | RN14, RN41 |
| RF02 | Listar notícias com filtro por categoria, busca e paginação, e abrir a notícia com título, data, autor, tempo de leitura, imagens com legenda e notícias relacionadas. | VIS, ASS | 1 | — |
| RF03 | Exibir a página Sindicato com as abas Instituição (missão e história), Diretoria e Benefícios (parceiros com logo e desconto). | VIS, ASS | 1 | RN40 |
| RF04 | Exibir Documentos com as abas Editais e Acordos coletivos: destaque com prazo, contadores, busca por título, palavra-chave ou número, filtro por tipo, agrupamento por mês, abrir e baixar PDF. | VIS, ASS | 1 | RN13 |
| RF05 | Exibir a página Rádio Chofer com o programa (seg. a sex., 13h), último episódio e lista de episódios, usando o player do YouTube carregado só no clique. | VIS, ASS | 1 | RN17 |
| RF06 | Exibir a página Contato com telefone, WhatsApp, e-mail, endereço, horário, mapa com rota e redes sociais, todos vindos de Configurações › Site. | VIS, ASS | 1 | RN43 |
| RF07 | Mostrar o botão “Filiar-se pelo WhatsApp” (seção Filie-se, menu mobile e rodapé), abrindo conversa com a recepção e mensagem pronta. | VIS | 1 | RN03 |
| RF08 | Exibir comunicados ativos como faixa no topo de todas as páginas, alternando entre eles na ordem da fila, com link “Saiba mais”. | VIS, ASS | 1 | RN14 |
| RF09 | Oferecer menu mobile (visitante; a variante conectada é da Fase 2, E01), página 404, Política de privacidade, Termos de uso e aviso de cookies na primeira visita. | VIS | 1 | RN45 |
| RF10 | Exibir todas as páginas em versão desktop e mobile e nos temas claro e escuro, sem quebrar em tablet (com toque, em pé e deitado), em janela reduzida e em telas baixas (E48). | VIS, ASS | 1 | — |
| RF11 | Quando o associado estiver conectado, mostrar no cabeçalho “Olá, <nome>”, o sino de notificações com contador, o menu da conta e o atalho “Agendar” na Home. | ASS | 2 (E01) | RN41 |

### 2.2 M02 · Acesso do associado

Entrar com CPF e senha, primeiro acesso com CPF e matrícula, recuperar senha e bloqueio por filiação não ativa.

| **ID** | **Requisito** | **Perfil** | **Fase** | **Regras** |
|---|---|---|---|---|
| RF12 | Permitir login do associado com CPF e senha, consultando a situação da filiação na API do sindicato a cada login. | ASS | 2 (E01) | RN01 |
| RF13 | Bloquear o login de filiação Inativa, Pausada ou Desfiliada com alerta “procure o atendimento” e botão de WhatsApp. | ASS | 2 (E01) | RN01 |
| RF14 | Permitir o primeiro acesso (“Ativar meu acesso”) com CPF e matrícula, criando e-mail e senha com aceite da LGPD. | ASS | 2 (E01) | RN02 |
| RF15 | Bloquear o primeiro acesso de CPF e matrícula não encontrados ou não ativos, mostrando o contato do atendimento. | ASS | 2 (E01) | RN02 |
| RF16 | Permitir recuperar a senha pelo CPF, com resposta genérica e link de 1 h enviado ao e-mail cadastrado; telas de nova senha e de link vencido. | ASS | 2 (E01) | RN52 |
| RF17 | ~~Na fase 1, mostrar no Login o aviso “Em breve: agendamento de atendimentos”.~~ Sem efeito (E01): na fase 1 não há login do associado. | VIS | — | — |

### 2.3 M03 · Área do associado

Início, Notificações e Meus dados (contato, senha e LGPD).

| **ID** | **Requisito** | **Perfil** | **Fase** | **Regras** |
|---|---|---|---|---|
| RF18 | Exibir o Início da Área do associado com situação da filiação, próximos agendamentos e atalhos. | ASS | 2 | — |
| RF19 | Listar notificações (confirmações, lembretes, cancelamentos, remarcações e avisos) com marcação de lidas e contador no sino. | ASS | 2 | RN29 |
| RF20 | Exibir Meus dados: dados da filiação vindos da API (nome, CPF mascarado, matrícula, empresa, função, associado desde), somente leitura. | ASS | 2 | RN39 |
| RF21 | Permitir alterar e-mail, celular (opcional) e senha; e-mail e senha pedem a senha atual, e o novo e-mail só vale depois de confirmado pelo link. | ASS | 2 | RN39, RN53 |
| RF22 | Permitir baixar os dados guardados pelo site e excluir o próprio acesso (LGPD), sem alterar a filiação: apaga e-mail, celular, senha, sessões e notificações, cancela agendamentos futuros e mantém atendimentos realizados e faltas ligados à matrícula (E24). | ASS | 2 | RN39 |

### 2.4 M04 · Agendamentos do associado

Novo agendamento em 3 etapas, para si ou dependente, cancelar e remarcar.

| **ID** | **Requisito** | **Perfil** | **Fase** | **Regras** |
|---|---|---|---|---|
| RF23 | Listar os agendamentos do associado e dos dependentes (próximos e histórico) com estado: Confirmado, Concluído, Cancelado, Faltou. | ASS | 2 | — |
| RF24 | Novo agendamento, etapa 1: escolher o serviço e “Para quem” (associado ou dependente), mostrando “você usou X de N” no mês. | ASS | 2 | RN25, RN26, RN31, RN34 |
| RF25 | Etapa 2: escolher dia e horário entre os horários livres, até 30 dias à frente. | ASS | 2 | RN24 |
| RF26 | Etapa 3: confirmar na hora, após conferir a filiação na API, e enviar notificação e e-mail. | ASS | 2 | RN23 |
| RF27 | Bloquear a etapa 1 com mensagem própria quando houver agendamento ativo no serviço, limite do mês atingido ou suspensão por faltas. | ASS | 2 | RN25, RN26, RN31 |
| RF28 | Cancelar agendamento pelo site, com confirmação, até 2 h antes. | ASS | 2 | RN27 |
| RF29 | Remarcar agendamento pelo site até 2 h antes, escolhendo nova data e horário, com tela de “Remarcado”. | ASS | 2 | RN27, RN26 |

### 2.5 M05 · Painel: acesso e estrutura

Login da equipe com duas etapas, menu por perfil, Visão geral, notificações e busca.

| **ID** | **Requisito** | **Perfil** | **Fase** | **Regras** |
|---|---|---|---|---|
| RF30 | Login da equipe com e-mail e senha individuais e verificação em duas etapas por aplicativo autenticador. | ADM, COM, ATD | 1 | RN04, RN05 |
| RF31 | Exibir no menu lateral apenas as áreas permitidas ao perfil da pessoa. | ADM, COM, ATD | 1 | RN06 |
| RF32 | Visão geral com saudação, comunicado no ar, contadores por estado (No ar, Agendados, Rascunhos, Ocultos), “Precisa de atenção”, editados recentemente, criar rapidamente e próximas publicações. | ADM, COM | 1 | RN44 |
| RF33 | Painel lateral de notificações da equipe e busca global (Ctrl K) por conteúdos, arquivos e categorias. | ADM, COM, ATD | 1 | — |
| RF34 | Indicador de sincronização (“Tudo sincronizado”). Sem internet: aviso em todas as telas; só o editor (notícia e documento) guarda o rascunho no navegador, desativa Publicar/Agendar e salva sozinho quando a conexão volta, perguntando qual versão manter se houver conflito (E02). | ADM, COM, ATD | 1 | RN42 |
| RF72 | Convite da equipe: e-mail com link único válido por 48 h; a pessoa cria a senha, ativa as duas etapas lendo o QR code (ou digitando a chave) e recebe 8 códigos de recuperação antes do primeiro acesso. | ADM, COM, ATD | 1 | RN46, RN47, RN49 |
| RF73 | Mostrar a tela “Convite expirado ou já usado” e permitir ao Administrador geral reenviar o convite. | ADM | 1 | RN46 |
| RF74 | “Esqueci minha senha” no login da equipe: link por e-mail válido por 1 hora e de uso único, nova senha e encerramento das outras sessões. | ADM, COM, ATD | 1 | RN47, RN48 |
| RF75 | Entrar com um código de recuperação no lugar do código do aplicativo autenticador. | ADM, COM, ATD | 1 | RN49 |
| RF77 | E-mails automáticos da equipe: convite, redefinir senha, senha alterada, conta bloqueada por tentativas (pessoa e ADM), duas etapas redefinidas e publicação agendada que falhou (E21). | SIS | 1 | RN46, RN48 |

### 2.6 M06 · Painel: conteúdos e notícias

Lista, calendário, edição rápida, editor, pré-visualização e ciclo de vida.

| **ID** | **Requisito** | **Perfil** | **Fase** | **Regras** |
|---|---|---|---|---|
| RF35 | Listar conteúdos com filtros por tipo, estado, categoria e autor, busca, seleção em lote e aba Arquivados. | ADM, COM | 1 | RN10 |
| RF36 | Calendário de publicações e painel lateral de edição rápida. O calendário mostra também os comunicados, só para consulta (barras do período, sem arrastar; o clique abre a área Comunicados) (E17). | ADM, COM | 1 | — |
| RF37 | Editor de notícia com manchete, lide, texto rico, capa, galeria com legenda e crédito, categoria, autor e link para documento oficial. | ADM, COM | 1 | RN07, RN15 |
| RF38 | Salvar rascunho automaticamente a cada alteração e avisar ao sair sem salvar. | ADM, COM | 1 | RN10 |
| RF39 | Pré-visualizar o conteúdo como no site e publicar agora ou agendar data e hora, com modal de confirmação. | ADM, COM | 1 | RN09, RN10 |
| RF40 | Ocultar (com motivo), arquivar, restaurar e excluir conteúdos (excluir só rascunho nunca publicado, pelo autor ou pelo ADM), com confirmação e registro em Atividade. | ADM, COM | 1 | RN09, RN11, RN54 |
| RF78 | Fixar uma notícia no topo da página Notícias até uma data (uma por vez; fixar outra substitui, com aviso), pelo editor ou pela Edição rápida; sem fixada, o destaque é a mais recente (E14). | ADM, COM | 1 | RN58 |

### 2.7 M07 · Painel: documentos oficiais

Editais e acordos/convenções em PDF (somente Administrador geral).

| **ID** | **Requisito** | **Perfil** | **Fase** | **Regras** |
|---|---|---|---|---|
| RF41 | Publicar, substituir ou remover editais e acordos/convenções em PDF, com tipo, número, data, prazo ou vigência, abrangência e partes signatárias. | ADM | 1 | RN08, RN12 |
| RF42 | Permitir à Comunicação ver e baixar editais e acordos, sem editar. | COM | 1 | RN07 |

### 2.8 M08 · Painel: comunicados

Faixas no topo do site, com período e fila.

| **ID** | **Requisito** | **Perfil** | **Fase** | **Regras** |
|---|---|---|---|---|
| RF43 | Criar comunicado (texto, link, início e fim), agendar, ordenar a fila e pré-visualizar a faixa; no mobile, em folha inferior. | ADM, COM | 1 | RN14 |
| RF44 | Encerrar comunicado antes do fim, com confirmação, e duplicar um comunicado encerrado. | ADM, COM | 1 | RN14, RN09 |

### 2.9 M09 · Painel: Rádio Chofer

Episódios por link do YouTube e programa ao vivo.

| **ID** | **Requisito** | **Perfil** | **Fase** | **Regras** |
|---|---|---|---|---|
| RF45 | Adicionar episódio colando o link do YouTube, com título, capa e duração preenchidos automaticamente, e organizar os episódios. | ADM, COM | 1 | RN17 |

### 2.10 M10 · Painel: página inicial

Carrossel e destaques da Home.

| **ID** | **Requisito** | **Perfil** | **Fase** | **Regras** |
|---|---|---|---|---|
| RF46 | Escolher e ordenar os itens do carrossel e dos destaques da Home, com prévia. É a única fonte dos destaques da Home: no editor existe só o link “Destacar na Home” (E13). | ADM, COM | 1 | — |

### 2.11 M11 · Painel: benefícios

Parceiros, logo e desconto.

| **ID** | **Requisito** | **Perfil** | **Fase** | **Regras** |
|---|---|---|---|---|
| RF47 | Cadastrar, editar e arquivar parceiros com nome, logo, percentual de desconto, regras, se vale para dependentes, “Começa em” (opcional) e “Válido até” (opcional) (E12). | ADM | 1 | RN08, RN57 |

### 2.12 M12 · Painel: mídia

Biblioteca de imagens e arquivos, conversão HEIC e texto alternativo.

| **ID** | **Requisito** | **Perfil** | **Fase** | **Regras** |
|---|---|---|---|---|
| RF48 | Enviar imagens (JPG, PNG, WebP, HEIC) e arquivos, com conversão de HEIC no servidor e texto alternativo. | ADM, COM | 1 | RN15 |
| RF49 | Excluir arquivo da Mídia que não esteja em uso, com confirmação. | ADM, COM | 1 | RN16 |

### 2.13 M13 · Painel: atividade (auditoria)

Linha do tempo imutável de ações, com filtros.

| **ID** | **Requisito** | **Perfil** | **Fase** | **Regras** |
|---|---|---|---|---|
| RF50 | Exibir a linha do tempo de ações (quem, o quê, quando, motivo) com filtros por pessoa, área, tipo de ação e período, e detalhes do registro. | ADM | 1 | RN18 |

### 2.14 M14 · Painel: equipe e perfis

Convites, perfis, matriz de permissões e responsáveis por serviço.

| **ID** | **Requisito** | **Perfil** | **Fase** | **Regras** |
|---|---|---|---|---|
| RF51 | Listar a equipe com perfil, duas etapas, último acesso e serviços; convidar pessoa e editar acesso (perfil e serviços). | ADM | 1 | RN06, RN19 |
| RF52 | Exibir a matriz de permissões por perfil e o quadro “Quem cuida de cada serviço”. | ADM | 1 | RN07, RN08 |
| RF76 | Menu de ações da pessoa em Equipe e perfis: editar acesso, enviar link para nova senha, redefinir duas etapas (modal com motivo) e desativar acesso. | ADM | 1 | RN49, RN50 |

### 2.15 M15 · Painel: configurações

Dados do site, categorias e regras de segurança.

| **ID** | **Requisito** | **Perfil** | **Fase** | **Regras** |
|---|---|---|---|---|
| RF53 | Editar dados do site: endereço, CEP, telefone, WhatsApp da recepção, e-mail, horários, redes sociais, missão e história. | ADM | 1 | RN43 |
| RF54 | Criar e editar categorias, indicando onde aparecem: Notícias, Documentos e/ou Rádio Chofer (temas dos episódios) (E15). | ADM | 1 | — |
| RF55 | Aba “Regras de segurança” só de leitura, com o título “Regras fixas do sistema”: duas etapas obrigatórias, justificativa ao ocultar, confirmação de documento oficial e bloqueio após 5 tentativas. Nada é configurável (C9). | ADM | 1 | RN04, RN05, RN11, RN12 |

### 2.16 M16 · Painel: agendamentos

Agenda do dia, presença, balcão, serviços e horários, bloqueios, relatórios e versão mobile.

| **ID** | **Requisito** | **Perfil** | **Fase** | **Regras** |
|---|---|---|---|---|
| RF56 | Agenda do dia com filtro “Mostrar: Meus serviços \| Todos \| <serviço>”, lista por horário e estado. | ADM, ATD | 2 | RN20, RN21 |
| RF57 | Painel lateral de detalhe do agendamento com registro de presença (Concluído ou Faltou) e histórico do associado restrito aos serviços de quem vê. | ADM, ATD | 2 | RN30, RN56 |
| RF58 | Cancelar e remarcar agendamento pelo painel, com motivo obrigatório e aviso ao associado. | ADM, ATD | 2 | RN28 |
| RF59 | Agendar para associado no balcão: buscar por nome, CPF ou matrícula, escolher associado ou dependente e horário. | ADM, ATD | 2 | RN33 |
| RF60 | Permitir exceção ao limite no balcão, com motivo obrigatório. | ADM, ATD | 2 | RN33 |
| RF61 | Serviços e horários: listar serviços com duração, capacidade, limite e situação; editar serviço (Atendimento: duração, dias/horários e local). | ADM, ATD | 2 | RN19, RN22, RN36 |
| RF62 | Novo serviço (Administrador geral): nome, descrição, ícone, responsáveis, duração, atendimentos ao mesmo tempo, limite por associado, dias e horários, local e “Abrir no site agora”. | ADM | 2 | RN19, RN22, RN26 |
| RF63 | Bloquear horários e feriados por serviço ou para todos, cancelando e avisando quem já tinha horário. | ADM, ATD | 2 | RN35 |
| RF64 | Marcar como “Pendente de registro” os atendimentos sem presença ao fim do dia e alertar o responsável. | SIS | 2 | RN30 |
| RF65 | Relatórios por Dia, Mês, Ano ou período personalizado e por serviço: realizados, associados únicos, faltas, cancelados, gráfico por dia, tabela por serviço com comparecimento e lista de presença. | ADM, ATD | 2 | RN38 |
| RF66 | Exportar relatório em PDF ou Excel, com aviso de LGPD. | ADM, ATD | 2 | RN38 |
| RF67 | Versão mobile do painel para Atendimento: agenda do dia, relatórios e serviços. | ATD | 2 | — |

### 2.17 M17 · Integração com a API do sindicato e tarefas automáticas

Consulta de filiação, dados cadastrais e dependentes (login, primeiro acesso, agendamento e verificação diária). Fase 2 (E01); RF71 é da fase 1, pois não usa a API.

| **ID** | **Requisito** | **Perfil** | **Fase** | **Regras** |
|---|---|---|---|---|
| RF68 | Consultar na API do sindicato: situação da filiação, dados cadastrais e dependentes, a cada login, no primeiro acesso, antes de confirmar agendamento e no balcão; sem resposta, usar a última consulta de até 24 h (E22). | SIS | 2 (E01) | RN01, RN23 |
| RF69 | Verificar diariamente a situação da filiação de quem tem agendamento futuro e cancelar automaticamente os de filiação não ativa. | SIS | 2 | RN32 |
| RF70 | Enviar lembretes por e-mail e notificação 1 dia antes e 2 h antes do atendimento. | SIS | 2 | RN29 |
| RF71 | Publicar e retirar do ar automaticamente conteúdos e comunicados agendados. | SIS | 1 | RN10, RN14 |

## 3. Requisitos não funcionais

| **ID** | **Categoria** | **Requisito** |
|---|---|---|
| RNF01 | Segurança | Permissões conferidas no servidor em toda ação (perfil e responsabilidade por serviço); esconder o botão na tela não basta. |
| RNF02 | Segurança | Senhas com hash forte; duas etapas (TOTP) obrigatórias para a equipe; sessão da equipe expira após 2 h sem uso ou 12 h após o login (E05); sessão do associado conforme RN51. |
| RNF03 | Privacidade (LGPD) | CPF criptografado no banco e mascarado na tela; aceite dos termos registrado; exportações registradas; prazos de guarda padrão em parâmetros (E25), a validar com o advogado do sindicato. |
| RNF04 | Auditoria | Registro de Atividade apenas de inserção, sem alteração ou exclusão, inclusive no banco de dados. |
| RNF05 | Integridade | Agendamento sem conflito: um horário não pode ser confirmado duas vezes; limite conferido na mesma transação. |
| RNF06 | Fuso horário | Datas guardadas em UTC e exibidas em America/Bahia; prazos (2 h antes, fim do dia) calculados nesse fuso. |
| RNF07 | Desempenho | Páginas públicas rápidas no celular (meta: LCP abaixo de 2,5 s em 4G); imagens otimizadas; player do YouTube só no clique. |
| RNF08 | SEO | Páginas públicas renderizadas no servidor, com título, descrição e imagem de compartilhamento por notícia; mapa do site. |
| RNF09 | Acessibilidade | WCAG 2.1 AA: contraste, navegação por teclado, foco visível, texto alternativo obrigatório nas imagens publicadas. |
| RNF10 | Responsividade | Layouts desktop e mobile conforme o protótipo; temas claro e escuro com os tokens do Figma. Da tela de celular à de monitor grande, inclusive janela reduzida e telas baixas (tamanhos em `RESPONSIVO`, no `playwright.config.ts`), sem rolagem lateral, item esmagado, texto cortado ou sobreposto; no toque, alvos de 44 px, nada que dependa de hover, e girar o tablet não quebra a tela (E48). |
| RNF11 | Disponibilidade | Se a API do sindicato estiver fora do ar, o site público continua funcionando; login, agendamento e balcão usam a última consulta de até 24 h e, sem ela, mostram aviso de indisponibilidade (E22). |
| RNF12 | Atualização | Alterações em Configurações › Site visíveis no site em até 1 minuto. |
| RNF13 | Confiabilidade | Tarefas agendadas (publicações, lembretes, pendências, verificação diária) com nova tentativa em caso de falha. |
| RNF14 | Hospedagem | Docker num servidor (VPS) atrás do Cloudflare (DNS, CDN, certificado, WAF); arquivos no Cloudflare R2; ambientes de homologação e produção via GitHub Actions; backup diário criptografado no servidor do sindicato com teste trimestral (E26–E28). |
| RNF15 | Manutenção | Código em TypeScript, testes automáticos das regras de agendamento e monitoramento de erros. |

## 4. Integrações externas

| **Sistema** | **Uso** | **Direção** | **Fase** |
|---|---|---|---|
| API do sindicato | Situação da filiação, dados cadastrais (nome, CPF, matrícula, empresa, função, data de filiação) e dependentes. | Consulta | 2 (E01) |
| YouTube | Título, capa e duração dos episódios; player embutido. | Consulta | 1 |
| WhatsApp | Links para conversa com a recepção e canal oficial. | Link | 1 |
| Google Maps | Mapa e rota até a sede. | Link/embed | 1 |
| E-mail (SMTP) | Recuperação de senha, confirmações, lembretes e avisos. | Envio | 1 e 2 |
| Armazenamento de arquivos | Imagens, logos e PDFs oficiais no Cloudflare R2, compatível com S3 (E26). | Envio/leitura | 1 |

## 5. Telas do protótipo

Os requisitos foram levantados destas telas do Figma (arquivo “Oficial Sintra Site”). Cada tela tem versão clara e escura.

| **Área** | **Telas** |
|---|---|
| Home | Home desktop e mobile; Home com associado conectado. |
| Notícias | Lista e notícia aberta (desktop e mobile). |
| Sindicato | Instituição, Diretoria e Benefícios (desktop e mobile). |
| Documentos | Editais e Acordos coletivos (desktop e mobile). |
| Rádio Chofer e Contato | Desktop e mobile. |
| Entrar | Login, acesso bloqueado, primeiro acesso, filiação inativa e recuperar senha (desktop e mobile). |
| Área do associado | Início, Agendamentos, Cancelar, Novo agendamento (3 etapas), limite atingido, suspenso por faltas, Remarcar e Remarcado, Notificações, Meus dados. |
| Páginas de apoio | Menu mobile (visitante e conectado), menu da conta, 404, Política de privacidade, aviso de cookies. |
| Painel · acesso da equipe | Login, duas etapas, código de recuperação, esqueci minha senha, link enviado, nova senha, convite (criar senha, ativar duas etapas, códigos de recuperação), convite expirado, e-mails (convite, redefinir senha, senha alterada). |
| Painel · conteúdo | Visão geral, notificações, Conteúdos (lista, edição rápida, calendário, perfil Comunicação, menu Criar), Editor (notícia, documento oficial, confirmar, pré-visualização), Mídia, Comunicados, Rádio Chofer, Página inicial, Benefícios. |
| Painel · administração | Atividade, Equipe e perfis (convidar, editar acesso, menu de ações da pessoa, redefinir duas etapas), Configurações (Site, Categorias, nova categoria). |
| Painel · agendamentos | Agenda do dia (Atendimento, todos os serviços, outro responsável, visão ADM, presença pendente), detalhe, cancelar, remarcar, balcão, exceção ao limite, serviços e horários (ATD e ADM), editar e novo serviço, bloquear horário, relatórios (ADM e ATD), exportar. |
| Painel · mobile | Visão geral, Conteúdos, Editor, Login, Comunicados, novo comunicado, Agenda do dia, Relatórios e Serviços. |
| Referência | Mapa do painel e perfis; Fluxos e regras; Estados, confirmações e mensagens; Pendências de conteúdo. |

## 6. Rastreabilidade

Os IDs são os mesmos em todos os documentos: cada história de usuário (US, documento 04) aponta para os RF que atende; cada RF aponta para as RN que o detalham; e cada US tem seus critérios de aceitação (documento 06). Ao mudar um requisito, atualize os documentos ligados a ele.
