CREATE TABLE "visualizacao_diaria" (
	"conteudo_id" uuid NOT NULL,
	"dia" date NOT NULL,
	"total" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "visualizacao_diaria_conteudo_id_dia_pk" PRIMARY KEY("conteudo_id","dia")
);
--> statement-breakpoint
ALTER TABLE "visualizacao_diaria" ADD CONSTRAINT "visualizacao_diaria_conteudo_id_conteudo_id_fk" FOREIGN KEY ("conteudo_id") REFERENCES "public"."conteudo"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "visualizacao_diaria_dia_index" ON "visualizacao_diaria" USING btree ("dia");--> statement-breakpoint
CREATE INDEX "noticia_fixada_ate" ON "noticia" USING btree ("fixada_ate") WHERE "noticia"."fixada_ate" is not null;--> statement-breakpoint
-- Notícias no site (E30, E59): janela e quantidade das "Mais lidas".
INSERT INTO parametro (chave, valor, descricao, regra) VALUES
  ('noticias.mais_lidas_dias', '7', 'Mais lidas: quantos dias de visualizações entram na conta', 'E30'),
  ('noticias.mais_lidas_quantidade', '3', 'Mais lidas: quantas notícias o bloco mostra', 'E30')
ON CONFLICT (chave) DO NOTHING;
