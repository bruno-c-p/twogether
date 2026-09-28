export type PersonProperties = { email?: string; name?: string };

export type IdentityClient = {
  identify: (userId: string, person: PersonProperties) => void;
  reset: () => void;
};

export type SignedInPerson = {
  isLoaded: boolean;
  userId: string | undefined;
  email: string | undefined;
  name: string | null | undefined;
};

// Returns the user id PostHog is identified as after syncing with Clerk.
export function syncIdentity(
  client: IdentityClient,
  identified: string | null,
  person: SignedInPerson,
): string | null {
  if (!person.isLoaded) return identified;

  if (!person.userId) return null;

  if (identified === person.userId) return identified;

  if (identified) client.reset();

  const properties: PersonProperties = {};

  if (person.email) properties.email = person.email;

  if (person.name) properties.name = person.name;

  client.identify(person.userId, properties);

  return person.userId;
}
