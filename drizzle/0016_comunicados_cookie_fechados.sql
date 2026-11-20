-- Comunicados: validade do cookie com os comunicados que o visitante fechou no X (E58).
INSERT INTO parametro (chave, valor, descricao, regra) VALUES
  ('comunicados.cookie_fechados_dias', '365', 'Faixa de comunicado: por quantos dias o navegador lembra os comunicados que o visitante fechou no X', 'E58')
ON CONFLICT (chave) DO NOTHING;
