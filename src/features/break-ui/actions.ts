import { z } from "zod";
import { fixture, readDataset } from "@/features/break-ui/fixtures";
import {
  goalPercentagesSchema,
  nameSchema,
  transactionSchema,
} from "@/features/budget/domain/schemas";
import type {
  GoalPercentages,
  Transaction,
  WorkspaceSnapshot,
} from "@/features/budget/domain/types";
import {
  optimisticDelete,
  optimisticRestore,
  optimisticSave,
  optimisticSettle,
  optimisticUnsettle,
} from "@/features/budget/workspace";

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

export function saveTransaction({
  data,
}: {
  data: { transaction: Transaction; occurrences?: number };
}) {
  transactionSchema.parse(data.transaction);

  return write(optimisticSave(readSnapshot(), data));
}

const deleted = new Map<string, Transaction>();

export function deleteTransaction({
  data,
}: {
  data: { id: string; following?: { id: string }[] };
}) {
  const snapshot = readSnapshot();

  const transaction = snapshot.budget.transactions.find(
    (item) => item.id === data.id,
  );

  if (transaction) deleted.set(data.id, transaction);

  return write(optimisticDelete(snapshot, data));
}

export function restoreTransaction({ data }: { data: { id: string } }) {
  const transaction = deleted.get(data.id);

  if (!transaction)
    return Promise.reject(new Error("Fixture excluída não encontrada."));

  return write(optimisticRestore(readSnapshot(), transaction));
}

export function savePercentages({
  data,
}: {
  data: { percentages: GoalPercentages };
}) {
  const snapshot = readSnapshot();
  const percentages = goalPercentagesSchema.parse(data.percentages);

  return write({
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
}

export function settleSplit({ data }: { data: { id: string } }) {
  return write(optimisticSettle(readSnapshot(), data));
}

export function unsettleSplit({ data }: { data: { id: string } }) {
  return write(optimisticUnsettle(readSnapshot(), data));
}

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
