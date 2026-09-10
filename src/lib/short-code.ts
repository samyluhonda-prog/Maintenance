const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I — avoids misreads on printed labels

/** Short, human-typeable code for QR/barcode labels, e.g. "EQ-7F3K9QRT". */
export function generateShortCode(prefix: string, length = 8): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let code = "";
  for (const b of bytes) code += ALPHABET[b % ALPHABET.length];
  return `${prefix}-${code}`;
}
