import { describe, expect, it } from "vitest";
import { guessCategory, isBillPayment } from "./categorize.js";

describe("categorize", () => {
  it("reconhece pagamento de fatura antes de outras regras", () => {
    expect(isBillPayment("Pagamento de fatura Nubank")).toBe(true);
    expect(guessCategory("Pagamento de fatura")).toBe("Transferências");
  });
  it("categoriza por palavra-chave", () => {
    expect(guessCategory("Mercado Bairro")).toBe("Supermercado");
    expect(guessCategory("NETFLIX.COM")).toBe("Assinaturas");
    expect(guessCategory("Salário outubro")).toBe("Salário");
  });
  it("cai em Outros quando nada combina", () => {
    expect(guessCategory("xyz qualquer")).toBe("Outros");
  });
});
