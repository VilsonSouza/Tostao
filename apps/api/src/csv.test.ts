import { describe, expect, it } from "vitest";
import { parseCsv } from "./csv.js";

describe("parseCsv", () => {
  it("lê despesas e receitas e ignora o cabeçalho", () => {
    const { rows, skipped } = parseCsv("data;descricao;valor\n2026-10-02;Mercado;-312,40\n05/10/2026;Salario;4.200,00");
    expect(skipped).toBe(0);
    expect(rows).toEqual([
      { date: "2026-10-02", description: "Mercado", amount: 312.4, type: "DEBIT" },
      { date: "2026-10-05", description: "Salario", amount: 4200, type: "CREDIT" },
    ]);
  });
  it("conta linhas inválidas como ignoradas", () => {
    expect(parseCsv("h\n2026-02-31;X;10\nlixo\n2026-10-01;Ok;-1").skipped).toBe(2);
  });
  it("aceita vírgula como separador com decimal em vírgula", () => {
    expect(parseCsv("2026-10-01,Padaria,-12,50").rows[0].amount).toBe(12.5);
  });
});
