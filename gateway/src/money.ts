/** Peníze jako celé mikro-USD (1e-6), aby nevznikaly chyby plovoucí řádové čárky. */
export type Micro = number;

export function toMicro(usd: string | number | undefined | null): Micro {
  if (usd === undefined || usd === null || usd === "") return 0;
  const n = Number(usd);
  return Number.isFinite(n) ? Math.round(n * 1_000_000) : 0;
}

/** Řetězec s nejméně dvěma desetinnými místy ("0.005", "0.50", "0.00"). */
export function fmtUsd(m: Micro): string {
  const s = (m / 1_000_000).toFixed(6).replace(/0+$/, "");
  const [i, f = ""] = s.split(".");
  return `${i}.${f.padEnd(2, "0")}`;
}

export function pct(m: Micro, percent: number): Micro {
  return Math.round((m * percent) / 100);
}
