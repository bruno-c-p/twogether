import { describe, expect, it } from "vitest";
import { parsePhrase } from "@/features/budget/domain/phrase";

const accounts = [
  { id: "itau", name: "Itaú", openingBalance: 0 },
  { id: "nu", name: "Nubank", openingBalance: 0 },
];

const today = new Date(2026, 8, 28);

function draft(text: string, list = accounts) {
  const result = parsePhrase(text, list, today);

  if ("error" in result) throw new Error(result.error);

  return result.draft;
}

describe("parsePhrase", () => {
  it("reads a simple expense and suggests a goal", () => {
    expect(draft("Gastei 300 reais de condomínio")).toMatchObject({
      kind: "expense",
      amount: 30000,
      description: "Condomínio",
      goal: "fixed",
      accountId: "",
      date: "2026-09-28",
      split: false,
    });
  });

  it("reads account, split and a decimal amount", () => {
    expect(draft("Jantar de 180 no Itaú, dividi com a Bia")).toMatchObject({
      amount: 18000,
      goal: "pleasure",
      accountId: "itau",
      split: true,
    });
  });

  it("reads income with thousands separators", () => {
    expect(draft("Recebi 1.200 de freela")).toMatchObject({
      kind: "income",
      amount: 120000,
      description: "Freela",
      goal: null,
    });
  });

  it("reads yesterday, cents and the single account fallback", () => {
    expect(draft("Uber 32,50 ontem", [accounts[1]])).toMatchObject({
      amount: 3250,
      date: "2026-09-27",
      accountId: "nu",
    });
  });

  it("reads a day of the month, clamped to the month length", () => {
    expect(draft("Academia 130 dia 10").date).toBe("2026-09-10");
    expect(draft("Academia 130 dia 31").date).toBe("2026-09-30");
  });

  it("reads mil, tags and monthly repetition", () => {
    expect(draft("Viagem 2 mil todo mês #ferias")).toMatchObject({
      amount: 200000,
      recurring: true,
      tags: ["ferias"],
    });
  });

  it("falls back to a generic description without a goal", () => {
    expect(draft("Paguei 50 de conserto de sapato")).toMatchObject({
      description: "Conserto de sapato",
      goal: null,
    });
  });

  it("asks for a value when none is found", () => {
    expect(parsePhrase("comprei pão", accounts, today)).toHaveProperty("error");
  });
  it("keeps the trimmed phrase for the confirm bubble", () => {
    expect(draft("  Uber 32,50 ontem  ").phrase).toBe("Uber 32,50 ontem");
  });

  it("reads the day before yesterday and today", () => {
    expect(draft("Cinema 60 anteontem").date).toBe("2026-09-26");
    expect(draft("Cinema 60 hoje").date).toBe("2026-09-28");
  });

  it("reads thousands with cents and a currency prefix", () => {
    expect(draft("Aluguel R$ 1.234,56").amount).toBe(123456);
    expect(draft("Aluguel 2,5 mil").amount).toBe(250000);
  });

  it("leaves the account empty when several exist and none is named", () => {
    expect(draft("Jantar 90").accountId).toBe("");
    expect(draft("Jantar 90 no Nubank").accountId).toBe("nu");
  });

  it("does not match an account name inside another word", () => {
    expect(draft("Comprei 40 de cafeitau").accountId).toBe("");
  });

  it("matches account names with regex characters as plain text", () => {
    const special = [
      { id: "cpp", name: "C++", openingBalance: 0 },
      { id: "pj", name: "Itaú (PJ)", openingBalance: 0 },
      { id: "inter", name: "Inter+", openingBalance: 0 },
      { id: "nu", name: "Nubank", openingBalance: 0 },
    ];

    expect(draft("Livro 40 no C++", special).accountId).toBe("cpp");
    expect(draft("Mercado 90 no Itaú (PJ)", special).accountId).toBe("pj");
    expect(draft("Mercado 90 no Itaú PJ", special).accountId).toBe("");
    expect(draft("Mercado 90 no Inter+", special).accountId).toBe("inter");
    expect(draft("Mercado 90 no Interrr", special).accountId).toBe("");
    expect(draft("Mercado 90 no Nubank", special).accountId).toBe("nu");
  });

  it("marks split for 'meio a meio' but never for income", () => {
    expect(draft("Mercado 200 meio a meio").split).toBe(true);
    expect(draft("Recebi 500 de reembolso dividido").split).toBe(false);
  });

  it("dedupes tags and drops empty ones", () => {
    expect(draft("Cinema 60 #lazer #Lazer #").tags).toEqual(["lazer"]);
  });

  it("rejects empty input and a zero amount", () => {
    expect(parsePhrase("", accounts, today)).toHaveProperty("error");
    expect(parsePhrase("Gastei 0", accounts, today)).toHaveProperty("error");
  });
});
