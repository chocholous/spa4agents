/**
 * Agregované provozní metriky bez identifikátorů: počty, latence (pevné koše) a chybovost.
 * Nikdy neobsahují adresy, IP, kódy, vstupy ani výstupy. Název nástroje a kód chyby jsou veřejné konstanty.
 */
const BUCKETS_MS = [5, 25, 100, 500, 1000, 5000];

interface ToolStat {
  calls: number;
  errors: number;
  latencyBuckets: number[]; // počet volání v koších (+ poslední = nad největší)
  latencySumMs: number;
}

export class Metrics {
  private readonly started = Date.now();
  private tools = new Map<string, ToolStat>();
  private errorCodes = new Map<string, number>();
  private counters = {
    payments_verified: 0,
    payments_settled: 0,
    payments_settle_failed: 0,
    challenges_issued: 0,
    free_trial_calls: 0,
    free_referral_calls: 0,
    sessions_started: 0,
    sessions_left: 0,
  };

  inc(name: keyof Metrics["counters"], n = 1): void {
    this.counters[name] += n;
  }

  observe(tool: string, ok: boolean, code: string | undefined, ms: number): void {
    const s = this.tools.get(tool) ?? { calls: 0, errors: 0, latencyBuckets: new Array(BUCKETS_MS.length + 1).fill(0), latencySumMs: 0 };
    s.calls++;
    if (!ok) {
      s.errors++;
      if (code) this.errorCodes.set(code, (this.errorCodes.get(code) ?? 0) + 1);
    }
    let i = BUCKETS_MS.findIndex((b) => ms <= b);
    if (i < 0) i = BUCKETS_MS.length;
    s.latencyBuckets[i]!++;
    s.latencySumMs += ms;
    this.tools.set(tool, s);
  }

  snapshot(extra: Record<string, unknown> = {}) {
    const tools: Record<string, unknown> = {};
    let calls = 0;
    let errors = 0;
    for (const [name, s] of this.tools) {
      calls += s.calls;
      errors += s.errors;
      tools[name] = {
        calls: s.calls,
        errors: s.errors,
        error_rate: s.calls ? Math.round((s.errors / s.calls) * 1000) / 1000 : 0,
        latency_avg_ms: s.calls ? Math.round(s.latencySumMs / s.calls) : 0,
        latency_buckets_ms: Object.fromEntries([...BUCKETS_MS.map((b, i) => [`le_${b}`, s.latencyBuckets[i]]), ["gt_max", s.latencyBuckets[BUCKETS_MS.length]]]),
      };
    }
    return {
      uptime_seconds: Math.round((Date.now() - this.started) / 1000),
      calls,
      errors,
      error_rate: calls ? Math.round((errors / calls) * 1000) / 1000 : 0,
      error_codes: Object.fromEntries(this.errorCodes),
      counters: { ...this.counters },
      tools,
      ...extra,
    };
  }
}
