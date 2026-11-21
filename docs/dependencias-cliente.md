# Dependências do cliente (sindicato)

Itens que o SINTRAVC precisa entregar ou decidir para o desenvolvimento avançar. Eles não fazem parte da entrevista de requisitos. Contato de TI do sindicato: **Leandro**.

| # | O que | Para que | Bloqueia | Situação |
|---|---|---|---|---|
| D1 | **API do sindicato:** documentação (endpoints, formato, como informa situação e dependentes), credenciais de homologação e de produção, limites de uso e janela de manutenção. | Login e primeiro acesso do associado; dependentes; verificação diária da filiação. | Toda a Fase 2: login do associado e agendamentos (E01). Não bloqueia a Fase 1. | Pendente |
| D2 | **Serviço de e-mail:** SMTP ou serviço da nuvem; domínio remetente (ex.: `nao-responda@sintravc.org.br`) com SPF, DKIM e DMARC configurados. | Convites e senha da equipe; recuperação de senha e avisos do associado. | Só a homologação e a produção (Fase 1). O desenvolvimento usa o Mailpit (E32). | Pendente |
| D3 | **Armazenamento compatível com S3** (candidato: Cloudflare R2, E26): bucket com versionamento, credenciais e política de acesso público para as imagens. | Mídia, capas, logos de parceiros e PDFs oficiais. | Só a homologação e a produção (Fase 1). O desenvolvimento usa o MinIO (E32). | Pendente |
| D4 | **Chave da YouTube Data API.** | Preencher sozinha a duração dos episódios do Rádio Chofer. Sem a chave, a duração é digitada à mão. | Nada; é uma melhoria | Pendente |
| D5 | **Conteúdo real:** endereço, telefones, CNPJ, história, diretoria, parceiros e créditos das fotos. Em 18/11/2026 o sindicato confirmou endereço, telefone, WhatsApp, e-mail, a fundação em 1993 e a Diretoria (9 pessoas); em 19/11/2026, o CEP (45000-705), o horário de atendimento (segunda a sexta, das 8h às 11h e das 14h às 17h) e as redes: Instagram e YouTube; o sindicato não tem Facebook nem canal no WhatsApp, e o site esconde rede sem link (E57). **Falta (#13):** o texto da história e os marcos “Primeira grande conquista” e “Marco de crescimento” (ano, título e texto); a mensagem do presidente; o mandato e a data da eleição da diretoria; uma frase sobre como a diretoria é escolhida; as fotos do topo da Instituição, do Contato e dos 9 diretores. **Quando chegarem as fotos da Diretoria (#64):** decidir se os cartões passam para a foto em pé (3:4) do Figma 58:996; hoje são deitadas (4:3), para o cartão continuar menor que o destaque do vice. | Lista completa na tela “Pendências de conteúdo” (246:19523). Os marcadores ficam na ConfigSite e em `src/conteudo/site.ts`. | Publicação do site | Pendente |
| D6 | **Política de privacidade e termos de uso** escritos pelo advogado do sindicato. | Aviso de cookies, primeiro acesso e rodapé. | Publicação do site | Pendente |
| D7 | **Lista das URLs do site atual** (sitemap ou exportação). | Redirecionamentos 301, para preservar o SEO (ver `decisoes.md`, item B2). | Publicação do site | Pendente |
| D8 | **Acesso ao Cloudflare** (DNS e o que mais estiver em uso), **servidor (VPS) para a aplicação** (E26) e **servidor de backup** do sindicato (E27). | Hospedagem, domínio e backups. | Publicação do site | Pendente |
| D9 | **Validação do advogado** para os prazos de guarda provisórios (E25) e para o texto sobre excluir acesso (E24). | Política de privacidade e limpeza automática. | Publicação da Fase 2 | Pendente |
| D10 | **Atendimento jurídico:** o atendimento jurídico é gratuito para associados? Qual texto e qual canal o bloco “Precisa de orientação?” da notícia aberta deve usar? **Também (#16):** o sindicato orienta cada trabalhador sobre como um acordo coletivo se aplica ao caso dele? Qual texto o bloco “Tem dúvidas sobre um acordo coletivo?” de Documentos › Acordos coletivos deve usar? | Bloco lateral da notícia aberta (Figma 100:15159) e de Acordos coletivos (75:1792). Os dois mostram “[Conteúdo a definir pelo sindicato]”, e o botão abre o WhatsApp da recepção (E59, E60). | Nada; o marcador fica visível | Pendente |
| D11 | **Fotos de Documentos:** a foto do destaque de Editais e a do topo de Acordos coletivos, com os créditos. | Topo de Documentos (Figma 73:629 / 74:1085 e 75:1438 / 76:1801). Até lá, o marcador “[Foto a definir pelo sindicato]” (E60). | Nada; o marcador fica visível | Pendente |

## Validar com o sindicato

São regras já adotadas no spec e implementadas assim. Precisam só de confirmação. Se o sindicato discordar, viram mudança no spec, mas não bloqueiam o desenvolvimento.

| # | O que confirmar | Como está hoje | Origem |
|---|---|---|---|
| V1 | Horário de “fim do dia” para marcar os atendimentos sem presença como “Pendente de registro”. | 23h59, horário da sede (America/Bahia). | P8, RN30 |
| V2 | Contagem de faltas para a suspensão. | Por mês do calendário (do dia 1 ao último dia), não “últimos 30 dias”. | P9, RN31 |
| V3 | “1 agendamento ativo por serviço”. | Vale por pessoa: o associado e cada dependente podem ter o seu. | P9, RN25 |
| V4 | Suspensão por 2 faltas. | Atinge só a pessoa que faltou, não a família toda. | E29, RN31 |
