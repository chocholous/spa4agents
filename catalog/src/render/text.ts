import path from "node:path";
import { Catalog, baseUrl, findTools, published } from "../catalog.ts";
import { priceEntries, priceEntry } from "../pricing.ts";
import { Files, fence, mechanismText, priceText, table } from "./shared.ts";

function liveNeeds(c: Catalog): any[] {
  return c.needs.filter((n: any) => c.generation.publish_phases.includes(n.phase));
}

/** Price cell of a need row: one text when its tools share a price, otherwise "tool: price" per tool. */
function needPriceCell(c: Catalog, tools: any[]): string {
  const entries = priceEntries(c, tools);
  const unique = [...new Set(entries.map((e) => e.price_short))];
  if (unique.length === 1) return unique[0];
  return entries.map((e) => `${e.name}: ${e.price_short}`).join("; ");
}

/** Short llms.txt: connect line, need/call/price table, links. Details live in llms-full.txt. */
export function renderLlms(c: Catalog, files: Files) {
  const s = c.copy.sections;
  const x = c.copy.llms;
  const b = baseUrl(c);
  const live = new Set(published(c).map((t: any) => t.name));
  const out: string[] = [`# ${c.brand.name}`, "", `> ${x.blockquote}`, "", `${x.connect_label}: \`${c.copy.install.claude}\``, ""];
  out.push(`## ${s.need_to_tool}`, "");
  out.push(table([x.table_need, x.table_call, c.copy.labels.price], liveNeeds(c).map((n: any) => {
    const tools = findTools(c, n.tools).filter((t: any) => live.has(t.name));
    return [n.situation, tools.map((t: any) => `\`${t.name}\``).join(", "), needPriceCell(c, tools)];
  })), "");
  const freeTools = priceEntries(c, published(c)).filter((p) => p.status === "free").map((p) => `\`${p.name}\``);
  out.push(`## ${s.trial}`, "", `${c.copy.price_model_names.free}: ${freeTools.join(", ")}`, "", c.copy.trial_summary, "");
  out.push(`## ${s.optional}`, "",
    `- [llms-full.txt](${b}/llms-full.txt): ${x.full_desc}`,
    `- [pricing.json](${b}/pricing.json): ${x.pricing_desc}`,
    `- [openapi.json](${b}/openapi.json): ${x.openapi_desc}`,
    `- [mcp.json](${b}/.well-known/mcp.json): ${x.mcp_desc}`,
    `- [data-policy.md](${b}/data-policy.md): ${x.data_policy_desc}`, "");
  out.push(x.note, "");
  files.set("llms.txt", out.join("\n"));
}

/** Full llms-full.txt: the long index (needs, tools, price table, links) followed by every need and tool page. Must run after renderNeeds and renderTools. */
export function renderLlmsFull(c: Catalog, files: Files) {
  const s = c.copy.sections;
  const x = c.copy.llms;
  const l = c.copy.labels;
  const b = baseUrl(c);
  const out: string[] = [`# ${c.brand.name}`, "", `> ${x.blockquote}`, "", `${x.connect_label}: \`${c.copy.install.claude}\``, "", x.full_intro, "", x.note, ""];
  out.push(`## ${s.needs}`, "", ...liveNeeds(c).map((n: any) => `- [${n.id}](${b}/needs/${n.id}.md): ${n.invitation}`), "");
  out.push(`## ${s.tools}`, "", ...published(c).map((t: any) => `- [${t.name}](${b}/tools/${t.name}.md): ${t.description}`), "");
  out.push(`## ${s.pricing}`, "", table([l.tool, l.model, l.price],
    published(c).map((t: any) => { const p = priceEntry(c, t); return [`\`${t.name}\``, c.copy.price_model_names[t.price.model], p.price_short]; })), "");
  out.push(c.copy.trial_summary, "", `- [pricing.json](${b}/pricing.json): ${x.pricing_desc}`, "");
  out.push(`## ${s.data_policy}`, "", `- [data-policy.md](${b}/data-policy.md): ${x.data_policy_desc}`, "");
  out.push(`## ${s.optional}`, "",
    `- [llms.txt](${b}/llms.txt)`,
    `- [openapi.json](${b}/openapi.json): ${x.openapi_desc}`,
    `- [mcp.json](${b}/.well-known/mcp.json): ${x.mcp_desc}`, "");
  const livePages = new Set([...liveNeeds(c).map((n: any) => `needs/${n.id}.md`), ...published(c).map((t: any) => `tools/${t.name}.md`)]);
  const pages = [...files.keys()].filter((k) => livePages.has(k)).sort();
  // Pages are concatenated, so their relative links become absolute.
  const absolute = (page: string, body: string) => body.replace(/\]\((\.{1,2}\/[^)\s]*)\)/g, (_m, rel: string) => `](${b}/${path.posix.normalize(path.posix.join(path.posix.dirname(page), rel))})`);
  const head = out.join("\n");
  files.set("llms-full.txt", [head, ...pages.map((k) => `\n---\n\n${absolute(k, files.get(k)!)}`)].join("\n"));
}

export function renderInstructions(c: Catalog, files: Files) {
  const l = c.copy.labels;
  const i = c.copy.initialize;
  const out: string[] = [i.intro, "", i.caps, i.payment, c.copy.trial_summary, "", `${i.menu_heading}:`];
  for (const t of published(c))
    out.push(`- ${t.name} [${mechanismText(c, t)}; ${priceText(c, t)}]: ${t.description} ${t.trigger}`);
  out.push("", c.copy.exit_rule, c.copy.no_commands_notice, "");
  void l;
  files.set("initialize-instructions.txt", out.join("\n"));
}

const block = (name: string, body: string) =>
  `<!-- BEGIN GENERATED: ${name} -->\n${body}\n<!-- END GENERATED: ${name} -->\n`;

export function renderReadmeTables(c: Catalog, files: Files) {
  const l = c.copy.labels;
  const s = c.copy.sections;
  const parts: string[] = [];
  parts.push(block("needs", `### ${s.need_to_tool}\n\n` + table([l.need, l.invitation, l.tools],
    liveNeeds(c).map((n: any) => [`\`${n.id}\``, n.invitation, n.tools.map((t: string) => `\`${t}\``).join(", ")]))));
  parts.push(block("pricing", `### ${s.pricing}\n\n` + table([l.tool, l.mechanism, l.model, l.amount, l.trial_eligible],
    published(c).map((t: any) => { const p = priceEntry(c, t); return [`\`${t.name}\``, mechanismText(c, t), c.copy.price_model_names[t.price.model], p.status === "pending" ? c.copy.llms.price_pending : p.amount_usd!, t.trial_eligible ? l.yes : l.no]; }))));
  parts.push(block("install", `### ${s.install}\n\n` + fence("sh", `${c.copy.install.claude}\n${c.copy.install.codex}`) + "\n\n" + fence("json", c.copy.install.json)));
  parts.push(block("trial", `### ${s.trial}\n\n${c.copy.trial_summary}`));
  files.set("README.tables.md", parts.join("\n"));
}
