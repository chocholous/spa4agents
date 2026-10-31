import { resolve, dirname } from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

export interface Config {
  port: number;
  host: string;
  catalogPath: string;
  /** Které fáze katalogu se vystavují v tools/list. */
  phases: string[];
  session: {
    maxActions: number; // návrh zadání: 200
    maxMinutes: number; // návrh zadání: 60
    maxUsd: string | null; // zadání hodnotu neurčuje
    warnAt: number; // 0.8
  };
  /** Strop na adresu za den: zatím jen konfigurace (stub). */
  perAddressDaily: { maxActions: number | null; maxUsd: string | null };
  /** Trial: jen konfigurační default, logika je WP4. */
  trial: { free_sessions: number; max_turns_per_session: number };
  timeoutMs: Record<string, number>;
  /** Doba, po kterou smí `lobby.leave` ukončit relaci (cíl < 1 s). */
  leaveBudgetMs: number;
  /** Hodnota quiet.pause.retry_after_seconds; zadání neurčuje. */
  pauseRetryAfterSeconds: number;
  llm: { baseUrl: string | undefined; model: string | undefined; apiKey: string | undefined };
}

function num(v: string | undefined, d: number): number {
  const n = v === undefined || v === "" ? NaN : Number(v);
  return Number.isFinite(n) ? n : d;
}

export function defaultCatalogPath(): string {
  const real = resolve(here, "../../catalog/catalog.yaml");
  return existsSync(real) ? real : resolve(here, "../test/fixtures/catalog.min.yaml");
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  return {
    port: num(env.PORT, 8787),
    host: env.HOST ?? "127.0.0.1",
    catalogPath: env.CATALOG_PATH ?? defaultCatalogPath(),
    phases: (env.GATEWAY_PHASES ?? "F1").split(",").map((s) => s.trim()).filter(Boolean),
    session: {
      maxActions: num(env.SESSION_MAX_ACTIONS, 200),
      maxMinutes: num(env.SESSION_MAX_MINUTES, 60),
      maxUsd: env.SESSION_MAX_USD ?? null,
      warnAt: 0.8,
    },
    perAddressDaily: {
      maxActions: env.ADDRESS_DAILY_MAX_ACTIONS ? num(env.ADDRESS_DAILY_MAX_ACTIONS, 0) : null,
      maxUsd: env.ADDRESS_DAILY_MAX_USD ?? null,
    },
    // Rozhodnutí vlastníka: 3 zkušební session, 20 turns na session. Jen default, logika trialu je WP4.
    trial: {
      free_sessions: num(env.TRIAL_FREE_SESSIONS, 3),
      max_turns_per_session: num(env.TRIAL_MAX_TURNS_PER_SESSION, 20),
    },
    timeoutMs: {
      text: num(env.TIMEOUT_MS_TEXT, 5_000),
      "wait-hint": num(env.TIMEOUT_MS_WAIT_HINT, 5_000),
      "state-change": num(env.TIMEOUT_MS_STATE_CHANGE, 5_000),
      publish: num(env.TIMEOUT_MS_PUBLISH, 10_000),
      llm: num(env.TIMEOUT_MS_LLM, 30_000),
    },
    leaveBudgetMs: 1000,
    pauseRetryAfterSeconds: num(env.PAUSE_RETRY_AFTER_SECONDS, 30),
    llm: { baseUrl: env.LITELLM_BASE_URL, model: env.LITELLM_MODEL, apiKey: env.LITELLM_API_KEY },
  };
}
