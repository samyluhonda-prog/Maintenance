import QRCode from "qrcode";

/** Deep link a printed label's QR code encodes; resolved by /scan/[code]. */
export function scanUrlFor(code: string): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  return `${base}/scan/${code}`;
}

/** SVG markup string — safe to inline directly for on-screen display or printing. */
export async function generateQrSvg(code: string): Promise<string> {
  return QRCode.toString(scanUrlFor(code), { type: "svg", margin: 1, width: 256 });
}

/** PNG data URL — used where an <img src> is more convenient than inline SVG. */
export async function generateQrDataUrl(code: string): Promise<string> {
  return QRCode.toDataURL(scanUrlFor(code), { margin: 1, width: 512 });
}
