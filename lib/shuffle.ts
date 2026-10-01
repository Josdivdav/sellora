/**
 * Immutable Fisher-Yates shuffle algorithm.
 * Guarantees uniform, unbiased randomization of elements.
 */
export function shuffleArray<T>(items: readonly T[] | T[]): T[] {
  if (!items || items.length <= 1) return [...(items || [])];
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = result[i];
    result[i] = result[j];
    result[j] = temp;
  }
  return result;
}
