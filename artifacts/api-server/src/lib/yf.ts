// Shared yahoo-finance2 instance — v3 requires instantiation via dynamic import
let _yf: {
  quote: (sym: string, fields: object, opts: object) => Promise<unknown>;
  quoteSummary: (sym: string, opts: object) => Promise<unknown>;
  historical: (sym: string, opts: object) => Promise<unknown[]>;
  search: (sym: string, opts: object) => Promise<unknown>;
} | null = null;

export async function getYF() {
  if (_yf) return _yf;
  const mod = await import("yahoo-finance2");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const YF = (mod.default ?? mod) as any;
  _yf = typeof YF === "function" ? new YF() : YF;
  return _yf!;
}
