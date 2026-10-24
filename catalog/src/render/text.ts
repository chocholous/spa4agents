import { Catalog, baseUrl, published } from "../catalog.ts";
import { Files, fence, mechanismText, priceText, table } from "./shared.ts";

function liveNeeds(c: Catalog): any[] {
  return c.needs.filter((n: any) => c.generation.publish_phases.includes(n.phase));
}

export function renderLlms(c: Catalog, files: Files) {
  const s = c.copy.sections;
  const b = baseUrl(c);
  const out: string[] = [`# ${c.brand.name}`, "", `> ${c.copy.llms.blockquote}`, "", c.copy.llms.note, ""];
  out.push(`## ${s.needs}`, "", ...liveNeeds(c).map((n: any) => `- [${n.id}](${b}/needs/${n.id}.md): ${n.invitation}`), "");
  out.push(`## ${s.tools}`, "", ...published(c).map((t: any) => `- [${t.name}](${b}/tools/${t.name}.md): ${t.description}`), "");
  out.push(`## ${s.pricing}`, "", `- [pricing.json](${b}/pricing.json): ${c.copy.llms.pricing_desc}`, "");
  out.push(`## ${s.data_policy}`, "", `- [data-policy.md](${b}/data-policy.md): ${c.copy.llms.data_policy_desc}`, "");
  out.push(`## ${s.optional}`, "",
    `- [openapi.json](${b}/openapi.json): ${c.copy.llms.openapi_desc}`,
    `- [mcp.json](${b}/.well-known/mcp.json): ${c.copy.llms.mcp_desc}`, "");
  files.set("llms.txt", out.join("\n"));
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
    published(c).map((t: any) => [`\`${t.name}\``, mechanismText(c, t), c.copy.price_model_names[t.price.model], t.price.amount_usd, t.trial_eligible ? l.yes : l.no]))));
  parts.push(block("install", `### ${s.install}\n\n` + fence("sh", `${c.copy.install.claude}\n${c.copy.install.codex}`) + "\n\n" + fence("json", c.copy.install.json)));
  parts.push(block("trial", `### ${s.trial}\n\n${c.copy.trial_summary}`));
  files.set("README.tables.md", parts.join("\n"));
}
