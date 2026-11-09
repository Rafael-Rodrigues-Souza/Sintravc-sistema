CREATE TYPE "public"."sujeito_token" AS ENUM('equipe', 'associado');--> statement-breakpoint
CREATE TABLE "token_senha" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"sujeito" "sujeito_token" NOT NULL,
	"sujeito_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expira_em" timestamp with time zone NOT NULL,
	"usado_em" timestamp with time zone,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "token_senha_tokenHash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE INDEX "token_senha_sujeito_sujeito_id_index" ON "token_senha" USING btree ("sujeito","sujeito_id");--> statement-breakpoint
INSERT INTO parametro (chave, valor, descricao, regra) VALUES
  ('equipe.link_senha_intervalo_segundos', '60', 'Espera para pedir outro link de nova senha da equipe (segundos)', 'RN48');
