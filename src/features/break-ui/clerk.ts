// Imported by the account container, which the harness replaces with its view.
// Fail explicitly if a future harness change calls authentication hooks.
export function useUser(): never {
  throw new Error("Clerk login is outside the isolated UI harness.");
}

export function useClerk(): never {
  throw new Error("Clerk login is outside the isolated UI harness.");
}
