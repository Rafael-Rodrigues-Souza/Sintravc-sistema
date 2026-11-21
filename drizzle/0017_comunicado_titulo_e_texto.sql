-- Comunicado com título e texto (E58, RN14): a mensagem da faixa vira o título (até 140) e entra o
-- texto (até 1.000), mostrado na janela e na página /comunicados. Os que já existem recebem o título
-- como texto, para não ficarem inválidos.
ALTER TABLE "comunicado" RENAME COLUMN "mensagem" TO "titulo";--> statement-breakpoint
ALTER TABLE "comunicado" RENAME CONSTRAINT "comunicado_mensagem_ate_140" TO "comunicado_titulo_ate_140";--> statement-breakpoint
ALTER TABLE "comunicado" ADD COLUMN "texto" text;--> statement-breakpoint
UPDATE "comunicado" SET "texto" = "titulo";--> statement-breakpoint
ALTER TABLE "comunicado" ALTER COLUMN "texto" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "comunicado" ADD CONSTRAINT "comunicado_texto_ate_1000" CHECK (char_length("comunicado"."texto") <= 1000);
