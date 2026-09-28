import { describe, expect, test } from "vitest";
import {
  syncIdentity,
  type IdentityClient,
  type PersonProperties,
} from "@/lib/posthog-identity";

function recordingClient() {
  const calls: string[] = [];
  const people: PersonProperties[] = [];

  const client: IdentityClient = {
    identify: (userId, person) => {
      calls.push(`identify:${userId}`);
      people.push(person);
    },
    reset: () => {
      calls.push("reset");
    },
  };

  return { client, calls, people };
}

const ana = {
  isLoaded: true,
  userId: "ana",
  email: "ana@example.com",
  name: "Ana Souza",
};

describe("syncIdentity", () => {
  test("waits for Clerk to load", () => {
    const { client, calls } = recordingClient();

    expect(syncIdentity(client, "ana", { ...ana, isLoaded: false })).toBe(
      "ana",
    );
    expect(calls).toEqual([]);
  });

  test("identifies a signed-in person once, with only known properties", () => {
    const { client, calls, people } = recordingClient();
    const identified = syncIdentity(client, null, { ...ana, name: null });

    expect(identified).toBe("ana");
    expect(syncIdentity(client, identified, ana)).toBe("ana");
    expect(calls).toEqual(["identify:ana"]);
    expect(people).toEqual([{ email: "ana@example.com" }]);
  });

  test("resets before identifying a different person", () => {
    const { client, calls } = recordingClient();

    expect(syncIdentity(client, "bia", ana)).toBe("ana");
    expect(calls).toEqual(["reset", "identify:ana"]);
  });

  test("forgets the identity after sign-out", () => {
    const { client, calls } = recordingClient();

    expect(
      syncIdentity(client, "ana", {
        ...ana,
        userId: undefined,
        email: undefined,
      }),
    ).toBeNull();
    expect(calls).toEqual([]);
  });
});
