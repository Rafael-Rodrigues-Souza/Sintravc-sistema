CREATE TABLE "conta_login" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"pessoa_id" uuid NOT NULL,
	"id_no_provedor" text NOT NULL,
	"provedor" text NOT NULL,
	"token_acesso" text,
	"token_renovacao" text,
	"token_id" text,
	"token_acesso_expira_em" timestamp with time zone,
	"token_renovacao_expira_em" timestamp with time zone,
	"escopo" text,
	"senha_hash" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "duas_etapas" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"pessoa_id" uuid NOT NULL,
	"segredo" text NOT NULL,
	"codigos_recuperacao" text NOT NULL,
	"verificado" boolean DEFAULT true NOT NULL,
	"falhas_seguidas" integer DEFAULT 0 NOT NULL,
	"bloqueado_ate" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "sessao" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"pessoa_id" uuid NOT NULL,
	"token" text NOT NULL,
	"expira_em" timestamp with time zone NOT NULL,
	"ip" text,
	"agente_usuario" text,
	"ultimo_uso" timestamp with time zone DEFAULT now() NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessao_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "verificacao" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"identificador" text NOT NULL,
	"valor" text NOT NULL,
	"expira_em" timestamp with time zone NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pessoa_equipe" ADD COLUMN "email_verificado" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "pessoa_equipe" ADD COLUMN "imagem" text;--> statement-breakpoint
ALTER TABLE "pessoa_equipe" ADD COLUMN "duas_etapas_ativas" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "pessoa_equipe" ADD COLUMN "tentativas_erradas" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "pessoa_equipe" ADD COLUMN "bloqueada_ate" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "pessoa_equipe" ADD COLUMN "ultimo_acesso" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "conta_login" ADD CONSTRAINT "conta_login_pessoa_id_pessoa_equipe_id_fk" FOREIGN KEY ("pessoa_id") REFERENCES "public"."pessoa_equipe"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "duas_etapas" ADD CONSTRAINT "duas_etapas_pessoa_id_pessoa_equipe_id_fk" FOREIGN KEY ("pessoa_id") REFERENCES "public"."pessoa_equipe"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessao" ADD CONSTRAINT "sessao_pessoa_id_pessoa_equipe_id_fk" FOREIGN KEY ("pessoa_id") REFERENCES "public"."pessoa_equipe"("id") ON DELETE cascade ON UPDATE no action;