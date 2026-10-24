import { Catalog, findTools, published } from "../catalog.ts";
import { Files, fence, inputSchema, mechanismText, priceText, restUrl, table, toolLink } from "./shared.ts";

function exampleBlock(c: Catalog, t: any): string {
  const l = c.copy.labels;
  return `## ${l.example_call}\n\n${fence("", `POST ${restUrl(c, t)}`)}\n\n${fence("json", JSON.stringify(t.example, null, 2))}`;
}

function footer(c: Catalog): string {
  return `${c.copy.exit_rule}\n\n${c.copy.no_commands_notice}\n`;
}

export function renderNeeds(c: Catalog, files: Files) {
  const l = c.copy.labels;
  const live = new Set(published(c).map((t: any) => t.name));
  for (const n of c.needs) {
    const tools = findTools(c, n.tools);
    const planned = !c.generation.publish_phases.includes(n.phase);
    const out: string[] = [];
    out.push(`# ${n.id}`, "", `> ${n.invitation}`, "");
    if (planned) out.push(`**${l.status}:** ${c.copy.planned_notice} (${l.phase}: ${n.phase})`, "");
    out.push(`## ${l.situation}`, "", n.situation, "");
    out.push(`## ${l.trigger}`, "", n.trigger, "");
    out.push(`## ${l.tools}`, "");
    out.push(table([l.tool, l.mechanism, l.price, l.phase], tools.map((t: any) => [
      live.has(t.name) ? toolLink(t, "../tools/") : `\`${t.name}\``,
      mechanismText(c, t), priceText(c, t), t.phase,
    ])), "");
    const first = tools.find((t: any) => live.has(t.name));
    if (first) out.push(exampleBlock(c, first), "");
    out.push(`## ${l.evidence}`, "");
    for (const e of n.evidence) {
      const label = c.evidence_labels.display[e.label];
      const parts = [`**${label}.**`];
      if (e.note) parts.push(e.note);
      if (e.source) parts.push(`[${l.source}](${e.source})`);
      out.push(`- ${parts.join(" ")}`);
    }
    out.push("", `## ${l.not_claimed}`, "", n.not_claimed, "");
    out.push(`## ${l.search_phrases}`, "", ...n.search_phrases.map((p: string) => `- ${p}`), "");
    out.push(footer(c));
    files.set(`needs/${n.id}.md`, out.join("\n"));
  }
}

export function renderTools(c: Catalog, files: Files) {
  const l = c.copy.labels;
  for (const t of published(c)) {
    const out: string[] = [];
    out.push(`# ${t.name}`, "", `> ${t.description}`, "");
    out.push(`## ${l.trigger}`, "", t.trigger, "");
    out.push(table([l.mechanism, l.price, l.phase, l.trial_eligible, l.untrusted], [[
      mechanismText(c, t), priceText(c, t), t.phase,
      t.trial_eligible ? l.yes : l.no, t.untrusted ? l.yes : l.no,
    ]]), "");
    out.push(`## ${l.input}`, "");
    if (t.inputs.length === 0) out.push("-", "");
    else {
      out.push(table([l.name, l.type, l.status_required, l.description], t.inputs.map((i: any) => [
        `\`${i.name}\``,
        i.type === "array" ? `${l.array_of} ${i.items}` : i.type,
        i.required ? l.required : l.optional,
        [i.description,
          i.max_length !== undefined ? `${l.max_length}: ${i.max_length}` : "",
          i.max_items ? `${l.max_items}: ${i.max_items}` : "",
          i.enum ? `${l.allowed_values}: ${i.enum.join(", ")}` : "",
          i.item_fields ? `${l.fields}: ${i.item_fields.join(", ")}` : "",
        ].filter(Boolean).join(". "),
      ])), "");
      if (t.one_of_required) out.push(`${l.one_of}: ${t.one_of_required.map((g: string[]) => g.join(" + ")).join(" | ")}`, "");
    }
    out.push(`## ${l.output}`, "", t.output, "");
    out.push(`${l.json_schema}`, "", fence("json", JSON.stringify(inputSchema(c, t), null, 2)), "");
    out.push(exampleBlock(c, t), "");
    out.push(`## ${l.hard_rules}`, "", ...c.copy.hard_rules.map((r: string) => `- ${r}`), "");
    out.push(footer(c));
    files.set(`tools/${t.name}.md`, out.join("\n"));
  }
}
