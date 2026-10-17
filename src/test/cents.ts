import { z } from "zod";
import type { Cents } from "@/lib/decimal";

// Tests also build zero and negative balances, which centsSchema rejects.
export function cents(value: number) {
  // SAFETY: z.int() just checked that value is an integer.
  return z.int().parse(value) as Cents;
}
