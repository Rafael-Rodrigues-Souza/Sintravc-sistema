/**
 * Dados do site que o e2e grava na ConfigSite logo depois das migrações (e2e/preparar.ts), antes de
 * o servidor ler a ConfigSite pela primeira vez. O seed real deixa as redes vazias (D5); aqui o
 * Facebook ganha um link de teste para conferir que a mesma lista de redes vale na barra superior,
 * no rodapé e no Contato.
 */
export const FACEBOOK_DE_TESTE = "https://www.facebook.com/sintravc-teste-e2e";
