/** Um instante no horário da Bahia (UTC−3, sem horário de verão), para os testes de datas. */
export function naBahia(dia: string, hora = "10:00"): Date {
  return new Date(`${dia}T${hora}:00-03:00`);
}
