import { Catalog, baseUrl, published } from "../catalog.ts";
import { priceEntry } from "../pricing.ts";
import { Files, fence, table } from "./shared.ts";
import { liveNeeds, needToolTable } from "./text.ts";

/** Files of the public repository that are copied unchanged from the generated catalog outputs. */
export function repoCopies(c: Catalog): string[] {
  return [
    "llms.txt",
    "server.json",
    ...liveNeeds(c).map((n: any) => `needs/${n.id}.md`),
    ...published(c).map((t: any) => `tools/${t.name}.md`),
  ];
}

/** Static badge URL: dashes and underscores are doubled, spaces become underscores. */
function badge(b: any): string {
  const enc = (s: string) => encodeURIComponent(s.replace(/-/g, "--").replace(/_/g, "__").replace(/ /g, "_"));
  return `![${b.alt}](https://img.shields.io/badge/${enc(b.label)}-${enc(b.message)}-${b.color})`;
}

const bullets = (items: string[]) => items.map((i) => `- ${i}`);
const text = (s: string) => s.replace(/@@([^@]+)@@/g, (_m, e: string) => "${{ " + e.trim() + " }}") + "\n";

export function renderReadme(c: Catalog): string {
  const r = c.repo.readme;
  const l = c.copy.labels;
  const s = c.copy.sections;
  const live = c.launch.live ? "live" : "draft";
  const b = baseUrl(c);
  const out: string[] = [`# ${c.brand.name}`, "", c.brand.short_description, ""];
  out.push(c.repo.badges.filter((x: any) => !x.when || x.when === live).map(badge).join(" "), "");
  out.push(c.launch.live ? r.status_live : r.status_draft, "");
  out.push(`## ${s.for_agents}`, "", r.agents_intro, "", fence("sh", c.copy.install.claude), "");
  out.push(r.other_clients, "", fence("sh", c.copy.install.codex), "", fence("json", c.copy.install.json), "");
  out.push(needToolTable(c), "", c.copy.trial_summary, "", `**${r.payment_label}.** ${r.payment}`, "");
  out.push(`${r.links_heading}:`, "", ...bullets([
    `[llms.txt](llms.txt): ${r.link_llms}`,
    `[${c.brand.domain}](${b}): ${r.link_site}`,
    `[llms-full.txt](${b}/llms-full.txt): ${r.link_full}`,
    `[pricing.json](${b}/pricing.json): ${r.link_pricing}`,
    `[server.json](server.json): ${r.link_server}`,
    `[github.com/${c.repo.github}](https://github.com/${c.repo.github}): ${r.link_repo}`,
  ]), "");
  out.push(`## ${r.people_heading}`, "", `### ${r.what_heading}`, "", ...r.what_text.flatMap((t: string) => [t, ""]));
  out.push(`### ${r.how_heading}`, "", ...bullets(r.how_items), "");
  out.push(`### ${r.pricing_heading}`, "", table([l.tool, l.description, l.price],
    published(c).map((t: any) => [`\`${t.name}\``, t.description, priceEntry(c, t).price_short])), "", r.pricing_note, "");
  const dp = c.data_policy;
  out.push(`### ${r.privacy_heading}`, "", r.privacy_intro, "", `*${dp.status}*`, "", ...bullets(dp.principles));
  out.push(...bullets(dp.reservations.slice(0, r.privacy_reservation_count).map((x: any) => `**${x.title}.** ${x.text}`)), "");
  out.push(`### ${r.operator_heading}`, "", r.operator_text, "", `### ${r.license_heading}`, "", r.license_text, "");
  return out.join("\n");
}

/** The whole public repository as a file map. `dist` is the output of build() (catalog outputs). */
export function renderRepo(c: Catalog, dist: Files): Files {
  const files: Files = new Map();
  for (const p of repoCopies(c)) {
    if (!dist.has(p)) throw new Error(`missing ${p}`);
    files.set(p, dist.get(p)!);
  }
  files.set("README.md", renderReadme(c));
  files.set("LICENSE", text(c.repo.license_text));
  files.set("CONTRIBUTING.md", text(c.repo.contributing));
  files.set("SECURITY.md", text(c.repo.security));
  files.set("PUBLISHING.md", text(c.repo.publishing));
  files.set(".gitignore", text(c.repo.gitignore));
  files.set(".github/workflows/publish-mcp-registry.yml", text(c.repo.workflow));
  return files;
}
