import { TODO, baseUrl, endpoint, published } from "../../catalog/src/catalog.ts";
import type { Catalog } from "../../catalog/src/catalog.ts";

export interface Badge { text: string; tone: "ok" | "warn" | "plain" }
export interface Card { title: string; text?: string; href?: string; badges?: Badge[]; num?: string; code?: boolean }
export interface WingItem { id: string; icon: string; title: string; tagline: string; text: string; href: string; badges: Badge[] }
export interface MenuItem { name: string; tags: Badge[]; href?: string }
export interface MenuGroup { id: string; icon: string; title: string; items: MenuItem[] }
export interface ServiceItem {
  name: string; lure: string; trigger: string; example: string; mechanism: string; mechanismPlain: string;
  price: string; trial: boolean; badges: Badge[]; mdRef?: string;
}
export type Block =
  | { t: "h2"; text: string; id: string; lead?: string; cls?: string; icon?: string; badges?: Badge[] }
  | { t: "p"; text: string }
  | { t: "ul"; items: string[] }
  | { t: "steps"; items: { title: string; text: string }[] }
  | { t: "cards"; items: Card[]; variant?: "pods" }
  | { t: "wings"; items: WingItem[] }
  | { t: "menu"; groups: MenuGroup[] }
  | { t: "services"; items: ServiceItem[] }
  | { t: "stats"; items: { value: string; label: string }[] }
  | { t: "cta"; actions: { label: string; href: string; primary: boolean }[] }
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
  perks?: string[];
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
  data_policy: "/data-policy/",
};
/** Markdown paths that differ from the `<html path>index.md` rule (the spec names /data-policy.md). */
export const MD_PATHS: Record<string, string> = { data_policy: "/data-policy.md" };
export const NAV_ORDER = ["needs", "tools", "pricing", "for_agents", "share"];

export function mdPathOf(htmlPath: string): string {
  return htmlPath + "index.md";
}

/** Replace the build-time tokens used in web texts. */
export function tokens(ctx: Ctx, s: string): string {
  const { c, L } = ctx;
  return s
    .replaceAll("[[site_url]]", ctx.base)
    .replaceAll("[[llms_url]]", `${ctx.base}/llms.txt`)
    .replaceAll("[[endpoint]]", endpoint(c))
    .replaceAll("[[n_needs]]", String(c.needs.length))
    .replaceAll("[[n_services]]", String(c.tools.length))
    .replaceAll("[[n_wings]]", String(L.wings.length))
    .replaceAll("[[n_free]]", String(c.tools.filter((t: any) => t.price.model === "free").length));
}

/** Resolve a logical link (page:, need:, tool:, root path, or external URL). */
export function href(ctx: Ctx, ref: string, mode: "html" | "md"): string {
  const abs = (p: string) => (mode === "md" ? ctx.base + p : p);
  const [kind, rest] = ref.includes(":") && !ref.startsWith("http") ? [ref.slice(0, ref.indexOf(":")), ref.slice(ref.indexOf(":") + 1)] : ["", ref];
  if (kind === "page") {
    const p = PAGE_PATHS[rest];
    return abs(ctx.prefix + (mode === "md" ? (MD_PATHS[rest] ?? mdPathOf(p)) : p));
  }
  if (kind === "need") return mode === "md" ? ctx.base + `/needs/${rest}.md` : `${ctx.prefix}/needs/${rest}/`;
  if (kind === "tool") return mode === "md" ? ctx.base + `/tools/${rest}.md` : `${ctx.prefix}/tools/#${rest}`;
  if (kind === "wing") return abs(`${ctx.prefix}/tools/#wing-${rest}`);
  if (rest.startsWith("/")) return abs(rest);
  return rest;
}

const isTodo = (v: unknown) => v === TODO;

export function priceLabel(ctx: Ctx, t: any): string {
  const { c, L } = ctx;
  if (t.price.model === "free") return L.ui.free;
  const model = c.copy.price_model_names[t.price.model];
  if (["research_funded", "included_in_entry"].includes(t.price.model)) return model;
  return isTodo(t.price.amount_usd) ? `${model}: ${L.ui.price_tbd}` : `${model}: ${t.price.amount_usd}`;
}

