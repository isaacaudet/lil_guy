/**
 * FNV-1a hash — returns a positive 32-bit integer.
 */
export function hash(input: string): number {
  let h = 0x811c9dc5; // FNV offset basis
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193); // FNV prime
  }
  return (h >>> 0); // convert to unsigned 32-bit
}

/**
 * Returns an independent hash for each body-part slot by appending a separator and index.
 */
export function hashNth(input: string, index: number): number {
  return hash(input + "|" + index);
}
