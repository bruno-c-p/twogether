import Big from "big.js";
import type { z } from "zod";

// Money and percentages go through big.js so sums, splits, and rounding are
// exact decimal math instead of binary floating point.

/**
 * Integer cents, possibly negative for balances. Only `centsSchema` and the
 * helpers below produce one, so a float or an unchecked number cannot become
 * a transaction amount.
 */
export type Cents = number & z.$brand<"Cents">;

// SAFETY: 0 is an integer.
export const ZERO_CENTS = 0 as Cents;

export function sum(values: number[]) {
  return values
    .reduce((total, value) => total.plus(value), new Big(0))
    .toNumber();
}

/** `part` as a percentage of `whole`, unrounded. `whole` must not be 0. */
export function percentOf(part: number, whole: number) {
  return new Big(part).times(100).div(whole).toNumber();
}

export function sumCents(values: Cents[]) {
  // SAFETY: a sum of integers is an integer.
  return sum(values) as Cents;
}

export function minusCents(a: Cents, b: Cents) {
  // SAFETY: a difference of integers is an integer.
  return new Big(a).minus(b).toNumber() as Cents;
}

/** Half of `amount`, rounded down to a whole cent. */
export function halfDown(amount: Cents) {
  // SAFETY: rounded to 0 decimal places.
  return new Big(amount).div(2).round(0, Big.roundDown).toNumber() as Cents;
}

/** `percent`% of `amount`, rounded half up to a whole cent. */
export function percentageOf(amount: Cents, percent: number) {
  // SAFETY: rounded to 0 decimal places.
  return new Big(amount)
    .times(percent)
    .div(100)
    .round(0, Big.roundHalfUp)
    .toNumber() as Cents;
}
