-- Atividade é só inserção (RN18, RNF04; spec §11 T1).
-- Bloqueia UPDATE e DELETE em cada linha e TRUNCATE na tabela, inclusive por SQL direto.
-- A limpeza dos registros com mais de 5 anos (E25) vai precisar de um caminho próprio,
-- feito numa migração com a aprovação do ADM; não desligue estes triggers no código.
CREATE FUNCTION atividade_so_insercao() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'A Atividade é só inserção (RN18): % não é permitido.', TG_OP
    USING ERRCODE = 'insufficient_privilege';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER atividade_sem_update_delete
  BEFORE UPDATE OR DELETE ON atividade
  FOR EACH ROW EXECUTE FUNCTION atividade_so_insercao();
--> statement-breakpoint
CREATE TRIGGER atividade_sem_truncate
  BEFORE TRUNCATE ON atividade
  FOR EACH STATEMENT EXECUTE FUNCTION atividade_so_insercao();
