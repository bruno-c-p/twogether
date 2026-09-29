import { localDate, normalizeTag } from "@/features/budget/domain/format";
import type {
  BankAccount,
  GoalId,
  TransactionKind,
} from "@/features/budget/domain/types";

export interface PhraseDraft {
  kind: TransactionKind;
  amount: number;
  description: string;
  goal: GoalId | null;
  accountId: string;
  date: string;
  split: boolean;
  recurring: boolean;
  tags: string[];
  phrase: string;
}

export type PhraseResult = { draft: PhraseDraft } | { error: string };

const AMOUNT_ERROR =
  'Não encontrei o valor. Tente: "Gastei 300 reais de condomínio".';

const AMOUNT =
  /(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+,\d{1,2}|\d+(?:\.\d{1,2})?)\s*(mil\b)?/;

const INCOME_WORDS = /recebi|ganhei|entrou|salario|freela|reembolso/;

const INCOME_LABELS: [RegExp, string][] = [
  [/freela/, "Freela"],
  [/salario/, "Salário"],
  [/reembolso/, "Reembolso"],
];

// [pattern, description, goal] on accent-free lowercase text; first hit wins.
const KEYWORDS: [RegExp, string, GoalId][] = [
  [/condominio/, "Condomínio", "fixed"],
  [/aluguel/, "Aluguel", "fixed"],
  [/supermercado|mercado|feira/, "Mercado", "fixed"],
  [/\bluz\b|energia/, "Conta de luz", "fixed"],
  [/\bagua\b/, "Conta de água", "fixed"],
  [/internet/, "Internet", "fixed"],
  [/farmacia|remedio/, "Farmácia", "fixed"],
  [/uber|gasolina|combustivel/, "Transporte", "fixed"],
  [/netflix/, "Netflix", "pleasure"],
  [/spotify/, "Spotify", "pleasure"],
  [/jantar/, "Jantar", "pleasure"],
  [/almoco/, "Almoço", "pleasure"],
  [/restaurante/, "Restaurante", "pleasure"],
  [/ifood/, "iFood", "pleasure"],
  [/cinema/, "Cinema", "pleasure"],
  [/show/, "Show", "pleasure"],
  [/academia/, "Academia", "comfort"],
  [/terapia/, "Terapia", "comfort"],
  [/massagem/, "Massagem", "comfort"],
  [/curso/, "Curso", "knowledge"],
  [/livro/, "Livro", "knowledge"],
  [/viagem/, "Viagem", "targets"],
  [/presente/, "Presente", "targets"],
  [/invest|reserva|poupanca/, "Reserva", "freedom"],
];

function plain(text: string) {
  return text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function toCents(raw: string, thousand: boolean) {
  const reais = raw.includes(",")
    ? Number(raw.replaceAll(".", "").replace(",", "."))
    : /\.\d{3}$/.test(raw)
      ? Number(raw.replaceAll(".", ""))
      : Number(raw);

  return Math.round(reais * (thousand ? 1000 : 1) * 100);
}

function dateFor(text: string, today: Date) {
  const offset = /anteontem/.test(text) ? 2 : /ontem/.test(text) ? 1 : 0;
  const day = text.match(/\bdia\s+(\d{1,2})\b/);
  const date = new Date(today);

  date.setDate(date.getDate() - offset);

  if (day) {
    // Day 31 in a 30-day month rolls back to the last day instead of the next month.
    const last = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    date.setDate(Math.min(Math.max(Number(day[1]), 1), last.getDate()));
  }

  return localDate(date);
}

function describe(text: string, rest: string) {
  const named = rest.match(
    /\b(?:de|com|no|na|em)\s+([a-z ]{3,}?)(?=\s+(?:no|na|pelo|pela|ontem|hoje|dividi\w*|meio)\b|$)/,
  );

  return named ? capitalize(named[1].trim()) : text;
}

function findAccount(text: string, accounts: BankAccount[]) {
  const named = accounts.find((account) => {
    const name = plain(account.name).trim();

    return name.length > 1 && new RegExp(`\\b${name}\\b`).test(text);
  });

  return named?.id ?? (accounts.length === 1 ? accounts[0].id : "");
}

export function parsePhrase(
  input: string,
  accounts: BankAccount[],
  today = new Date(),
): PhraseResult {
  const tags = [...input.matchAll(/#([\p{L}\p{N}_-]+)/gu)].flatMap((match) => {
    const tag = normalizeTag(match[1]);

    return tag ? [tag] : [];
  });

  const text = plain(input.replace(/#[\p{L}\p{N}_-]+/gu, " "));
  const withoutDay = text.replace(/\bdia\s+\d{1,2}\b/, " ");
  const found = withoutDay.match(AMOUNT);
  const amount = found ? toCents(found[1], Boolean(found[2])) : 0;

  if (!found || amount < 1) return { error: AMOUNT_ERROR };

  const income = INCOME_WORDS.test(text);
  const hit = income ? undefined : KEYWORDS.find(([re]) => re.test(text));
  const incomeLabel = INCOME_LABELS.find(([re]) => re.test(text))?.[1];

  const description = income
    ? (incomeLabel ?? "Receita")
    : (hit?.[1] ?? describe("Despesa", withoutDay.replace(found[0], " ")));

  return {
    draft: {
      kind: income ? "income" : "expense",
      amount,
      description,
      goal: hit?.[2] ?? null,
      accountId: findAccount(text, accounts),
      date: dateFor(text, today),
      split: !income && /divid|meio a meio|metade|rach/.test(text),
      recurring: /todo mes|mensal/.test(text),
      tags: [...new Set(tags)].slice(0, 8),
      phrase: input.trim(),
    },
  };
}
