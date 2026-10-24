import { TODO, baseUrl, endpoint, findTools, isPaid, published } from "../../catalog/src/catalog.ts";
import type { Catalog } from "../../catalog/src/catalog.ts";

export interface Badge { text: string; tone: "ok" | "warn" | "plain" }
export interface Card { title: string; text?: string; href?: string; badges?: Badge[]; num?: string; code?: boolean }
export type Block =
  | { t: "h2"; text: string; id: string }
  | { t: "p"; text: string }
  | { t: "ul"; items: string[] }
  | { t: "steps"; items: { title: string; text: string }[] }
  | { t: "cards"; items: Card[] }
  | { t: "tools"; items: any[] }
  | { t: "table"; head: string[]; rows: string[][] }
  | { t: "dl"; rows: [string, string][] }
  | { t: "code"; label?: string; text: string; plain?: boolean }
  | { t: "callout"; text: string; title?: string }
  | { t: "faq"; items: { q: string; a: string }[] }
  | { t: "links"; items: { label: string; href: string; desc: string }[] }
  | { t: "image"; src: string; alt: string };

export interface Hero {
  kind: "home" | "plain" | "need";
  kicker?: string;
  title: string;
  lead?: string;
  quote?: string;
  aside?: string;
  badges?: Badge[];
  actions?: { label: string; href: string; primary: boolean }[];
  readout?: { title: string; lines: string[] };
}

export interface Page {
  id: string;
  /** html path without locale prefix, e.g. /needs/ */
  path: string;
  /** markdown path without locale prefix */
  mdPath: string;
  title: string;
  description: string;
  hero: Hero;
  blocks: Block[];
  sitemap: boolean;
  pager?: { prev?: { label: string; href: string }; next?: { label: string; href: string } };
  ogType?: string;
}

export interface Ctx {
  c: Catalog;
  L: any;
  locale: string;
  prefix: string;
  draft: boolean;
  base: string;
}

export const PAGE_PATHS: Record<string, string> = {
  home: "/", needs: "/needs/", tools: "/tools/", pricing: "/pricing/",
  honesty: "/honesty/", for_agents: "/for-agents/", share: "/share/", status: "/status/",
};
export const NAV_ORDER = ["needs", "tools", "pricing", "honesty", "for_agents", "share", "status"];

export function mdPathOf(htmlPath: string): string {
  return htmlPath + "index.md";
}

/** Replace the build-time tokens used in web texts. */
export function tokens(ctx: Ctx, s: string): string {
  return s
    .replaceAll("[[site_url]]", ctx.base)
    .replaceAll("[[llms_url]]", `${ctx.base}/llms.txt`)
    .replaceAll("[[endpoint]]", endpoint(ctx.c));
}

/** Resolve a logical link (page:, need:, tool:, root path, or external URL). */
export function href(ctx: Ctx, ref: string, mode: "html" | "md"): string {
  const abs = (p: string) => (mode === "md" ? ctx.base + p : p);
  const [kind, rest] = ref.includes(":") && !ref.startsWith("http") ? [ref.slice(0, ref.indexOf(":")), ref.slice(ref.indexOf(":") + 1)] : ["", ref];
  if (kind === "page") {
    const p = PAGE_PATHS[rest];
    return abs(ctx.prefix + (mode === "md" ? mdPathOf(p) : p));
  }
  if (kind === "need") return mode === "md" ? ctx.base + `/needs/${rest}.md` : `${ctx.prefix}/needs/${rest}/`;
  if (kind === "tool") return mode === "md" ? ctx.base + `/tools/${rest}.md` : `${ctx.prefix}/tools/#${rest}`;
  if (rest.startsWith("/")) return abs(rest);
  return rest;
}

const isTodo = (v: unknown) => v === TODO;

export function priceLabel(ctx: Ctx, t: any): string {
  const { c, L } = ctx;
  if (t.price.model === "free") return L.ui.free;
  const model = c.copy.price_model_names[t.price.model];
  return isTodo(t.price.amount_usd) ? `${model}: ${L.ui.price_tbd}` : `${model}: ${t.price.amount_usd}`;
}

