-- Mídia (issue #7; spec §2.2; RN15, RN16, R7, E39).
-- unaccent: busca de arquivos sem diferença de acento ("convocacao" acha "convocação").
CREATE EXTENSION IF NOT EXISTS unaccent;--> statement-breakpoint
CREATE TYPE "public"."tipo_midia" AS ENUM('imagem', 'pdf', 'documento');--> statement-breakpoint
CREATE TABLE "midia" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"chave_r2" text NOT NULL,
	"nome_arquivo" text NOT NULL,
	"tipo" "tipo_midia" NOT NULL,
	"mime" text NOT NULL,
	"largura" integer,
	"altura" integer,
	"bytes" bigint NOT NULL,
	"paginas" integer,
	"alt" text,
	"legenda" text,
	"enviado_por" uuid NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "midia_chave_r2_unique" UNIQUE("chave_r2")
);
--> statement-breakpoint
CREATE TABLE "midia_uso" (
	"midia_id" uuid NOT NULL,
	"dono_tipo" text NOT NULL,
	"dono_id" uuid NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "midia_uso_midia_id_dono_tipo_dono_id_pk" PRIMARY KEY("midia_id","dono_tipo","dono_id")
);
--> statement-breakpoint
ALTER TABLE "midia" ADD CONSTRAINT "midia_enviado_por_pessoa_equipe_id_fk" FOREIGN KEY ("enviado_por") REFERENCES "public"."pessoa_equipe"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "midia_uso" ADD CONSTRAINT "midia_uso_midia_id_midia_id_fk" FOREIGN KEY ("midia_id") REFERENCES "public"."midia"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "midia_criado_em_index" ON "midia" USING btree ("criado_em");--> statement-breakpoint
CREATE INDEX "midia_uso_dono_tipo_dono_id_index" ON "midia_uso" USING btree ("dono_tipo","dono_id");--> statement-breakpoint
-- Valores das regras da Mídia (regras-de-negocio.md §3). Só o ADM altera, direto no banco.
INSERT INTO parametro (chave, valor, descricao, regra) VALUES
  ('midia.tamanho_maximo_bytes',  '10485760', 'Mídia: tamanho máximo de cada arquivo (bytes, 10 MB)', 'R7'),
  ('midia.imagem_lado_maximo_px', '2400',     'Mídia: imagens com o lado maior acima disto são reduzidas (pixels)', 'RN15, E39'),
  ('midia.jpg_qualidade',         '82',       'Mídia: qualidade do JPG e do WebP gravados (1 a 100)', 'RN15, E39');
