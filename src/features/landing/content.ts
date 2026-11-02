import { DEFAULT_PERCENTAGES, GOALS } from "@/features/budget";
import { halfDown, minusCents, percentageOf, type Cents } from "@/lib/decimal";

// Every visible string on /conheca. The couple (Ana and Leo) and their
// amounts are a worked example, not customers; the rules they illustrate
// (half rounded down, the payer keeps the odd cent, six goals that sum to
// 100) are the app's own, computed with the same helpers the store uses.

const amount = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2 });

const formatCents = (value: Cents) => amount.format(value / 100);

// SAFETY: a literal whole number of cents.
const GROCERIES = 8745 as Cents;

const owed = halfDown(GROCERIES);

const odd = minusCents(minusCents(GROCERIES, owed), owed);

export const couple = { payer: "Ana", partner: "Leo" } as const;

export const split = {
  label: "Mercado de sábado",
  total: formatCents(GROCERIES),
  half: formatCents(owed),
  kept: formatCents(minusCents(GROCERIES, owed)),
  odd: formatCents(odd),
};

export const hero = {
  title: "Contas a dois, sem planilha.",
  intro:
    "Vocês lançam o que gastam, cada um do seu celular, e dividem o que é dos dois. O twogether faz a conta até o último centavo.",
  cta: "Começar nosso orçamento",
  rule: "Metade arredondada para baixo. O centavo que sobra fica com quem pagou.",
  summary: `${couple.payer} pagou R$ ${split.total} no ${split.label.toLowerCase()} e dividiu com ${couple.partner}: ${couple.partner} deve R$ ${split.half} e ${couple.payer} fica com R$ ${split.odd} a mais.`,
};

export const statement =
  "Um espaço para duas pessoas e nenhuma terceira. Vocês veem as mesmas transações, editam as mesmas metas e sabem, a qualquer hora do mês, quanto ainda cabe em cada uma.";

export const settle = {
  title: "Dividiu? Quem deve é quem marca o pagamento.",
  // What the receipt beside the steps reads after each one.
  status: [
    `Dividido com ${couple.partner}`,
    `${couple.partner} deve R$ ${split.half}, em aberto`,
    "Pago no domingo",
  ],
  steps: [
    {
      title: `${couple.payer} lança o mercado`,
      text: `R$ ${split.total} em Custo fixo, com “Dividir com ${couple.partner}” ligado. A despesa inteira continua no nome dela.`,
    },
    {
      title: `${couple.partner} vê R$ ${split.half} em aberto`,
      text: "Só quem deve pode marcar como pago, escolhendo a data em que acertou.",
    },
    {
      title: "O acerto vira lançamento",
      text: `Uma receita para ${couple.payer}, uma despesa para ${couple.partner}. Valor, tipo e divisão travam até o pagamento ser desfeito.`,
    },
  ],
};

// SAFETY: a literal whole number of cents.
const EXAMPLE_INCOME = 1_000_000 as Cents;

export const goals = {
  title: "Seis metas, um 100%.",
  intro:
    "Cada meta planeja em cima da renda somada dos dois, mesmo quando o filtro mostra só um de vocês. Mudem os percentuais quando quiserem, desde que fechem 100.",
  example: `Exemplo com renda somada de R$ ${formatCents(EXAMPLE_INCOME)}`,
  bands: GOALS.map((goal) => ({
    id: goal.id,
    name: goal.name,
    description: goal.description,
    percent: DEFAULT_PERCENTAGES[goal.id],
    planned: formatCents(
      percentageOf(EXAMPLE_INCOME, DEFAULT_PERCENTAGES[goal.id]),
    ),
  })),
};

export const features = {
  title: "O resto, sem cerimônia.",
  rows: [
    {
      name: "Nós, ou cada um",
      text: "A visão Nós soma os dois. O filtro por pessoa mostra só o seu lado, e as metas seguem planejando pelo casal.",
    },
    {
      name: "Um mês por vez",
      text: "Cada mês tem endereço próprio. Mande o link e ele abre no mesmo mês para o seu par.",
    },
    {
      name: "Os dois ao mesmo tempo",
      text: "O que um salva aparece para o outro ao voltar ao app. Se os dois editam a mesma transação, ninguém sobrescreve ninguém: o app pede para revisar.",
    },
    {
      name: "Apagou sem querer",
      text: "Desfaça na hora. Quem criou e quem editou por último ficam registrados.",
    },
    {
      name: "Sem senha",
      text: "Seu e-mail recebe um código de seis dígitos. O convite para o seu par vale para uma pessoa e expira em 48 horas.",
    },
    {
      name: "Pergunte ao seu assistente",
      text: "Conecte um assistente de IA, como Claude ou ChatGPT, e pergunte quanto ainda cabe em Prazeres este mês.",
    },
  ],
};

export const footer = {
  title: "Comecem pelo próximo mercado.",
  cta: hero.cta,
  signIn: "Já tenho conta",
  tagline: "Orçamento a dois, com leveza.",
};

export const meta = {
  title: "twogether: orçamento a dois, até o último centavo",
  description:
    "Orçamento compartilhado para casais: lancem gastos, dividam despesas meio a meio e planejem seis metas que somam 100% da renda dos dois.",
};
