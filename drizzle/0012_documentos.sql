CREATE TYPE "public"."subtipo_documento" AS ENUM('convocacao', 'eleicao', 'prestacao_contas', 'outros', 'act', 'cct');--> statement-breakpoint
CREATE TABLE "documento" (
	"conteudo_id" uuid PRIMARY KEY NOT NULL,
	"tipo" "tipo_conteudo" NOT NULL,
	"numero" text DEFAULT '' NOT NULL,
	"numero_normalizado" text,
	"subtipo" "subtipo_documento",
	"data_documento" date,
	"data_evento" timestamp with time zone,
	"tem_vigencia" boolean DEFAULT false NOT NULL,
	"vigencia_inicio" date,
	"vigencia_fim" date,
	"abrangencia" text DEFAULT '' NOT NULL,
	"partes_signatarias" text DEFAULT '' NOT NULL,
	"resumo" text DEFAULT '' NOT NULL,
	"pdf_midia_id" uuid,
	"texto_pesquisavel" text DEFAULT '' NOT NULL,
	"confirmado_oficial_por" uuid,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "documento_tipo" CHECK ("documento"."tipo" in ('edital', 'acordo')),
	CONSTRAINT "documento_resumo_limite" CHECK (char_length("documento"."resumo") <= 400),
	CONSTRAINT "documento_vigencia_ordem" CHECK ("documento"."vigencia_fim" is null or "documento"."vigencia_inicio" is null or "documento"."vigencia_fim" >= "documento"."vigencia_inicio")
);
--> statement-breakpoint
ALTER TABLE "documento" ADD CONSTRAINT "documento_conteudo_id_conteudo_id_fk" FOREIGN KEY ("conteudo_id") REFERENCES "public"."conteudo"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documento" ADD CONSTRAINT "documento_pdf_midia_id_midia_id_fk" FOREIGN KEY ("pdf_midia_id") REFERENCES "public"."midia"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documento" ADD CONSTRAINT "documento_confirmado_oficial_por_pessoa_equipe_id_fk" FOREIGN KEY ("confirmado_oficial_por") REFERENCES "public"."pessoa_equipe"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "documento_numero_unico_por_tipo" ON "documento" USING btree ("tipo","numero_normalizado") WHERE "documento"."numero_normalizado" is not null;--> statement-breakpoint
-- Documentos oficiais (#12, E46): selo “Novo” da página Documentos (#16) e limites da leitura do texto do PDF (P3).
INSERT INTO parametro (chave, valor, descricao, regra) VALUES
  ('documento.novo_dias',                 '7',     'Documento oficial: dias com o selo “Novo” depois de publicado', 'E46'),
  ('documento.extracao_tempo_maximo_ms',  '20000', 'Documento oficial: tempo máximo para ler o texto do PDF no envio (ms)', 'P3'),
  ('documento.extracao_paginas_maximas',  '200',   'Documento oficial: páginas lidas do PDF para o texto pesquisável', 'P3');
