export interface DonutSegment<T> {
  item: T;
  share: number;
  start: number;
}

export function donutSegments<T>(
  items: T[],
  amount: (item: T) => number,
): DonutSegment<T>[] {
  const total = items.reduce((sum, item) => sum + amount(item), 0);
  let start = 0;
  return items.map((item) => {
    const share = total ? (amount(item) / total) * 100 : 0;
    const segment = { item, share, start };
    start += share;
    return segment;
  });
}
