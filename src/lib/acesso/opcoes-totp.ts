/**
 * O código do aplicativo autenticador (TOTP): quantos números e de quantos em quantos segundos muda.
 * Um lugar só para o plugin twoFactor, a nossa conferência no aceite (E37), as telas e os testes.
 * Não vai para o Parametro: mudar isso invalidaria os aplicativos já configurados.
 */
export const DIGITOS_TOTP = 6;
export const PERIODO_TOTP_SEGUNDOS = 30;

/** No formato do @better-auth/utils/otp e do plugin twoFactor. */
export const OPCOES_TOTP = { digits: DIGITOS_TOTP, period: PERIODO_TOTP_SEGUNDOS } as const;