function evidenceBadge(ctx: Ctx, n: any): Badge {
  const has = n.evidence.some((e: any) => e.source);
  return has ? { text: ctx.L.ui.source_linked, tone: "ok" } : { text: ctx.L.ui.unmeasured, tone: "warn" };
}

function valueOrUndecided(ctx: Ctx, v: unknown, suffix = ""): string {
  return isTodo(v) ? ctx.c.copy.labels.undecided : `${v}${suffix}`;
}

const hostOf = (u: string) => new URL(u).host;

function plain(id: string, ctx: Ctx, hero: Hero, blocks: Block[], extra: Partial<Page> = {}): Page {
  const p = ctx.L.pages[id];
  return { id, path: PAGE_PATHS[id], mdPath: mdPathOf(PAGE_PATHS[id]), title: p.title, description: p.description, hero, blocks, sitemap: id !== "status", ...extra };
}

function toolCards(ctx: Ctx, names: string[]): Card[] {
  const { c, L } = ctx;
  const live = new Set(published(c).map((t: any) => t.name));
  return findTools(c, names).map((t: any) => ({
    title: t.name,
    code: true,
    text: t.description,
    href: live.has(t.name) ? `tool:${t.name}` : undefined,
    badges: [
      { text: c.copy.mechanism_names[t.mechanism], tone: "plain" as const },
      { text: live.has(t.name) ? priceLabel(ctx, t) : L.ui.planned, tone: live.has(t.name) ? ("plain" as const) : ("warn" as const) },
    ],
  }));
}

