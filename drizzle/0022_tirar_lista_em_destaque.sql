-- A lista “Em destaque” sai do site e do painel (E63, #75): apaga as posições e o parâmetro.
DELETE FROM "destaque_home" WHERE "area" = 'lista';--> statement-breakpoint
DELETE FROM "parametro" WHERE "chave" = 'home.lista_posicoes';--> statement-breakpoint
ALTER TABLE "destaque_home" DROP CONSTRAINT "destaque_home_carrossel_escolhido";--> statement-breakpoint
ALTER TABLE "destaque_home" DROP CONSTRAINT "destaque_home_lista_so_noticia";--> statement-breakpoint
ALTER TABLE "destaque_home" DROP CONSTRAINT "destaque_home_lista_sem_datas";--> statement-breakpoint
ALTER TABLE "destaque_home" DROP CONSTRAINT "destaque_home_frase_so_no_carrossel";--> statement-breakpoint
ALTER TABLE "destaque_home" DROP CONSTRAINT "destaque_home_item_coerente";--> statement-breakpoint
DROP INDEX "destaque_home_versao_area_posicao_index";--> statement-breakpoint
ALTER TABLE "destaque_home" ALTER COLUMN "item_tipo" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "destaque_home_versao_posicao_index" ON "destaque_home" USING btree ("versao","posicao");--> statement-breakpoint
ALTER TABLE "destaque_home" DROP COLUMN "area";--> statement-breakpoint
ALTER TABLE "destaque_home" DROP COLUMN "modo";--> statement-breakpoint
ALTER TABLE "destaque_home" ADD CONSTRAINT "destaque_home_item_coerente" CHECK (("destaque_home"."item_tipo" = 'programa' AND "destaque_home"."item_id" IS NULL) OR ("destaque_home"."item_tipo" IN ('noticia', 'episodio') AND "destaque_home"."item_id" IS NOT NULL));--> statement-breakpoint
DROP TYPE "public"."area_destaque";--> statement-breakpoint
DROP TYPE "public"."modo_destaque";