/**
 * Drops `price` down to the nearest multiple of `stepPrice`. Used to anchor
 * the grid: at price 2316 with step 25 we land on 2300, so the first buy
 * target is 2300, the next 2275, etc.
 */
export function floorToStep(price: number, stepPrice: number): number {
  return Math.floor(price / stepPrice) * stepPrice;
}

/**
 * TP price for a slot bought at `level` — exactly one step above it.
 */
export function takeProfitPrice(level: number, stepPrice: number): number {
  return level + stepPrice;
}