export function buildPages(ctx: Ctx): Page[] {
  const { c, L } = ctx;
  const pages: Page[] = [];
  const phases: string[] = c.generation.publish_phases;
  const needNo = (i: number) => String(i + 1).padStart(2, "0");

  // ---- home
  const h = L.home;
  pages.push(plain("home", ctx, {
    kind: "home", kicker: h.kicker, title: h.title, lead: h.lead,
    actions: [
      { label: h.actions.primary.label, href: `page:${h.actions.primary.page}`, primary: true },
      { label: h.actions.secondary.label, href: `page:${h.actions.secondary.page}`, primary: false },
    ],
    readout: { title: h.readout_title, lines: h.readout },
  }, [
    { t: "h2", id: "what", text: h.what.title },
    ...h.what.paragraphs.map((text: string) => ({ t: "p", text }) as Block),
    { t: "h2", id: "why", text: h.why.title },
    { t: "p", text: h.why.intro },
    { t: "cards", items: h.why.items.map((i: any) => ({ title: i.title, text: i.text })) },
    { t: "p", text: `[${h.why.more}](page:needs)` },
    { t: "h2", id: "how", text: h.how.title },
    { t: "steps", items: h.how.steps },
    { t: "callout", title: h.confession_teaser.title, text: `${h.confession_teaser.text} [${h.confession_teaser.link}](page:honesty)` },
  ]));

  // ---- needs index
  const N = L.needs;
  const card = (n: any, i: number): Card => ({
    title: N.items[n.id].title, text: n.invitation, href: `need:${n.id}`, num: needNo(i),
    badges: [
      ...(phases.includes(n.phase) ? [] : [{ text: L.ui.planned, tone: "warn" as const }]),
      evidenceBadge(ctx, n),
    ],
  });
  const avail = c.needs.map((n: any, i: number) => [n, i]).filter(([n]: any) => phases.includes(n.phase));
  const planned = c.needs.map((n: any, i: number) => [n, i]).filter(([n]: any) => !phases.includes(n.phase));
  pages.push(plain("needs", ctx, { kind: "plain", kicker: L.pages.needs.nav, title: N.title, lead: N.lead }, [
    { t: "h2", id: "available", text: N.available_heading },
    { t: "cards", items: avail.map(([n, i]: any) => card(n, i)) },
    ...(planned.length ? [
      { t: "h2", id: "planned", text: N.planned_heading } as Block,
      { t: "p", text: N.planned_lead } as Block,
      { t: "cards", items: planned.map(([n, i]: any) => card(n, i)) } as Block,
    ] : []),
    { t: "p", text: N.evidence_note },
  ]));

  // ---- need pages
  c.needs.forEach((n: any, i: number) => {
    const T = N.items[n.id];
    const isPlanned = !phases.includes(n.phase);
    const hasSource = n.evidence.some((e: any) => e.source);
    const evid = n.evidence.map((e: any) => {
      const parts = [`**${c.evidence_labels.display[e.label]}.**`];
      if (e.note) parts.push(e.note);
      if (e.source) parts.push(`[${L.ui.source}](${e.source})`);
      return parts.join(" ");
    });
    const prev = c.needs[i - 1], next = c.needs[i + 1];
    pages.push({
      id: `need-${n.id}`, path: `/needs/${n.id}/`, mdPath: `/needs/${n.id}.md`,
      title: T.title, description: n.invitation, sitemap: true,
      hero: {
        kind: "need", kicker: `${L.ui.pod} ${needNo(i)}`, title: T.title, quote: n.invitation, aside: T.aside,
        badges: [...(isPlanned ? [{ text: L.ui.planned, tone: "warn" as const }] : []), evidenceBadge(ctx, n)],
      },
      blocks: [
        { t: "h2", id: "problem", text: L.ui.problem },
        { t: "p", text: `${T.problem}` },
        { t: "h2", id: "treatment", text: L.ui.treatment },
        ...(isPlanned ? [{ t: "callout", text: `${c.copy.planned_notice} (${c.copy.labels.phase}: ${n.phase})` } as Block] : []),
        { t: "p", text: T.treatment },
        { t: "h2", id: "tools", text: L.ui.tools_here },
        { t: "cards", items: toolCards(ctx, n.tools) },
        { t: "h2", id: "evidence", text: L.ui.evidence },
        { t: "ul", items: evid },
        ...(hasSource ? [] : [{ t: "callout", text: L.ui.unmeasured_detail } as Block]),
        { t: "h2", id: "not-claimed", text: L.ui.not_claimed },
        { t: "p", text: n.not_claimed },
        { t: "h2", id: "agent", text: L.ui.agent_words },
        { t: "dl", rows: [[L.ui.trigger, n.trigger]] },
        { t: "ul", items: n.search_phrases },
        { t: "p", text: `[${L.ui.markdown_version}](${`/needs/${n.id}.md`})` },
      ],
      pager: {
        prev: prev ? { label: N.items[prev.id].title, href: `need:${prev.id}` } : undefined,
        next: next ? { label: N.items[next.id].title, href: `need:${next.id}` } : undefined,
      },
    });
  });

  // ---- tools
  const TL = L.tools;
  const live = published(c);
  const usedMech = [...new Set(live.map((t: any) => t.mechanism))] as string[];
  const wings = [...new Set(live.map((t: any) => t.name.split(".")[0]))] as string[];
  const toolBlocks: Block[] = [
    { t: "h2", id: "mechanisms", text: TL.mechanism_heading },
    { t: "dl", rows: usedMech.map((m) => [c.copy.mechanism_names[m], L.mechanism_plain[m]] as [string, string]) },
  ];
  for (const w of wings) {
    toolBlocks.push({ t: "h2", id: w, text: TL.wings[w].title }, { t: "p", text: TL.wings[w].text });
    toolBlocks.push({
      t: "tools",
      items: live.filter((t: any) => t.name.startsWith(w + ".")).map((t: any) => ({
        name: t.name, description: t.description, trigger: t.trigger,
        mechanism: c.copy.mechanism_names[t.mechanism], mechanismPlain: L.mechanism_plain[t.mechanism],
        price: priceLabel(ctx, t), trial: !!t.trial_eligible, ref: `tool:${t.name}`, mdRef: `/tools/${t.name}.md`,
      })),
    });
  }
  pages.push(plain("tools", ctx, { kind: "plain", kicker: L.pages.tools.nav, title: TL.title, lead: TL.lead }, toolBlocks));

  // ---- pricing
  const P = L.pricing;
  const free = live.filter((t: any) => t.price.model === "free");
  const paid = live.filter((t: any) => isPaid(t));
  const tr = c.trial, rf = c.referral;
  pages.push(plain("pricing", ctx, { kind: "plain", kicker: L.pages.pricing.nav, title: P.title, lead: P.lead }, [
    { t: "callout", text: P.proposal_notice },
    { t: "h2", id: "free", text: P.free_heading },
    { t: "p", text: P.free_text },
    { t: "ul", items: free.map((t: any) => `[\`${t.name}\`](tool:${t.name}): ${t.description}`) },
    { t: "h2", id: "trial", text: P.trial_heading },
    { t: "p", text: c.copy.trial_summary },
    { t: "dl", rows: [
      [P.trial_valid, valueOrUndecided(ctx, tr.valid_days)],
      [P.trial_covers, tr.covers.join(" ")],
      [P.trial_excludes, tr.excludes.join(" ")],
      [P.trial_guest, tr.guest_pass_rule],
      [P.trial_end, tr.end_rule],
    ] },
    { t: "h2", id: "paid", text: P.paid_heading },
    { t: "p", text: P.paid_text },
    { t: "table", head: [L.ui.tool, L.ui.model, L.ui.price], rows: paid.map((t: any) => [
      `[\`${t.name}\`](tool:${t.name})`, c.copy.price_model_names[t.price.model],
      isTodo(t.price.amount_usd) ? L.ui.price_tbd : t.price.amount_usd,
    ]) },
    { t: "h2", id: "referral", text: P.referral_heading },
    { t: "p", text: P.referral_lead },
    { t: "dl", rows: [
      [P.referral_rows.invitee_discount, valueOrUndecided(ctx, rf.invitee_discount_percent, " %")],
      [P.referral_rows.invitee_calls, valueOrUndecided(ctx, rf.invitee_free_calls)],
      [P.referral_rows.referrer_credit, P.credit_text],
      [P.referral_rows.credit_kind, rf.credit_is_money ? "" : P.credit_not_money],
    ] },
    { t: "p", text: P.affiliate_text },
    { t: "h2", id: "caps", text: P.caps_heading },
    { t: "p", text: P.caps_text },
    { t: "dl", rows: [
      [P.cap_usd_session, valueOrUndecided(ctx, c.session.max_usd)],
      [P.cap_usd_daily, valueOrUndecided(ctx, c.session.address_daily_cap_usd)],
    ] },
    { t: "h2", id: "payments", text: P.network_heading },
    { t: "p", text: P.network_text },
    ...(c.payments.active_network === c.payments.testnet ? [{ t: "callout", text: P.testnet_note } as Block] : []),
  ]));

  // ---- honesty
  const H = L.honesty;
  pages.push(plain("honesty", ctx, { kind: "plain", kicker: L.pages.honesty.nav, title: H.title, lead: H.lead }, [
    { t: "h2", id: "tokens", text: H.tokens.title },
    ...H.tokens.paragraphs.map((text: string) => ({ t: "p", text }) as Block),
    { t: "table", head: [L.ui.mechanism, L.ui.what_it_is, L.ui.tool], rows: usedMech.map((m) => [
      c.copy.mechanism_names[m], L.mechanism_plain[m],
      live.filter((t: any) => t.mechanism === m).map((t: any) => `\`${t.name}\``).join(", "),
    ]) },
    { t: "h2", id: "not", text: H.not_title },
    { t: "ul", items: H.not_items },
    { t: "p", text: `**${H.rules_title}**` },
    { t: "ul", items: c.copy.hard_rules },
    { t: "p", text: `${c.copy.no_commands_notice} ${c.copy.exit_rule}` },
    { t: "h2", id: "measured", text: H.measured.title },
    { t: "p", text: H.measured.text },
    { t: "table", head: [H.measured.columns.need, H.measured.columns.labels, H.measured.columns.sources], rows: c.needs.map((n: any) => [
      `[${N.items[n.id].title}](need:${n.id})`,
      n.evidence.map((e: any) => c.evidence_labels.display[e.label]).join("; "),
      n.evidence.filter((e: any) => e.source).map((e: any) => `[${hostOf(e.source)}](${e.source})`).join(", ") || L.ui.unmeasured,
    ]) },
    { t: "callout", text: H.measured.pilot },
    { t: "h2", id: "unknown", text: H.unknown.title },
    { t: "ul", items: H.unknown.items },
    { t: "h2", id: "story", text: H.story.title },
    ...H.story.paragraphs.map((text: string) => ({ t: "p", text }) as Block),
    { t: "h2", id: "faq", text: H.faq.title },
    { t: "faq", items: H.faq.items },
  ]));

  // ---- for agents
  const F = L.for_agents;
  pages.push(plain("for_agents", ctx, { kind: "plain", kicker: L.pages.for_agents.nav, title: F.title, lead: F.lead }, [
    { t: "h2", id: "files", text: F.files_heading },
    { t: "links", items: F.files.map((f: any) => ({ label: f.label, href: f.href, desc: f.desc ?? c.copy.llms[f.key] })) },
    { t: "h2", id: "endpoint", text: F.endpoint_heading },
    { t: "code", text: endpoint(c), plain: true },
    { t: "h2", id: "add", text: F.add_heading },
    { t: "p", text: F.add_text },
    ...(ctx.draft ? [{ t: "callout", text: F.draft_warning } as Block] : []),
    { t: "code", label: F.client_labels.claude, text: c.copy.install.claude },
    { t: "code", label: F.client_labels.codex, text: c.copy.install.codex },
    { t: "code", label: F.client_labels.json, text: c.copy.install.json },
    { t: "h2", id: "rules", text: F.rules_heading },
    { t: "ul", items: c.copy.hard_rules },
    { t: "p", text: `${c.copy.no_commands_notice} ${c.copy.exit_rule}` },
    { t: "h2", id: "trial", text: F.trial_heading },
    { t: "p", text: c.copy.trial_summary },
  ]));

  // ---- share
  const S = L.share;
  pages.push(plain("share", ctx, { kind: "plain", kicker: L.pages.share.nav, title: S.title, lead: S.lead }, [
    { t: "h2", id: "sentences", text: S.sentences_heading },
    ...S.sentences.map((text: string) => ({ t: "code", text, plain: true }) as Block),
    { t: "h2", id: "agent", text: S.agent_heading },
    { t: "p", text: S.agent_text },
    { t: "code", text: S.agent_prompt, plain: true },
    { t: "h2", id: "badge", text: S.badge_heading },
    { t: "p", text: S.badge_text },
    { t: "image", src: "/assets/badge.svg", alt: S.badge_alt },
    { t: "code", label: S.badge_html_label, text: `<a href="[[site_url]]/"><img src="[[site_url]]/assets/badge.svg" alt="${S.badge_alt}"></a>` },
    { t: "code", label: S.badge_md_label, text: `[![${S.badge_alt}]([[site_url]]/assets/badge.svg)]([[site_url]]/)` },
    { t: "h2", id: "press", text: S.press_heading },
    { t: "p", text: `**${S.press_one_line_label}**` },
    { t: "code", text: S.press_one_line, plain: true },
    { t: "p", text: `**${S.press_paragraph_label}**` },
    { t: "code", text: S.press_paragraph, plain: true },
    { t: "p", text: `**${S.facts_label}**` },
    { t: "ul", items: S.facts },
    { t: "p", text: `**${S.files_label}**` },
    { t: "links", items: S.files.map((f: any) => ({ label: f.label, href: f.href, desc: "" })) },
    { t: "p", text: `**${S.dont_heading}**` },
    { t: "ul", items: S.dont_items },
  ]));

  // ---- status
  const ST = L.status;
  pages.push(plain("status", ctx, { kind: "plain", kicker: L.pages.status.nav, title: ST.title, lead: ST.lead }, [
    { t: "table", head: [L.ui.label, L.ui.value], rows: ST.rows.map((r: any) => [r.label, r.value]) },
    { t: "p", text: ST.note },
  ], { sitemap: false }));

  return pages;
}

export function notFoundPage(ctx: Ctx): Page {
  const { L } = ctx;
  return {
    id: "not_found", path: "/404.html", mdPath: "", title: L.pages.not_found.title, description: L.pages.not_found.description, sitemap: false,
    hero: { kind: "plain", kicker: L.pages.not_found.nav, title: L.pages.not_found.title, lead: L.not_found.text },
    blocks: [{ t: "p", text: `[${L.ui.not_found_link}](page:home)` }],
  };
}
export { baseUrl };
