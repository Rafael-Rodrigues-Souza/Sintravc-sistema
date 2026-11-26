ALTER TABLE "destaque_home" ADD COLUMN "frase_chamada" text;--> statement-breakpoint
ALTER TABLE "destaque_home" ADD CONSTRAINT "destaque_home_frase_so_no_carrossel" CHECK ("destaque_home"."area" = 'carrossel' OR "destaque_home"."frase_chamada" IS NULL);--> statement-breakpoint
ALTER TABLE "destaque_home" ADD CONSTRAINT "destaque_home_frase_nao_vazia" CHECK ("destaque_home"."frase_chamada" IS NULL OR btrim("destaque_home"."frase_chamada") <> '');--> statement-breakpoint
-- Limite da frase de chamada do carrossel da Home (E62, #75).
INSERT INTO parametro (chave, valor, descricao, regra) VALUES
  ('home.frase_chamada_maximo', '90', 'Página inicial: caracteres da frase de chamada de cada item do carrossel', 'E62')
ON CONFLICT (chave) DO NOTHING;
