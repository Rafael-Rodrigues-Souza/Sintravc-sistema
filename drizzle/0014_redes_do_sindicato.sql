-- Redes do sindicato (#64; E57), informadas pelo Rafael em 19/11/2026. Só preenche a rede que
-- ainda está sem link, para não apagar o que alguém já tenha configurado. O Facebook e o canal
-- no WhatsApp continuam sem link: sem canal, o ícone do WhatsApp abre a recepção.
UPDATE config_site
SET dados = jsonb_set(dados, '{redes,instagram}', '"https://www.instagram.com/sintravc.ba/"'),
    atualizado_em = now()
WHERE id = 'site' AND dados -> 'redes' ->> 'instagram' IS NULL;
--> statement-breakpoint
UPDATE config_site
SET dados = jsonb_set(dados, '{redes,youtube}', '"https://www.youtube.com/@melodialives"'),
    atualizado_em = now()
WHERE id = 'site' AND dados -> 'redes' ->> 'youtube' IS NULL;
