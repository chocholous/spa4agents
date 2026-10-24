import { Catalog, baseUrl, isPaid } from "../catalog.ts";

export type Files = Map<string, string>;

export const json = (v: unknown): string => JSON.stringify(v, null, 2) + "\n";

export function priceText(c: Catalog, t: any): string {
  const model = c.copy.price_model_names[t.price.model];
  if (t.price.model === "free") return model;
  return `${model}: ${t.price.amount_usd}`;
}

export function mechanismText(c: Catalog, t: any): string {
  return t.mechanism_note ?? c.copy.mechanism_names[t.mechanism];
}

/** Description of a tool as shown in tools/list: description, trigger, mechanism, price. */
export function toolDescription(c: Catalog, t: any): string {
  const l = c.copy.labels;
  return `${t.description} ${t.trigger} ${l.mechanism}: ${mechanismText(c, t)}. ${l.price}: ${priceText(c, t)}.`;
}

export function inputSchema(c: Catalog, t: any): any {
  const props: Record<string, any> = {};
  const required: string[] = [];
  for (const i of t.inputs) {
    const p: any = { type: i.type, description: i.description };
    if (i.type === "array") {
      p.items = i.items === "object"
        ? { type: "object", properties: Object.fromEntries((i.item_fields ?? []).map((f: string) => [f, { type: "string" }])), required: i.item_fields ?? [] }
        : { type: "string" };
      if (i.max_items) p.maxItems = i.max_items;
    }
    if (i.type === "string") {
      if (typeof i.max_length === "number") p.maxLength = i.max_length;
      else if (i.max_length) p.description += ` (${c.copy.labels.max_length}: ${i.max_length})`;
    }
    if (i.enum) p.enum = i.enum;
    props[i.name] = p;
    if (i.required && !(t.one_of_required ?? []).some((g: string[]) => g.includes(i.name))) required.push(i.name);
  }
  const s: any = { type: "object", properties: props, additionalProperties: false };
  if (required.length) s.required = required;
  if (t.one_of_required?.length) s.anyOf = t.one_of_required.map((g: string[]) => ({ required: g }));
  return s;
}

export function paymentBlock(c: Catalog, t: any): any {
  if (!isPaid(t)) return null;
  return { protocol: c.payments.protocol, scheme: c.payments.scheme, asset: c.payments.asset, network: c.payments.active_network };
}

export function restUrl(c: Catalog, t: any): string {
  return `${baseUrl(c)}/v1/${t.name}`;
}

export function toolLink(t: any, prefix = "./"): string {
  return `[\`${t.name}\`](${prefix}${t.name}.md)`;
}

export function table(headers: string[], rows: string[][]): string {
  const esc = (s: string) => s.replace(/\|/g, "\\|").replace(/\n/g, " ");
  return [
    `| ${headers.map(esc).join(" | ")} |`,
    `|${headers.map(() => "---").join("|")}|`,
    ...rows.map((r) => `| ${r.map(esc).join(" | ")} |`),
  ].join("\n");
}

export function fence(lang: string, body: string): string {
  return "```" + lang + "\n" + body + "\n```";
}
