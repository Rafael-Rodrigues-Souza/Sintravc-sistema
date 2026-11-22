import { describe, expect, it } from "vitest";

import { esquemaProgramaAoVivo, minutosDoDia } from "@/lib/config-site/esquema";

import { completarCanal } from "./gravar-programa";
import { linhaAoVivo, linksDoCanal, programaNoAr, textoDaHora, textoDoHorario, textoDosDias } from "./programa";

const programa = {
  ativo: true,
  canal: "https://www.youtube.com/@sintravc",
  dias: [1, 2, 3, 4, 5],
  inicio: "13:00",
  fim: "14:00",
};

describe("programa ao vivo: textos", () => {
  it("mostra só o início, como no Figma, mesmo com o fim às 14h", () => {
    expect(textoDoHorario(programa)).toBe("Segunda a sexta · 13h");
    expect(linhaAoVivo(programa)).toBe("Ao vivo de segunda a sexta · 13h");
    expect(textoDaHora("13:30")).toBe("13h30");
  });

  it("escreve os dias pela ordem da semana, começando na segunda", () => {
    expect(textoDosDias([0, 1, 2, 3, 4, 5, 6])).toBe("todos os dias");
    expect(textoDosDias([6, 1, 2, 3, 4, 5])).toBe("segunda a sábado");
    expect(textoDosDias([1, 3, 5])).toBe("segunda, quarta e sexta");
    expect(textoDosDias([6, 0])).toBe("sábado e domingo");
    expect(textoDosDias([3])).toBe("quarta");
    expect(linhaAoVivo({ dias: [0, 1, 2, 3, 4, 5, 6], inicio: "07:00" })).toBe("Ao vivo todos os dias · 7h");
    expect(linhaAoVivo({ dias: [1, 3], inicio: "13:00" })).toBe("Ao vivo às segundas e quartas · 13h");
  });
});

describe("programa ao vivo: no ar agora (horário da Bahia, UTC−3)", () => {
  // 23/11/2026 é uma segunda-feira.
  it("entre o início e o fim, num dia marcado", () => {
    expect(programaNoAr(programa, new Date("2026-11-23T16:00:00Z"))).toBe(true); // 13h00 na Bahia
    expect(programaNoAr(programa, new Date("2026-11-23T16:59:00Z"))).toBe(true); // 13h59
  });

  it("o fim não conta, e antes do início também não", () => {
    expect(programaNoAr(programa, new Date("2026-11-23T17:00:00Z"))).toBe(false); // 14h00
    expect(programaNoAr(programa, new Date("2026-11-23T15:59:00Z"))).toBe(false); // 12h59
  });

  it("fora dos dias marcados ou desligado, não está no ar", () => {
    expect(programaNoAr(programa, new Date("2026-11-22T16:30:00Z"))).toBe(false); // domingo
    expect(programaNoAr({ ...programa, ativo: false }, new Date("2026-11-23T16:30:00Z"))).toBe(false);
  });

  it("usa o dia da Bahia, não o do UTC", () => {
    // Sexta 21h30 na Bahia = sábado 00h30 em UTC.
    const noturno = { ...programa, inicio: "21:00", fim: "22:00" };
    expect(programaNoAr(noturno, new Date("2026-11-28T00:30:00Z"))).toBe(true);
  });
});

describe("horários em minutos", () => {
  it("compara pelo relógio, não pelo texto", () => {
    expect(minutosDoDia("13:30")).toBe(810);
    expect(minutosDoDia("09:05")).toBe(545);
    expect(esquemaProgramaAoVivo.safeParse({ ...programa, inicio: "09:00", fim: "13:00" }).success).toBe(true);
    expect(esquemaProgramaAoVivo.safeParse({ ...programa, inicio: "13:00", fim: "13:00" }).success).toBe(false);
  });
});

describe("links do canal", () => {
  it("assistir abre o canal; inscrever acrescenta o sub_confirmation", () => {
    expect(linksDoCanal("https://www.youtube.com/@sintravc")).toEqual({
      assistir: "https://www.youtube.com/@sintravc",
      inscrever: "https://www.youtube.com/@sintravc?sub_confirmation=1",
    });
    expect(linksDoCanal(null)).toBeNull();
  });

  it("completa o https:// do canal digitado sem ele", () => {
    expect(completarCanal("youtube.com/@sintravc")).toBe("https://youtube.com/@sintravc");
    expect(completarCanal("https://www.youtube.com/@sintravc")).toBe("https://www.youtube.com/@sintravc");
    expect(completarCanal("  ")).toBeNull();
    expect(completarCanal(null)).toBeNull();
  });
});