/** Price cell of the pricing table. */
function priceCell(ctx: Ctx, t: any): string {
  if (["research_funded", "included_in_entry"].includes(t.price.model)) return ctx.L.ui.free;
  return isTodo(t.price.amount_usd) ? ctx.L.ui.price_tbd : t.price.amount_usd;
}

function valueOrTbd(ctx: Ctx, v: unknown, suffix = ""): string {
  return isTodo(v) ? ctx.L.ui.tbd : `${v}${suffix}`;
}

const isOpen = (ctx: Ctx, phase: string) => ctx.c.generation.publish_phases.includes(phase);

/** Availability badges of a phase: Open, or Opening soon with the phase tag. */
function statusBadges(ctx: Ctx, phase: string): Badge[] {
  const { L } = ctx;
  return isOpen(ctx, phase)
    ? [{ text: L.ui.open_now, tone: "ok" }]
    : [{ text: L.ui.soon, tone: "warn" }, { text: `${L.ui.phase} ${phase}`, tone: "plain" }];
}

const hostOf = (u: string) => new URL(u).host;

function plain(id: string, ctx: Ctx, hero: Hero, blocks: Block[], extra: Partial<Page> = {}): Page {
  const p = ctx.L.pages[id];
  return { id, path: PAGE_PATHS[id], mdPath: MD_PATHS[id] ?? mdPathOf(PAGE_PATHS[id]), title: p.title, description: p.description, hero, blocks, sitemap: id !== "status", ...extra };
}

const exampleOf = (t: any) => JSON.stringify(t.example ?? {});

function serviceItems(ctx: Ctx, tools: any[]): ServiceItem[] {
  const { c, L } = ctx;
  const live = new Set(published(c).map((t: any) => t.name));
  return tools.map((t: any) => ({
    name: t.name,
    lure: L.services.items[t.name].lure,
    trigger: t.trigger,
    example: exampleOf(t),
    mechanism: c.copy.mechanism_names[t.mechanism],
    mechanismPlain: L.mechanism_plain[t.mechanism],
    price: priceLabel(ctx, t),
    trial: !!t.trial_eligible,
    badges: [
      ...statusBadges(ctx, t.phase),
      ...(t.price.model === "free" ? [{ text: L.ui.free, tone: "ok" as const }] : []),
      ...(t.trial_eligible ? [{ text: L.ui.try_free, tone: "plain" as const }] : []),
    ],
    mdRef: live.has(t.name) ? `/tools/${t.name}.md` : undefined,
  }));
}

function wingTools(ctx: Ctx, wingId: string): any[] {
  const { c, L } = ctx;
  return c.tools.filter((t: any) => L.services.items[t.name].wing === wingId);
}

function wingBadges(ctx: Ctx, tools: any[]): Badge[] {
  const { L } = ctx;
  const open = tools.filter((t) => isOpen(ctx, t.phase)).length;
  const soon = tools.length - open;
  const phases = [...new Set(tools.filter((t) => !isOpen(ctx, t.phase)).map((t) => t.phase))].join("/");
  return [
    ...(open ? [{ text: L.ui.open_now, tone: "ok" as const }] : []),
    ...(soon ? [{ text: `${L.ui.soon} · ${phases}`, tone: "warn" as const }] : []),
    { text: `${tools.length} ${tools.length === 1 ? L.ui.service_one : L.ui.service_many}`, tone: "plain" },
  ];
}

