CREATE TABLE "conteudo_versao" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"conteudo_id" uuid NOT NULL,
	"versao" integer NOT NULL,
	"snapshot" jsonb NOT NULL,
	"criado_por" uuid NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "conteudo_versao_conteudoId_versao_unique" UNIQUE("conteudo_id","versao")
);
--> statement-breakpoint
ALTER TABLE "conteudo" ADD COLUMN "revisao_publicada" integer;--> statement-breakpoint
ALTER TABLE "conteudo_versao" ADD CONSTRAINT "conteudo_versao_conteudo_id_conteudo_id_fk" FOREIGN KEY ("conteudo_id") REFERENCES "public"."conteudo"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conteudo_versao" ADD CONSTRAINT "conteudo_versao_criado_por_pessoa_equipe_id_fk" FOREIGN KEY ("criado_por") REFERENCES "public"."pessoa_equipe"("id") ON DELETE no action ON UPDATE no action;