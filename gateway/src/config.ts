import { resolve, dirname } from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { DEFAULT_LIMITS, type CatalogLimits } from "./catalog.js";
import { toMicro, type Micro } from "./money.js";

const here = dirname(fileURLToPath(import.meta.url));

export interface Config {
  port: number;
  host: string;
  /** Veřejná základní adresa (BASE_URL). Bez ní se odvozuje z hlavičky Host (funguje na IP/localhost). */
  baseUrl: string | null;
  /** Kolik reverzních proxy je před serverem (X-Forwarded-For se bere zprava); 0 = bere se socket. */
  trustProxyHops: number;
  maxBodyBytes: number;
  catalogPath: string;
  /** Soubor s textem pro `initialize.instructions` generovaný z katalogu; když chybí, text se sestaví z katalogu. */
  instructionsPath: string;
  /** Které fáze katalogu se vystavují v tools/list. */
  phases: string[];
  session: {
    maxActions: number;
    maxMinutes: number;
    maxUsdMicro: Micro;
    warnAt: number; // 0..1
    /** Nečinnost, po které se relace (a její záznam v paměti) zahodí. */
    idleMinutes: number;
  };
  addressDaily: { maxUsdMicro: Micro };
  trial: {
    freeSessions: number;
    maxTurnsPerSession: number;
    validDays: number;
    dailyBudgetMicro: Micro;
    /** Anti-farm: počet zkušebních session na adresu a na IP za den (katalog: 1 a 1). */
    perAddressPerDay: number;
    perIpPerDay: number;
  };
  referral: CatalogLimits["referral"] & {
    /** Pozvání sebe sama se neodmítá; zda vydělává kredit (doporučení katalogu: ne). */
    selfEarns: boolean;
  };
  x402: {
    /** "url" = X402_FACILITATOR_URL, "cdp" = Coinbase CDP s klíči z env. */
    facilitator: "url" | "cdp";
    facilitatorUrl: string;
    network: string;
    payTo: string | null;
    cdpKeyId: string | undefined;
    cdpKeySecret: string | undefined;
  };
  /** Horní mez živých relací v paměti (ochrana paměti). */
  maxLiveSessions: number;
  timeoutMs: Record<string, number>;
  /** Doba, po kterou smí `lobby.leave` ukončit relaci (cíl < 1 s). */
  leaveBudgetMs: number;
  pauseRetryAfterSeconds: number;
  llm: { baseUrl: string | undefined; model: string | undefined; apiKey: string | undefined };
}

function num(v: string | undefined, d: number): number {
  const n = v === undefined || v === "" ? NaN : Number(v);
  return Number.isFinite(n) ? n : d;
}
function bool(v: string | undefined, d: boolean): boolean {
  if (v === undefined || v === "") return d;
  return /^(1|true|yes|on)$/i.test(v);
}

export const DEFAULT_FACILITATOR_URL = "https://x402.org/facilitator";
export const DEFAULT_NETWORK = "eip155:84532"; // Base Sepolia

export function defaultCatalogPath(): string {
  const real = resolve(here, "../../catalog/catalog.yaml");
  return existsSync(real) ? real : resolve(here, "../test/fixtures/catalog.min.yaml");
}

export function defaultInstructionsPath(): string {
  return resolve(here, "../../catalog/dist/initialize-instructions.txt");
}

/** Cesta ke katalogu ještě před načtením katalogu (z ní se berou defaulty limitů). */
export function catalogPathFromEnv(env: NodeJS.ProcessEnv = process.env): string {
  return env.CATALOG_PATH ?? defaultCatalogPath();
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env, limits: CatalogLimits = DEFAULT_LIMITS): Config {
  const s = limits.session;
  const t = limits.trial;
  const facilitator = (env.X402_FACILITATOR ?? "url").toLowerCase() === "cdp" ? "cdp" : "url";
  return {
    port: num(env.PORT, 8787),
    host: env.HOST ?? "127.0.0.1",
    baseUrl: env.BASE_URL ? env.BASE_URL.replace(/\/+$/, "") : null,
    trustProxyHops: Math.max(0, Math.floor(num(env.TRUST_PROXY_HOPS, 0))),
    maxBodyBytes: num(env.MAX_BODY_BYTES, 65_536),
    catalogPath: catalogPathFromEnv(env),
    instructionsPath: env.INSTRUCTIONS_PATH ?? defaultInstructionsPath(),
    phases: (env.GATEWAY_PHASES ?? "F1").split(",").map((x) => x.trim()).filter(Boolean),
    session: {
      maxActions: num(env.SESSION_MAX_ACTIONS, s.maxActions),
      maxMinutes: num(env.SESSION_MAX_MINUTES, s.maxMinutes),
      maxUsdMicro: toMicro(env.SESSION_MAX_USD ?? s.maxUsd),
      warnAt: num(env.SESSION_WARN_PERCENT, s.warnPercent) / 100,
      idleMinutes: num(env.SESSION_IDLE_MINUTES, 30),
    },
    addressDaily: { maxUsdMicro: toMicro(env.SESSION_ADDRESS_DAILY_MAX_USD ?? env.ADDRESS_DAILY_MAX_USD ?? s.addressDailyCapUsd) },
    trial: {
      freeSessions: num(env.TRIAL_FREE_SESSIONS, t.freeSessions),
      maxTurnsPerSession: num(env.TRIAL_MAX_TURNS_PER_SESSION, t.maxTurnsPerSession),
      validDays: num(env.TRIAL_VALID_DAYS, t.validDays),
      dailyBudgetMicro: toMicro(env.TRIAL_DAILY_BUDGET_USD ?? t.dailyGlobalBudgetUsd),
      perAddressPerDay: num(env.TRIAL_PER_ADDRESS_PER_DAY, 1),
      perIpPerDay: num(env.TRIAL_PER_IP_PER_DAY, 1),
    },
    referral: {
      ...limits.referral,
      inviteeDiscountPercent: num(env.REFERRAL_INVITEE_DISCOUNT_PERCENT, limits.referral.inviteeDiscountPercent),
      inviteeFreeCalls: num(env.REFERRAL_INVITEE_FREE_CALLS, limits.referral.inviteeFreeCalls),
      referrerCreditPercent: num(env.REFERRAL_CREDIT_PERCENT, limits.referral.referrerCreditPercent),
      referrerCreditDays: num(env.REFERRAL_CREDIT_DAYS, limits.referral.referrerCreditDays),
      referrerCreditMonthlyCapUsd: env.REFERRAL_CREDIT_MONTHLY_CAP_USD ?? limits.referral.referrerCreditMonthlyCapUsd,
      selfEarns: bool(env.REFERRAL_SELF_EARNS, false),
    },
    x402: {
      facilitator,
      facilitatorUrl: env.X402_FACILITATOR_URL ?? DEFAULT_FACILITATOR_URL,
      network: env.X402_NETWORK ?? DEFAULT_NETWORK,
      payTo: env.PAY_TO_ADDRESS ?? null,
      cdpKeyId: env.CDP_API_KEY_ID,
      cdpKeySecret: env.CDP_API_KEY_SECRET,
    },
    maxLiveSessions: num(env.SESSION_MAX_LIVE, 20_000),
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
