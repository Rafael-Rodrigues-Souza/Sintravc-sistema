CREATE TYPE "public"."area_destaque" AS ENUM('carrossel', 'lista');--> statement-breakpoint
CREATE TYPE "public"."modo_destaque" AS ENUM('auto', 'escolhido');--> statement-breakpoint
CREATE TYPE "public"."tipo_item_destaque" AS ENUM('noticia', 'episodio', 'programa');--> statement-breakpoint
CREATE TYPE "public"."versao_destaque" AS ENUM('rascunho', 'publicado');--> statement-breakpoint
CREATE TABLE "destaque_home" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"versao" "versao_destaque" NOT NULL,
	"area" "area_destaque" NOT NULL,
	"posicao" integer NOT NULL,
	"modo" "modo_destaque" DEFAULT 'escolhido' NOT NULL,
	"item_tipo" "tipo_item_destaque",
	"item_id" uuid,
	"entra_em" timestamp with time zone,
	"sai_em" timestamp with time zone,
	"escolhido_por" uuid,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "destaque_home_posicao_positiva" CHECK ("destaque_home"."posicao" >= 1),
	CONSTRAINT "destaque_home_carrossel_escolhido" CHECK ("destaque_home"."area" = 'lista' OR ("destaque_home"."modo" = 'escolhido' AND "destaque_home"."item_tipo" IS NOT NULL)),
	CONSTRAINT "destaque_home_lista_so_noticia" CHECK ("destaque_home"."area" = 'carrossel' OR "destaque_home"."item_tipo" IS NULL OR "destaque_home"."item_tipo" = 'noticia'),
	CONSTRAINT "destaque_home_lista_sem_datas" CHECK ("destaque_home"."area" = 'carrossel' OR ("destaque_home"."entra_em" IS NULL AND "destaque_home"."sai_em" IS NULL)),
	CONSTRAINT "destaque_home_item_coerente" CHECK (("destaque_home"."modo" = 'auto' AND "destaque_home"."item_tipo" IS NULL AND "destaque_home"."item_id" IS NULL)
        OR ("destaque_home"."modo" = 'escolhido' AND "destaque_home"."item_tipo" = 'programa' AND "destaque_home"."item_id" IS NULL)
        OR ("destaque_home"."modo" = 'escolhido' AND "destaque_home"."item_tipo" IN ('noticia', 'episodio') AND "destaque_home"."item_id" IS NOT NULL)),
	CONSTRAINT "destaque_home_sai_depois_de_entrar" CHECK ("destaque_home"."entra_em" IS NULL OR "destaque_home"."sai_em" IS NULL OR "destaque_home"."sai_em" > "destaque_home"."entra_em")
);
--> statement-breakpoint
CREATE TABLE "pagina_inicial" (
	"id" text PRIMARY KEY DEFAULT 'home' NOT NULL,
	"revisao" integer DEFAULT 0 NOT NULL,
	"salvo_em" timestamp with time zone,
	"salvo_por" uuid,
	"publicado_em" timestamp with time zone,
	"publicado_por" uuid,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pagina_inicial_registro_unico" CHECK ("pagina_inicial"."id" = 'home')
);
--> statement-breakpoint
ALTER TABLE "destaque_home" ADD CONSTRAINT "destaque_home_escolhido_por_pessoa_equipe_id_fk" FOREIGN KEY ("escolhido_por") REFERENCES "public"."pessoa_equipe"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pagina_inicial" ADD CONSTRAINT "pagina_inicial_salvo_por_pessoa_equipe_id_fk" FOREIGN KEY ("salvo_por") REFERENCES "public"."pessoa_equipe"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pagina_inicial" ADD CONSTRAINT "pagina_inicial_publicado_por_pessoa_equipe_id_fk" FOREIGN KEY ("publicado_por") REFERENCES "public"."pessoa_equipe"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "destaque_home_versao_area_posicao_index" ON "destaque_home" USING btree ("versao","area","posicao");--> statement-breakpoint
-- Valores das regras da Home (E62, R8).
INSERT INTO parametro (chave, valor, descricao, regra) VALUES
  ('home.carrossel_maximo', '5', 'Página inicial: quantos itens o carrossel aceita', 'R8, E62'),
  ('home.lista_posicoes', '3', 'Página inicial: posições da lista “Em destaque”, ao lado do carrossel', 'R8, E62'),
  ('home.carrossel_alternar_segundos', '8', 'Home: tempo de cada item do carrossel antes de trocar para o próximo (segundos)', 'E62')
ON CONFLICT (chave) DO NOTHING;
--> statement-breakpoint
-- Controle do rascunho da Home e o slide do programa Rádio Chofer como item 1, no rascunho e no
-- publicado, para a Home nunca começar vazia (E62).
INSERT INTO pagina_inicial (id) VALUES ('home') ON CONFLICT (id) DO NOTHING;
--> statement-breakpoint
INSERT INTO destaque_home (versao, area, posicao, modo, item_tipo)
SELECT v::versao_destaque, 'carrossel', 1, 'escolhido', 'programa'
FROM (VALUES ('rascunho'), ('publicado')) AS versoes(v)
WHERE NOT EXISTS (SELECT 1 FROM destaque_home);
--> statement-breakpoint
-- Contadores manuais das redes (P6, E62): vazios até o sindicato informar. Sem número, a linha some.
UPDATE config_site
SET dados = jsonb_set(dados, '{contadores}', '{"instagram": null, "youtube": null, "canalWhatsapp": null}'::jsonb),
    atualizado_em = now()
WHERE id = 'site' AND NOT (dados ? 'contadores');
