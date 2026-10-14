import Big from "big.js";

// Money and percentages go through big.js so sums, splits, and rounding are
// exact decimal math instead of binary floating point.

export function sum(values: number[]) {
  return values
    .reduce((total, value) => total.plus(value), new Big(0))
    .toNumber();
}

/** `part` as a percentage of `whole`, unrounded. `whole` must not be 0. */
export function percentOf(part: number, whole: number) {
  return new Big(part).times(100).div(whole).toNumber();
}
