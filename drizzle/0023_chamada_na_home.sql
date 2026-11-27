-- Tipo Chamada no carrossel da Home (E63, #75): foto da Mídia, frase, texto de apoio, botão e destino.
CREATE TYPE "public"."destino_chamada" AS ENUM('filie_se', 'beneficios');--> statement-breakpoint
ALTER TYPE "public"."tipo_item_destaque" ADD VALUE 'chamada';--> statement-breakpoint
ALTER TABLE "destaque_home" DROP CONSTRAINT "destaque_home_item_coerente";--> statement-breakpoint
ALTER TABLE "destaque_home" ADD COLUMN "foto_midia_id" uuid;--> statement-breakpoint
ALTER TABLE "destaque_home" ADD COLUMN "foto_alt" text;--> statement-breakpoint
ALTER TABLE "destaque_home" ADD COLUMN "texto_apoio" text;--> statement-breakpoint
ALTER TABLE "destaque_home" ADD COLUMN "botao_texto" text;--> statement-breakpoint
ALTER TABLE "destaque_home" ADD COLUMN "destino" "destino_chamada";--> statement-breakpoint
ALTER TABLE "destaque_home" ADD CONSTRAINT "destaque_home_foto_midia_id_midia_id_fk" FOREIGN KEY ("foto_midia_id") REFERENCES "public"."midia"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "destaque_home" ADD CONSTRAINT "destaque_home_chamada_completa" CHECK (("destaque_home"."item_tipo"::text = 'chamada') = ("destaque_home"."foto_midia_id" IS NOT NULL)
        AND ("destaque_home"."item_tipo"::text <> 'chamada' OR ("destaque_home"."frase_chamada" IS NOT NULL AND btrim(coalesce("destaque_home"."foto_alt", '')) <> '' AND btrim(coalesce("destaque_home"."texto_apoio", '')) <> '' AND "destaque_home"."destino" IS NOT NULL))
        AND ("destaque_home"."item_tipo"::text = 'chamada' OR ("destaque_home"."foto_alt" IS NULL AND "destaque_home"."texto_apoio" IS NULL AND "destaque_home"."botao_texto" IS NULL AND "destaque_home"."destino" IS NULL)));--> statement-breakpoint
ALTER TABLE "destaque_home" ADD CONSTRAINT "destaque_home_item_coerente" CHECK (("destaque_home"."item_tipo"::text = 'programa' AND "destaque_home"."item_id" IS NULL) OR ("destaque_home"."item_tipo"::text IN ('noticia', 'episodio', 'chamada') AND "destaque_home"."item_id" IS NOT NULL));--> statement-breakpoint
-- Limites da Chamada (E63, #75).
INSERT INTO parametro (chave, valor, descricao, regra) VALUES
  ('home.chamada_frase_maximo', '70', 'Página inicial: caracteres da frase de cada Chamada do carrossel', 'E63'),
  ('home.chamada_apoio_maximo', '160', 'Página inicial: caracteres do texto de apoio de cada Chamada do carrossel', 'E63'),
  ('home.chamada_botao_maximo', '24', 'Página inicial: caracteres do texto do botão de cada Chamada do carrossel', 'E63')
ON CONFLICT (chave) DO NOTHING;
