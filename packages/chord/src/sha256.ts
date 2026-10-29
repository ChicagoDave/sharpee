/**
 * sha256.ts — a synchronous, dependency-free SHA-256 over a string.
 *
 * Purpose: the identity stamp (ADR-388 D4) is a content hash the compiler
 * computes while it runs, in Node and in the browser alike. `crypto.subtle`
 * is asynchronous and `node:crypto` is not browser-safe, and this package
 * depends on no platform runtime, so the digest is implemented here: FIPS
 * 180-4 SHA-256 over the UTF-8 bytes of the input, hex-encoded.
 *
 * Invariant: a pure function — one input, one output, on every runtime.
 * The test pins the published vectors (`abc`, the empty string).
 *
 * Public interface: sha256Hex.
 * Owner context: @sharpee/chord.
 */

/** The first 32 bits of the fractional parts of the cube roots of the first 64 primes. */
const K: readonly number[] = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

/** The first 32 bits of the fractional parts of the square roots of the first 8 primes. */
const INITIAL_STATE: readonly number[] = [
  0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
];

/** Rotate a 32-bit word right. */
function rotr(word: number, bits: number): number {
  return (word >>> bits) | (word << (32 - bits));
}

/** The input's UTF-8 bytes, padded per FIPS 180-4 §5.1.1 to a multiple of 64. */
function paddedUtf8(text: string): Uint8Array {
  const bytes = new TextEncoder().encode(text);
  const bitLength = bytes.length * 8;
  const paddedLength = Math.ceil((bytes.length + 9) / 64) * 64;
  const padded = new Uint8Array(paddedLength);
  padded.set(bytes);
  padded[bytes.length] = 0x80;
  // The message length as a 64-bit big-endian integer; inputs here are far
  // below 2^32 bits, so the high word is zero.
  const view = new DataView(padded.buffer);
  view.setUint32(paddedLength - 8, Math.floor(bitLength / 0x100000000));
  view.setUint32(paddedLength - 4, bitLength >>> 0);
  return padded;
}

/**
 * The SHA-256 digest of a string's UTF-8 bytes, as 64 lowercase hex digits.
 *
 * @param text the input, hashed as UTF-8
 * @returns the digest, hex-encoded
 */
export function sha256Hex(text: string): string {
  const padded = paddedUtf8(text);
  const view = new DataView(padded.buffer);
  const state = [...INITIAL_STATE];
  const schedule = new Array<number>(64);

  for (let offset = 0; offset < padded.length; offset += 64) {
    for (let t = 0; t < 16; t += 1) schedule[t] = view.getUint32(offset + t * 4);
    for (let t = 16; t < 64; t += 1) {
      const w15 = schedule[t - 15];
      const w2 = schedule[t - 2];
      const s0 = rotr(w15, 7) ^ rotr(w15, 18) ^ (w15 >>> 3);
      const s1 = rotr(w2, 17) ^ rotr(w2, 19) ^ (w2 >>> 10);
      schedule[t] = (schedule[t - 16] + s0 + schedule[t - 7] + s1) >>> 0;
    }

    let [a, b, c, d, e, f, g, h] = state;
    for (let t = 0; t < 64; t += 1) {
      const bigSigma1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const choose = (e & f) ^ (~e & g);
      const temp1 = (h + bigSigma1 + choose + K[t] + schedule[t]) >>> 0;
      const bigSigma0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const majority = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (bigSigma0 + majority) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }
    const round = [a, b, c, d, e, f, g, h];
    for (let i = 0; i < 8; i += 1) state[i] = (state[i] + round[i]) >>> 0;
  }

  return state.map((word) => word.toString(16).padStart(8, '0')).join('');
}
