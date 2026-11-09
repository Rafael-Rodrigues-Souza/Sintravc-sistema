CREATE TYPE "public"."escopo_categoria" AS ENUM('noticias', 'documentos', 'radio', 'beneficios');--> statement-breakpoint
CREATE TYPE "public"."estado_conteudo" AS ENUM('rascunho', 'agendado', 'publicado', 'oculto', 'arquivado');--> statement-breakpoint
CREATE TYPE "public"."tipo_conteudo" AS ENUM('noticia', 'edital', 'acordo');--> statement-breakpoint
CREATE TYPE "public"."tipo_link" AS ENUM('fonte', 'anexo');--> statement-breakpoint
CREATE TABLE "categoria" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"nome" text NOT NULL,
	"cor" text NOT NULL,
	"ordem" integer NOT NULL,
	"escopos" "escopo_categoria"[] NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categoria_nome_unique" UNIQUE("nome")
);
--> statement-breakpoint
CREATE TABLE "conteudo" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"tipo" "tipo_conteudo" NOT NULL,
	"slug" text,
	"titulo" text DEFAULT '' NOT NULL,
	"estado" "estado_conteudo" DEFAULT 'rascunho' NOT NULL,
	"agendado_para" timestamp with time zone,
	"publicado_em" timestamp with time zone,
	"ja_publicado" boolean DEFAULT false NOT NULL,
	"motivo_oculto" text,
	"autor_id" uuid NOT NULL,
	"categoria_id" uuid,
	"versao" integer DEFAULT 0 NOT NULL,
	"revisao" integer DEFAULT 1 NOT NULL,
	"atualizado_por" uuid NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "conteudo_tipo_slug_unique" UNIQUE("tipo","slug")
);
--> statement-breakpoint
CREATE TABLE "conteudo_link" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"conteudo_id" uuid NOT NULL,
	"tipo" "tipo_link" NOT NULL,
	"titulo" text DEFAULT '' NOT NULL,
	"url" text,
	"midia_id" uuid,
	"visivel" boolean DEFAULT true NOT NULL,
	"ordem" integer NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "noticia" (
	"conteudo_id" uuid PRIMARY KEY NOT NULL,
	"linha_fina" text DEFAULT '' NOT NULL,
	"lide" text DEFAULT '' NOT NULL,
	"corpo" jsonb DEFAULT '{"type":"doc","content":[]}'::jsonb NOT NULL,
	"capa_midia_id" uuid,
	"capa_alt" text DEFAULT '' NOT NULL,
	"capa_legenda" text DEFAULT '' NOT NULL,
	"assinatura" text DEFAULT '' NOT NULL,
	"local" text DEFAULT '' NOT NULL,
	"palavras_chave" text[] DEFAULT '{}'::text[] NOT NULL,
	"fixada_ate" timestamp with time zone,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "conteudo" ADD CONSTRAINT "conteudo_autor_id_pessoa_equipe_id_fk" FOREIGN KEY ("autor_id") REFERENCES "public"."pessoa_equipe"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conteudo" ADD CONSTRAINT "conteudo_categoria_id_categoria_id_fk" FOREIGN KEY ("categoria_id") REFERENCES "public"."categoria"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conteudo" ADD CONSTRAINT "conteudo_atualizado_por_pessoa_equipe_id_fk" FOREIGN KEY ("atualizado_por") REFERENCES "public"."pessoa_equipe"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conteudo_link" ADD CONSTRAINT "conteudo_link_conteudo_id_conteudo_id_fk" FOREIGN KEY ("conteudo_id") REFERENCES "public"."conteudo"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conteudo_link" ADD CONSTRAINT "conteudo_link_midia_id_midia_id_fk" FOREIGN KEY ("midia_id") REFERENCES "public"."midia"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "noticia" ADD CONSTRAINT "noticia_conteudo_id_conteudo_id_fk" FOREIGN KEY ("conteudo_id") REFERENCES "public"."conteudo"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "noticia" ADD CONSTRAINT "noticia_capa_midia_id_midia_id_fk" FOREIGN KEY ("capa_midia_id") REFERENCES "public"."midia"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "conteudo_tipo_estado_index" ON "conteudo" USING btree ("tipo","estado");--> statement-breakpoint
CREATE INDEX "conteudo_atualizado_em_index" ON "conteudo" USING btree ("atualizado_em");--> statement-breakpoint
CREATE INDEX "conteudo_link_conteudo_id_ordem_index" ON "conteudo_link" USING btree ("conteudo_id","ordem");--> statement-breakpoint
-- Categorias iniciais (Figma 117:3030). A tela de Categorias fica no #20; só o ADM gerencia (RN08).
INSERT INTO categoria (nome, cor, ordem, escopos) VALUES
  ('Geral',                'azul',    1, '{noticias}'),
  ('Jurídico',             'marinho', 2, '{noticias}'),
  ('Benefícios',           'amarelo', 3, '{noticias}'),
  ('Esportes',             'vermelho',4, '{noticias}'),
  ('Rádio Chofer',         'aviso',   5, '{noticias}'),
  ('Assembleias',          'azul',    6, '{documentos}'),
  ('Acordos e convenções', 'marinho', 7, '{documentos}');
--> statement-breakpoint
-- Intervalo do salvamento automático do editor (RF38, E40). Só o ADM altera, direto no banco.
INSERT INTO parametro (chave, valor, descricao, regra) VALUES
  ('editor.salvamento_automatico_segundos', '2', 'Editor: segundos sem digitar até o rascunho ser salvo sozinho', 'RF38, E40');
