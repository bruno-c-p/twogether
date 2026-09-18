export function invalid(): never {
  throw new Error("Requisição inválida.");
}

export function text(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) invalid();
  return value;
}