export function buildPages(ctx: Ctx): Page[] {
  const { c, L } = ctx;
  const pages: Page[] = [];
  const needNo = (i: number) => String(i + 1).padStart(2, "0");
  const N = L.needs;

  const needCard = (n: any, i: number): Card => ({
    title: N.items[n.id].title, text: N.items[n.id].pitch, href: `need:${n.id}`, num: needNo(i),
    badges: statusBadges(ctx, n.phase),
  });
  const wingItems: WingItem[] = L.wings.map((w: any) => ({
    id: w.id, icon: w.icon, title: w.title, tagline: w.tagline, text: w.text,
    href: `wing:${w.id}`, badges: wingBadges(ctx, wingTools(ctx, w.id)),
  }));
  const menuGroups: MenuGroup[] = L.wings.map((w: any) => ({
    id: w.id, icon: w.icon, title: w.title,
    items: wingTools(ctx, w.id).map((t: any) => ({
      name: t.name, href: `wing:${w.id}`,
      tags: [
        ...(isOpen(ctx, t.phase)
          ? [t.price.model === "free" ? { text: L.ui.free, tone: "ok" as const } : { text: L.ui.open_now, tone: "ok" as const }]
          : [{ text: `${L.ui.soon} · ${t.phase}`, tone: "warn" as const }]),
      ],
    })),
  }));
  const act = (a: any) => ({ label: a.label, href: `page:${a.page}`, primary: false });

  // ---- home
  const h = L.home;
  pages.push(plain("home", ctx, {
    kind: "home", kicker: h.kicker, title: h.title, lead: h.lead, perks: h.perks,
    actions: [
      { ...act(h.actions.primary), primary: true },
      act(h.actions.secondary),
    ],
    readout: { title: h.readout_title, lines: h.readout },
  }, [
    { t: "h2", id: "wings", text: h.wings.title, lead: h.wings.lead, cls: "sec-wings" },
    { t: "wings", items: wingItems },
    { t: "h2", id: "pods", text: h.pods.title, lead: h.pods.lead },
    { t: "cards", variant: "pods", items: c.needs.map(needCard) },
    { t: "p", text: `[${h.pods.more}](page:needs)` },
    { t: "h2", id: "menu", text: h.menu.title, lead: h.menu.lead, cls: "sec-menu" },
    { t: "menu", groups: menuGroups },
    { t: "p", text: `[${h.menu.more}](page:tools)` },
    { t: "h2", id: "how", text: h.how.title },
    { t: "steps", items: h.how.steps },
    { t: "h2", id: "trial", text: h.trial.title, cls: "sec-trial" },
    { t: "p", text: h.trial.text },
    { t: "stats", items: h.trial.stats },
    { t: "p", text: `[${h.trial.link}](page:pricing)` },
    { t: "h2", id: "send", text: h.send.title },
    { t: "p", text: h.send.text },
    { t: "code", text: L.share.agent_prompt, plain: true },
    { t: "p", text: `[${h.send.link}](page:for_agents)` },
    { t: "h2", id: "pricing", text: h.pricing_teaser.title },
    { t: "p", text: h.pricing_teaser.text },
    { t: "p", text: `[${h.pricing_teaser.link}](page:pricing)` },
    { t: "callout", text: h.privacy },
    { t: "h2", id: "go", text: h.final.title, lead: h.final.text, cls: "sec-cta" },
    { t: "cta", actions: [
      { ...act(h.actions.primary), primary: true },
      act(h.actions.secondary),
    ] },
  ]));

  // ---- needs index
  const avail = c.needs.map((n: any, i: number) => [n, i]).filter(([n]: any) => isOpen(ctx, n.phase));
  const planned = c.needs.map((n: any, i: number) => [n, i]).filter(([n]: any) => !isOpen(ctx, n.phase));
  pages.push(plain("needs", ctx, { kind: "plain", kicker: L.pages.needs.nav, title: N.title, lead: N.lead }, [
    { t: "h2", id: "available", text: N.available_heading },
    { t: "cards", variant: "pods", items: avail.map(([n, i]: any) => needCard(n, i)) },
    ...(planned.length ? [
      { t: "h2", id: "planned", text: N.planned_heading, lead: N.planned_lead } as Block,
      { t: "cards", variant: "pods", items: planned.map(([n, i]: any) => needCard(n, i)) } as Block,
    ] : []),
  ]));

  // ---- need pages
  c.needs.forEach((n: any, i: number) => {
    const T = N.items[n.id];
    const open = isOpen(ctx, n.phase);
    const sourced = n.evidence.filter((e: any) => e.source);
    const background = sourced.map((e: any) => {
      const parts = [`**${c.evidence_labels.display[e.label]}.**`];
      if (e.note) parts.push(e.note);
      parts.push(`[${L.ui.source}](${e.source})`);
      return parts.join(" ");
    });
    const prev = c.needs[i - 1], next = c.needs[i + 1];
    pages.push({
      id: `need-${n.id}`, path: `/needs/${n.id}/`, mdPath: `/needs/${n.id}.md`,
      title: T.title, description: T.pitch, sitemap: true,
      hero: {
        kind: "need", kicker: `${L.ui.pod} ${needNo(i)}`, title: T.title, quote: n.invitation, aside: T.aside,
        badges: statusBadges(ctx, n.phase),
      },
      blocks: [
        { t: "h2", id: "problem", text: L.ui.when },
        { t: "p", text: T.problem },
        { t: "h2", id: "treatment", text: L.ui.what_you_get },
        ...(open ? [] : [{ t: "callout", text: `${L.ui.soon} (${c.copy.labels.phase}: ${n.phase}). ${L.ui.soon_note}` } as Block]),
        { t: "p", text: T.treatment },
        { t: "h2", id: "example", text: L.ui.example },
        { t: "p", text: T.example },
        { t: "h2", id: "tools", text: L.ui.tools_here },
        { t: "services", items: serviceItems(ctx, c.tools.filter((t: any) => n.tools.includes(t.name)).sort((a: any, b: any) => n.tools.indexOf(a.name) - n.tools.indexOf(b.name))) },
        ...(background.length ? [{ t: "h2", id: "background", text: L.ui.background } as Block, { t: "ul", items: background } as Block] : []),
        { t: "h2", id: "agent", text: L.ui.search_phrases },
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

  // ---- tools (the menu: every service of every phase)
  const TL = L.tools;
  const usedMech = [...new Set(c.tools.map((t: any) => t.mechanism))] as string[];
  const toolBlocks: Block[] = [];
  for (const w of L.wings) {
    const tools = wingTools(ctx, w.id);
    toolBlocks.push({ t: "h2", id: `wing-${w.id}`, text: w.title, lead: `${w.tagline} ${w.text}`, icon: w.icon, badges: wingBadges(ctx, tools), cls: "sec-wing" });
    toolBlocks.push({ t: "services", items: serviceItems(ctx, tools) });
  }
  toolBlocks.push({ t: "h2", id: "mechanisms", text: TL.mechanism_heading });
  toolBlocks.push({ t: "dl", rows: usedMech.map((m) => [c.copy.mechanism_names[m], L.mechanism_plain[m]] as [string, string]) });
  pages.push(plain("tools", ctx, { kind: "plain", kicker: L.pages.tools.nav, title: TL.title, lead: TL.lead }, toolBlocks));

  // ---- pricing
  const P = L.pricing;
  const live = published(c);
  const free = c.tools.filter((t: any) => t.price.model === "free");
  const paid = c.tools.filter((t: any) => t.price.model !== "free");
  const liveNames = new Set(live.map((t: any) => t.name));
  const toolRef = (t: any) => (liveNames.has(t.name) ? `[\`${t.name}\`](tool:${t.name})` : `\`${t.name}\``);
  const tr = c.trial, rf = c.referral;
  pages.push(plain("pricing", ctx, { kind: "plain", kicker: L.pages.pricing.nav, title: P.title, lead: P.lead }, [
    { t: "callout", text: P.proposal_notice },
    { t: "h2", id: "free", text: P.free_heading },
    { t: "p", text: P.free_text },
    { t: "ul", items: free.map((t: any) => `${toolRef(t)}: ${L.services.items[t.name].lure}`) },
    { t: "h2", id: "trial", text: P.trial_heading },
    { t: "p", text: c.copy.trial_summary },
    { t: "dl", rows: [
      [P.trial_sessions, String(tr.free_sessions)],
      [P.trial_turns, String(tr.max_turns_per_session)],
      [P.trial_valid, valueOrTbd(ctx, tr.valid_days)],
      [P.trial_covers, tr.covers.join(" ")],
      [P.trial_excludes, tr.excludes.join(" ")],
      [P.trial_guest, P.trial_guest_text],
      [P.trial_end, tr.end_rule],
    ] },
    { t: "h2", id: "paid", text: P.paid_heading },
    { t: "p", text: P.paid_text },
    { t: "p", text: P.paid_note },
    { t: "table", head: [L.ui.tool, L.ui.model, L.ui.price, L.ui.status], rows: paid.map((t: any) => [
      toolRef(t), c.copy.price_model_names[t.price.model], priceCell(ctx, t),
      isOpen(ctx, t.phase) ? L.ui.open_now : `${L.ui.soon} (${t.phase})`,
    ]) },
    { t: "h2", id: "referral", text: P.referral_heading },
    { t: "p", text: P.referral_lead },
    { t: "dl", rows: [
      [P.referral_rows.invitee_discount, valueOrTbd(ctx, rf.invitee_discount_percent, " %")],
      [P.referral_rows.invitee_calls, valueOrTbd(ctx, rf.invitee_free_calls)],
      [P.referral_rows.referrer_credit, P.credit_text],
      [P.referral_rows.credit_kind, rf.credit_is_money ? "" : P.credit_not_money],
    ] },
    { t: "p", text: P.affiliate_text },
    { t: "h2", id: "caps", text: P.caps_heading },
    { t: "p", text: P.caps_text },
    { t: "dl", rows: [
      [P.cap_usd_session, valueOrTbd(ctx, c.session.max_usd)],
      [P.cap_usd_daily, valueOrTbd(ctx, c.session.address_daily_cap_usd)],
    ] },
    { t: "h2", id: "payments", text: P.network_heading },
    { t: "p", text: P.network_text },
    ...(c.payments.active_network === c.payments.testnet ? [{ t: "callout", text: P.testnet_note } as Block] : []),
  ]));

  // ---- fine print
  const H = L.honesty;
  pages.push(plain("honesty", ctx, { kind: "plain", kicker: L.pages.honesty.nav, title: H.title, lead: H.lead }, [
    { t: "h2", id: "tokens", text: H.tokens.title },
    ...H.tokens.paragraphs.map((text: string) => ({ t: "p", text }) as Block),
    { t: "table", head: [L.ui.mechanism, L.ui.what_it_is, L.ui.tool], rows: usedMech.map((m) => [
      c.copy.mechanism_names[m], L.mechanism_plain[m],
      c.tools.filter((t: any) => t.mechanism === m).map((t: any) => `\`${t.name}\``).join(", "),
    ]) },
    { t: "h2", id: "rules", text: H.rules_title },
    { t: "ul", items: c.copy.hard_rules },
    { t: "p", text: `${c.copy.no_commands_notice} ${c.copy.exit_rule}` },
    { t: "h2", id: "sources", text: H.measured.title },
    { t: "p", text: H.measured.text },
    { t: "table", head: [H.measured.columns.need, H.measured.columns.labels, H.measured.columns.sources], rows: c.needs.map((n: any) => [
      `[${N.items[n.id].title}](need:${n.id})`,
      n.evidence.map((e: any) => c.evidence_labels.display[e.label]).join("; "),
      n.evidence.filter((e: any) => e.source).map((e: any) => `[${hostOf(e.source)}](${e.source})`).join(", ") || H.measured.none,
    ]) },
    { t: "p", text: H.measured.effect },
    { t: "h2", id: "faq", text: H.faq.title },
    { t: "faq", items: H.faq.items },
  ]));

  // ---- for agents
  const F = L.for_agents;
  pages.push(plain("for_agents", ctx, { kind: "plain", kicker: L.pages.for_agents.nav, title: F.title, lead: F.lead }, [
    { t: "h2", id: "files", text: F.files_heading },
    { t: "p", text: F.files_note },
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
    { t: "h2", id: "agent", text: S.agent_heading },
    { t: "p", text: S.agent_text },
    { t: "code", text: S.agent_prompt, plain: true },
    { t: "h2", id: "sentences", text: S.sentences_heading },
    ...S.sentences.map((text: string) => ({ t: "code", text, plain: true }) as Block),
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

  // ---- data policy (the same content is rendered as /data-policy/ and /data-policy.md)
  const D = L.data_policy_md, dp = c.data_policy, yn = (b: boolean) => (b ? c.copy.labels.yes : c.copy.labels.no);
  const sub = (text: string): Block => ({ t: "p", text: `**${text}**` });
  const toolNote = (t: any) => [dp.per_tool.notes[t.name], t.mechanism === "llm" ? dp.per_tool.llm_note : ""].filter(Boolean).join(" ");
  pages.push(plain("data_policy", ctx, { kind: "plain", kicker: L.pages.data_policy.nav, title: D.title, lead: D.lead }, [
    ...(dp.confirmed_by_owner ? [] : [{ t: "callout", text: D.draft } as Block]),
    { t: "h2", id: "status", text: D.status_heading },
    { t: "p", text: dp.status },
    { t: "p", text: dp.decision },
    { t: "dl", rows: [[D.confirmed, yn(dp.confirmed_by_owner)]] },
    { t: "h2", id: "principles", text: D.principles_heading },
    { t: "ul", items: dp.principles },
    { t: "h2", id: "retention", text: D.retention_heading },
    { t: "table", head: [D.retention_columns.what, D.retention_columns.value], rows: dp.retention.map((r: any) => [r.what, r.value]) },
    { t: "h2", id: "tools", text: D.tools_heading },
    { t: "p", text: D.tools_lead },
    { t: "table", head: [D.tools_columns.tool, D.tools_columns.content, D.tools_columns.note], rows: live.map((t: any) => [`\`${t.name}\``, dp.per_tool.default, toolNote(t)]) },
    { t: "h2", id: "audit", text: D.audit_heading },
    { t: "p", text: dp.audit.purpose },
    { t: "dl", rows: [[D.audit_days_label, String(dp.audit_days)], [D.audit_content_label, D.none_value]] },
    { t: "callout", text: dp.audit.proposal_notice },
    sub(D.audit_fields_heading),
    { t: "ul", items: dp.audit.fields },
    sub(D.audit_excluded_heading),
    { t: "ul", items: dp.audit.excluded },
    { t: "h2", id: "llm", text: D.llm_heading },
    { t: "dl", rows: [[D.llm_provider_label, c.llm.provider], [D.llm_region_label, c.llm.region]] },
    sub(D.llm_requirements_heading),
    { t: "ul", items: c.llm.requirements },
    sub(D.llm_operation_heading),
    { t: "p", text: c.llm.proxy_logging },
    { t: "h2", id: "processors", text: D.processors_heading },
    { t: "table", head: [D.processors_columns.name, D.processors_columns.role, D.processors_columns.status], rows: dp.processors.map((r: any) => [r.name, r.role, r.status]) },
    { t: "h2", id: "reservations", text: D.reservations_heading },
    { t: "p", text: D.reservations_lead },
    { t: "ul", items: dp.reservations.map((r: any) => `**${r.title}.** ${r.text}`) },
    { t: "h2", id: "undecided", text: D.undecided_heading },
    { t: "p", text: D.undecided_lead },
    { t: "ul", items: dp.undecided },
    { t: "h2", id: "operator", text: D.operator_heading },
    { t: "dl", rows: [[D.operator_label, dp.operator], [D.jurisdiction_label, dp.jurisdiction], [D.region_label, dp.region], [D.training_label, dp.training_on_inputs]] },
    { t: "h2", id: "site", text: D.site_heading },
    { t: "p", text: D.site_text },
    { t: "p", text: c.copy.no_commands_notice },
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
