import { describe, expect, it } from "vitest";
import { signToken, verifyToken } from "./auth.js";

describe("jwt", () => {
  it("assina e verifica o id do usuário", () => {
    expect(verifyToken(signToken("11111111-1111-1111-1111-111111111111"))).toBe("11111111-1111-1111-1111-111111111111");
  });
  it("rejeita token adulterado", () => {
    expect(() => verifyToken(signToken("abc") + "x")).toThrow();
  });
});
