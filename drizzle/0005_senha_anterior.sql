CREATE TABLE "senha_anterior" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"pessoa_id" uuid NOT NULL,
	"senha_hash" text NOT NULL,
	"criada_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "senha_anterior" ADD CONSTRAINT "senha_anterior_pessoa_id_pessoa_equipe_id_fk" FOREIGN KEY ("pessoa_id") REFERENCES "public"."pessoa_equipe"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "senha_anterior_pessoa_id_criada_em_index" ON "senha_anterior" USING btree ("pessoa_id","criada_em");