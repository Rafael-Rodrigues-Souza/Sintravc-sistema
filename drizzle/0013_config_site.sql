CREATE TABLE "config_site" (
	"id" text PRIMARY KEY DEFAULT 'site' NOT NULL,
	"dados" jsonb NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "config_site_registro_unico" CHECK ("config_site"."id" = 'site')
);
--> statement-breakpoint
-- Dados do site (#13; RN43). Contato confirmado pelo sindicato em 18/11/2026 (comentário da issue #13);
-- CEP e horário de atendimento informados pelo Rafael em 19/11/2026.
-- Entre colchetes, o que ainda falta (D5): o site mostra esses textos como marcador visível.
INSERT INTO config_site (id, dados) VALUES ('site', '{
  "contato": {
    "endereco": "Rua Laudicéia Gusmão, 586 - Centro",
    "cidade": "Vitória da Conquista - BA",
    "cep": "45000-705",
    "telefone": "7734234959",
    "whatsappRecepcao": "557734234959",
    "email": "sintravcrodoviarios@gmail.com",
    "horario": "Segunda a sexta, das 8h às 11h e das 14h às 17h"
  },
  "mensagemFiliacao": "Olá! Quero me filiar ao SINTRAVC.",
  "redes": { "instagram": null, "youtube": null, "facebook": null, "canalWhatsapp": null },
  "missao": "O SINTRAVC existe para representar os interesses da categoria, defender direitos individuais e coletivos e fortalecer a organização dos trabalhadores. Atuamos para que cada profissional tenha voz, informação e apoio na busca por relações de trabalho mais justas e dignas.",
  "historia": {
    "marcos": [
      { "id": "fundacao", "ano": "1993", "titulo": "Fundação", "resumo": "Trabalhadores do transporte se unem para criar uma entidade que desse voz à categoria.", "texto": "[Texto da fundação a definir pelo sindicato]" },
      { "id": "primeira-grande-conquista", "ano": "[Ano]", "titulo": "[Primeira grande conquista]", "resumo": "[Resumo a definir pelo sindicato]", "texto": "[Texto da primeira grande conquista a definir pelo sindicato]" },
      { "id": "marco-de-crescimento", "ano": "[Ano]", "titulo": "[Marco de crescimento]", "resumo": "[Resumo a definir pelo sindicato]", "texto": "[Texto do marco de crescimento a definir pelo sindicato]" },
      { "id": "hoje", "ano": "Hoje", "titulo": "Seguimos em frente", "resumo": "Atuação diária na defesa de direitos e na organização dos rodoviários.", "texto": "[Texto sobre a atuação de hoje a definir pelo sindicato]" }
    ]
  }
}'::jsonb);
--> statement-breakpoint
-- Aviso de cookies (E56): por quanto tempo vale a escolha da pessoa.
INSERT INTO parametro (chave, valor, descricao, regra) VALUES
  ('site.consentimento_cookies_dias', '365', 'Validade da escolha no aviso de cookies (dias)', 'E56');
