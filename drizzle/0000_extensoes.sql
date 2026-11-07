-- Extensões usadas pelo sistema.
-- pgcrypto: gen_random_uuid() e funções de hash/criptografia (CPF, spec §11).
-- citext: texto que ignora maiúsculas e minúsculas (e-mails da equipe).
CREATE EXTENSION IF NOT EXISTS pgcrypto;--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS citext;
