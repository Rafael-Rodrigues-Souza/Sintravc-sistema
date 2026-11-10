CREATE TABLE "notificacao_equipe" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"pessoa_id" uuid NOT NULL,
	"tipo" text NOT NULL,
	"texto" text NOT NULL,
	"link" text,
	"lida_em" timestamp with time zone,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "conteudo" ADD COLUMN "agendado_por" uuid;--> statement-breakpoint
ALTER TABLE "notificacao_equipe" ADD CONSTRAINT "notificacao_equipe_pessoa_id_pessoa_equipe_id_fk" FOREIGN KEY ("pessoa_id") REFERENCES "public"."pessoa_equipe"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notificacao_equipe_pessoa_id_lida_em_index" ON "notificacao_equipe" USING btree ("pessoa_id","lida_em");--> statement-breakpoint
ALTER TABLE "conteudo" ADD CONSTRAINT "conteudo_agendado_por_pessoa_equipe_id_fk" FOREIGN KEY ("agendado_por") REFERENCES "public"."pessoa_equipe"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- Tarefas automáticas (pg-boss): novas tentativas em caso de falha (RNF13, E44).
INSERT INTO parametro (chave, valor, descricao, regra) VALUES
  ('tarefas.tentativas',        '3',  'Tarefas automáticas: novas tentativas depois da primeira falha', 'RNF13'),
  ('tarefas.intervalo_segundos', '60', 'Tarefas automáticas: espera entre uma tentativa e outra (segundos)', 'RNF13');
