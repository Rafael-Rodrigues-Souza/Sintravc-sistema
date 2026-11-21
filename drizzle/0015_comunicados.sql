CREATE TYPE "public"."estado_comunicado" AS ENUM('rascunho', 'agendado', 'publicado', 'encerrado');--> statement-breakpoint
CREATE TABLE "comunicado" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"mensagem" text NOT NULL,
	"link_conteudo_id" uuid,
	"link_url" text,
	"inicio" timestamp with time zone,
	"fim" timestamp with time zone,
	"ordem_fila" integer NOT NULL,
	"estado" "estado_comunicado" DEFAULT 'rascunho' NOT NULL,
	"ja_publicado" boolean DEFAULT false NOT NULL,
	"publicado_em" timestamp with time zone,
	"encerrado_em" timestamp with time zone,
	"encerrado_por" uuid,
	"criado_por" uuid NOT NULL,
	"atualizado_por" uuid NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "comunicado_um_link_so" CHECK ("comunicado"."link_conteudo_id" IS NULL OR "comunicado"."link_url" IS NULL),
	CONSTRAINT "comunicado_mensagem_ate_140" CHECK (char_length("comunicado"."mensagem") <= 140),
	CONSTRAINT "comunicado_fim_depois_do_inicio" CHECK ("comunicado"."inicio" IS NULL OR "comunicado"."fim" IS NULL OR "comunicado"."fim" > "comunicado"."inicio"),
	CONSTRAINT "comunicado_periodo_fora_do_rascunho" CHECK ("comunicado"."estado" = 'rascunho' OR ("comunicado"."inicio" IS NOT NULL AND "comunicado"."fim" IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "comunicado" ADD CONSTRAINT "comunicado_link_conteudo_id_conteudo_id_fk" FOREIGN KEY ("link_conteudo_id") REFERENCES "public"."conteudo"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comunicado" ADD CONSTRAINT "comunicado_encerrado_por_pessoa_equipe_id_fk" FOREIGN KEY ("encerrado_por") REFERENCES "public"."pessoa_equipe"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comunicado" ADD CONSTRAINT "comunicado_criado_por_pessoa_equipe_id_fk" FOREIGN KEY ("criado_por") REFERENCES "public"."pessoa_equipe"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comunicado" ADD CONSTRAINT "comunicado_atualizado_por_pessoa_equipe_id_fk" FOREIGN KEY ("atualizado_por") REFERENCES "public"."pessoa_equipe"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "comunicado_estado_ordem_fila_index" ON "comunicado" USING btree ("estado","ordem_fila");--> statement-breakpoint
-- Comunicados: troca automática da faixa no site, com vários no ar (RN14, E58).
INSERT INTO parametro (chave, valor, descricao, regra) VALUES
  ('comunicados.alternar_segundos', '8', 'Faixa de comunicado: tempo de cada comunicado antes de trocar para o próximo (segundos)', 'E58')
ON CONFLICT (chave) DO NOTHING;
