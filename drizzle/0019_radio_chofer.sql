CREATE TYPE "public"."estado_episodio" AS ENUM('rascunho', 'agendado', 'publicado');--> statement-breakpoint
CREATE TABLE "episodio" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"numero" integer NOT NULL,
	"youtube_id" text NOT NULL,
	"titulo" text NOT NULL,
	"titulo_youtube" text,
	"canal_youtube" text,
	"resumo" text,
	"tema_categoria_id" uuid,
	"exibicao_em" timestamp with time zone,
	"duracao_seg" integer,
	"capa_midia_id" uuid,
	"transcricao" text,
	"ultimo_programa" boolean DEFAULT false NOT NULL,
	"estado" "estado_episodio" DEFAULT 'rascunho' NOT NULL,
	"ja_publicado" boolean DEFAULT false NOT NULL,
	"publicado_em" timestamp with time zone,
	"criado_por" uuid NOT NULL,
	"atualizado_por" uuid NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "episodio_numero_unique" UNIQUE("numero"),
	CONSTRAINT "episodio_youtubeId_unique" UNIQUE("youtube_id"),
	CONSTRAINT "episodio_numero_positivo" CHECK ("episodio"."numero" > 0),
	CONSTRAINT "episodio_youtube_id_formato" CHECK ("episodio"."youtube_id" ~ '^[A-Za-z0-9_-]{11}$'),
	CONSTRAINT "episodio_titulo_ate_120" CHECK (char_length("episodio"."titulo") BETWEEN 1 AND 120),
	CONSTRAINT "episodio_resumo_ate_200" CHECK ("episodio"."resumo" IS NULL OR char_length("episodio"."resumo") <= 200),
	CONSTRAINT "episodio_transcricao_ate_150000" CHECK ("episodio"."transcricao" IS NULL OR char_length("episodio"."transcricao") <= 150000),
	CONSTRAINT "episodio_duracao_positiva" CHECK ("episodio"."duracao_seg" IS NULL OR "episodio"."duracao_seg" > 0),
	CONSTRAINT "episodio_exibicao_fora_do_rascunho" CHECK ("episodio"."estado" = 'rascunho' OR "episodio"."exibicao_em" IS NOT NULL)
);
--> statement-breakpoint
ALTER TABLE "episodio" ADD CONSTRAINT "episodio_tema_categoria_id_categoria_id_fk" FOREIGN KEY ("tema_categoria_id") REFERENCES "public"."categoria"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "episodio" ADD CONSTRAINT "episodio_capa_midia_id_midia_id_fk" FOREIGN KEY ("capa_midia_id") REFERENCES "public"."midia"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "episodio" ADD CONSTRAINT "episodio_criado_por_pessoa_equipe_id_fk" FOREIGN KEY ("criado_por") REFERENCES "public"."pessoa_equipe"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "episodio" ADD CONSTRAINT "episodio_atualizado_por_pessoa_equipe_id_fk" FOREIGN KEY ("atualizado_por") REFERENCES "public"."pessoa_equipe"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "episodio_estado_exibicao_em_index" ON "episodio" USING btree ("estado","exibicao_em");--> statement-breakpoint
CREATE UNIQUE INDEX "episodio_um_ultimo_programa" ON "episodio" USING btree ("ultimo_programa") WHERE "episodio"."ultimo_programa";--> statement-breakpoint
-- Programa ao vivo do Rádio Chofer (E61, P10): de segunda a sexta, das 13h às 14h no horário da
-- Bahia (RF05; o fim foi informado pelo Rafael em 21/11/2026), no canal das redes do sindicato.
-- Só grava se ainda não houver, para não apagar o que a Comunicação já tenha configurado.
UPDATE config_site
SET dados = jsonb_set(
      dados,
      '{programa}',
      jsonb_build_object(
        'ativo', true,
        'canal', dados -> 'redes' -> 'youtube',
        'dias', '[1,2,3,4,5]'::jsonb,
        'inicio', '13:00',
        'fim', '14:00'
      )
    ),
    atualizado_em = now()
WHERE id = 'site' AND NOT (dados ? 'programa');
