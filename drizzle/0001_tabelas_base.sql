CREATE TYPE "public"."ator_tipo" AS ENUM('pessoa', 'sistema', 'associado');--> statement-breakpoint
CREATE TYPE "public"."perfil" AS ENUM('ADM', 'COM', 'ATD');--> statement-breakpoint
CREATE TYPE "public"."situacao_pessoa" AS ENUM('pendente', 'ativa', 'desativada');--> statement-breakpoint
CREATE TABLE "atividade" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"quando" timestamp with time zone DEFAULT now() NOT NULL,
	"ator_tipo" "ator_tipo" NOT NULL,
	"ator_id" text,
	"acao" text NOT NULL,
	"area" text NOT NULL,
	"alvo_tipo" text NOT NULL,
	"alvo_id" text NOT NULL,
	"alvo_rotulo" text NOT NULL,
	"detalhe" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"motivo" text
);
--> statement-breakpoint
CREATE TABLE "convite" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"pessoa_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expira_em" timestamp with time zone NOT NULL,
	"usado_em" timestamp with time zone,
	"criado_por" uuid,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "convite_tokenHash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "pessoa_equipe" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"nome" text NOT NULL,
	"email" "citext" NOT NULL,
	"perfil" "perfil" NOT NULL,
	"situacao" "situacao_pessoa" DEFAULT 'pendente' NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pessoa_equipe_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "parametro" (
	"chave" text PRIMARY KEY NOT NULL,
	"valor" jsonb NOT NULL,
	"descricao" text NOT NULL,
	"regra" text NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "convite" ADD CONSTRAINT "convite_pessoa_id_pessoa_equipe_id_fk" FOREIGN KEY ("pessoa_id") REFERENCES "public"."pessoa_equipe"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "convite" ADD CONSTRAINT "convite_criado_por_pessoa_equipe_id_fk" FOREIGN KEY ("criado_por") REFERENCES "public"."pessoa_equipe"("id") ON DELETE no action ON UPDATE no action;