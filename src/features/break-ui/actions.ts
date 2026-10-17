import { z } from "zod";
import { fixture, readDataset } from "@/features/break-ui/fixtures";
import {
  budgetMutations,
  type BudgetActions,
} from "@/features/budget/registry";
import {
  goalPercentagesSchema,
  transactionSchema,
} from "@/features/budget/domain/schemas";
import { nameSchema } from "@/lib/account-schemas";
import type {
  Transaction,
  WorkspaceSnapshot,
} from "@/features/budget/domain/types";

const snapshotSchema = z.object({
  user: z.object({ id: z.string(), name: nameSchema }),
  household: z.object({
    id: z.string(),
    members: z.array(
      z.object({
        id: z.string(),
        name: nameSchema,
        percentages: goalPercentagesSchema,
        percentagesRevision: z.int(),
      }),
    ),
  }),
  budget: z.object({
    percentages: goalPercentagesSchema,
    transactions: z.array(transactionSchema),
  }),
});

function storageKey() {
  return `break-ui:${readDataset()}`;
}

export function readSnapshot(): WorkspaceSnapshot {
  const stored = localStorage.getItem(storageKey());

  return stored
    ? snapshotSchema.parse(JSON.parse(stored))
    : fixture(readDataset());
}

function write(snapshot: WorkspaceSnapshot) {
  localStorage.setItem(storageKey(), JSON.stringify(snapshot));

  return Promise.resolve(snapshot);
}

export function resetFixture() {
  localStorage.removeItem(storageKey());
  window.location.reload();
}

export function loadWorkspace() {
  return Promise.resolve(readSnapshot());
}

type Name = keyof BudgetActions;

// Tagged with its mutation, so `satisfies Fakes` rejects a fake filed under
// another mutation whose input happens to fit.
type Fakes = { [K in Name]: BudgetActions[K] & { readonly mutation: K } };

function fake<K extends Name>(mutation: K, run: BudgetActions[K]) {
  return Object.assign(run, { mutation });
}

function fromOptimistic<K extends Name, Input>(definition: {
  name: K;
  parse: (input: Input) => Input;
  optimistic: (snapshot: WorkspaceSnapshot, input: Input) => WorkspaceSnapshot;
}) {
  const run = async ({ data }: { data: Input }) => {
    await write(definition.optimistic(readSnapshot(), definition.parse(data)));
  };

  return Object.assign(run, { mutation: definition.name });
}

const deleted = new Map<string, Transaction>();

const removeTransaction = fromOptimistic(budgetMutations.deleteTransaction);

export const budgetActions = {
  saveTransaction: fromOptimistic(budgetMutations.saveTransaction),
  deleteTransaction: fake("deleteTransaction", async (request) => {
    const transaction = readSnapshot().budget.transactions.find(
      (item) => item.id === request.data.id,
    );

    if (transaction) deleted.set(request.data.id, transaction);

    await removeTransaction(request);
  }),
  restoreTransaction: fake("restoreTransaction", async ({ data }) => {
    const transaction = deleted.get(data.id);

    if (!transaction) throw new Error("Fixture excluída não encontrada.");

    await write(
      budgetMutations.restoreTransaction.optimistic(readSnapshot(), data, {
        transaction,
      }),
    );
  }),
  settleSplit: fromOptimistic(budgetMutations.settleSplit),
  unsettleSplit: fromOptimistic(budgetMutations.unsettleSplit),
  savePercentages: fake("savePercentages", async ({ data }) => {
    const snapshot = readSnapshot();
    const percentages = goalPercentagesSchema.parse(data.percentages);

    await write({
      ...snapshot,
      budget: { ...snapshot.budget, percentages },
      household: {
        ...snapshot.household,
        members: snapshot.household.members.map((member) =>
          member.id === snapshot.user.id
            ? {
                ...member,
                percentages,
                percentagesRevision: member.percentagesRevision + 1,
              }
            : member,
        ),
      },
    });
  }),
} satisfies Fakes;

export function setName({ data }: { data: { name: string } }) {
  const snapshot = readSnapshot();
  const name = nameSchema.parse(data.name);

  return write({
    ...snapshot,
    user: { ...snapshot.user, name },
    household: {
      ...snapshot.household,
      members: snapshot.household.members.map((member) =>
        member.id === snapshot.user.id ? { ...member, name } : member,
      ),
    },
  });
}

export function createInvite() {
  return Promise.resolve({ inviteToken: "0123456789abcdef".repeat(4) });
}

export function revokeInvite() {
  return Promise.resolve();
}
