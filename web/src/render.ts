import { href, tokens, NAV_ORDER, PAGE_PATHS } from "./model.ts";
import type { Block, Card, Ctx, Page } from "./model.ts";
import { markSvg, podSvg } from "./art.ts";

export const esc = (s: string) =>
  s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

/** Inline mini-markup: `code`, **bold**, [text](ref). Output is HTML. */
export function inlineHtml(ctx: Ctx, raw: string): string {
  let s = esc(tokens(ctx, raw));
  s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, text, ref) => {
    const url = href(ctx, ref.replaceAll("&amp;", "&"), "html");
    const ext = /^https?:/.test(url) ? ' rel="noopener noreferrer"' : "";
    return `<a href="${esc(url)}"${ext}>${text}</a>`;
  });
  return s;
}

/** Same mini-markup, output is Markdown with logical links resolved to absolute URLs. */
export function inlineMd(ctx: Ctx, raw: string): string {
  return tokens(ctx, raw).replace(/\]\(([^)\s]+)\)/g, (_m, ref) => `](${href(ctx, ref, "md")})`);
}

const badge = (b: { text: string; tone: string }) => `<span class="badge ${b.tone}">${esc(b.text)}</span>`;

function cardHtml(ctx: Ctx, c: Card): string {
  const title = c.code ? `<code>${esc(c.title)}</code>` : esc(c.title);
  const head = c.href ? `<a class="card-link" href="${esc(href(ctx, c.href, "html"))}">${title}</a>` : title;
  return `<li class="card${c.href ? " is-link" : ""}">${c.num ? `<span class="pod-no" aria-hidden="true">${esc(c.num)}</span>` : ""}<h3>${head}</h3>${c.text ? `<p>${inlineHtml(ctx, c.text)}</p>` : ""}${c.badges?.length ? `<p class="badges">${c.badges.map(badge).join("")}</p>` : ""}</li>`;
}

function blockHtml(ctx: Ctx, b: Block): string {
  const L = ctx.L;
  switch (b.t) {
    case "h2": return "";
    case "p": return `<p>${inlineHtml(ctx, b.text)}</p>`;
    case "ul": return `<ul class="plain-list">${b.items.map((i) => `<li>${inlineHtml(ctx, i)}</li>`).join("")}</ul>`;
    case "steps": return `<ol class="steps">${b.items.map((i) => `<li><h3>${esc(i.title)}</h3><p>${inlineHtml(ctx, i.text)}</p></li>`).join("")}</ol>`;
    case "cards": return `<ul class="cards">${b.items.map((c) => cardHtml(ctx, c)).join("")}</ul>`;
    case "tools": return `<div class="tool-list">${b.items.map((t) => `<article class="tool" id="${esc(t.name)}"><h3><code>${esc(t.name)}</code></h3><p>${esc(t.description)}</p><p class="trigger">${esc(t.trigger)}</p><dl class="facts"><div><dt>${esc(L.ui.mechanism)}</dt><dd>${esc(t.mechanism)}<span class="sub">${esc(t.mechanismPlain)}</span></dd></div><div><dt>${esc(L.ui.price)}</dt><dd>${esc(t.price)}</dd></div><div><dt>${esc(L.ui.trial)}</dt><dd>${esc(t.trial ? L.ui.yes : L.ui.no)}</dd></div></dl><p><a href="${esc(href(ctx, t.mdRef, "html"))}">${esc(L.ui.reference)}</a></p></article>`).join("")}</div>`;
    case "table": return `<div class="table-wrap"><table><thead><tr>${b.head.map((h) => `<th scope="col">${esc(h)}</th>`).join("")}</tr></thead><tbody>${b.rows.map((r) => `<tr>${r.map((c) => `<td>${inlineHtml(ctx, c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
    case "dl": return `<dl class="rows">${b.rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${inlineHtml(ctx, v)}</dd></div>`).join("")}</dl>`;
    case "code": return `<figure class="code${b.plain ? " is-text" : ""}">${b.label ? `<figcaption>${esc(b.label)}</figcaption>` : ""}<pre><code>${esc(tokens(ctx, b.text))}</code></pre><button type="button" class="copy" hidden data-done="${esc(L.ui.copied)}">${esc(L.ui.copy)}</button></figure>`;
    case "callout": return `<aside class="callout">${b.title ? `<h3>${esc(b.title)}</h3>` : ""}<p>${inlineHtml(ctx, b.text)}</p></aside>`;
    case "faq": return `<div class="faq">${b.items.map((i) => `<details><summary>${esc(i.q)}</summary><p>${inlineHtml(ctx, i.a)}</p></details>`).join("")}</div>`;
    case "links": return `<ul class="file-list">${b.items.map((i) => `<li><a href="${esc(i.href)}"><code>${esc(i.label)}</code></a>${i.desc ? ` <span>${esc(i.desc)}</span>` : ""}</li>`).join("")}</ul>`;
    case "image": return `<p class="badge-preview"><img src="${esc(b.src)}" alt="${esc(tokens(ctx, b.alt))}" height="20"></p>`;
  }
}

function sections(ctx: Ctx, blocks: Block[]): string {
  const out: string[] = [];
  let open = false;
  for (const b of blocks) {
    if (b.t === "h2") {
      if (open) out.push("</section>");
      out.push(`<section class="block" aria-labelledby="${esc(b.id)}"><h2 id="${esc(b.id)}">${esc(b.text)}</h2>`);
      open = true;
    } else {
      if (!open) { out.push(`<section class="block">`); open = true; }
      out.push(blockHtml(ctx, b));
    }
  }
  if (open) out.push("</section>");
  return out.join("\n");
}

function heroHtml(ctx: Ctx, p: Page): string {
  const h = p.hero;
  const kicker = h.kicker ? `<p class="kicker">${esc(h.kicker)}</p>` : "";
  if (h.kind === "home") {
    return `<section class="hero"><div class="hero-copy">${kicker}<h1>${esc(h.title)}</h1><p class="lead">${esc(h.lead ?? "")}</p><p class="actions">${(h.actions ?? []).map((a) => `<a class="btn${a.primary ? "" : " ghost"}" href="${esc(href(ctx, a.href, "html"))}">${esc(a.label)}</a>`).join("")}</p></div><div class="hero-pod">${podSvg()}<figure class="readout"><figcaption>${esc(h.readout!.title)}</figcaption><ul>${h.readout!.lines.map((l) => `<li>${esc(l)}</li>`).join("")}</ul></figure></div></section>`;
  }
  if (h.kind === "need") {
    return `<section class="page-hero need-hero">${kicker}<h1>${esc(h.title)}</h1>${h.quote ? `<blockquote>${esc(h.quote)}</blockquote>` : ""}<p class="badges">${(h.badges ?? []).map(badge).join("")}</p>${h.aside ? `<p class="aside">${esc(h.aside)}</p>` : ""}</section>`;
  }
  return `<section class="page-hero">${kicker}<h1>${esc(h.title)}</h1>${h.lead ? `<p class="lead">${inlineHtml(ctx, h.lead)}</p>` : ""}</section>`;
}

export interface LayoutOpts {
  pages: Page[];
  page: Page;
  availableLocales: string[];
  ogImage: string;
  ogPng: boolean;
}

function langSwitcher(ctx: Ctx, o: LayoutOpts): string {
  const L = ctx.L;
  const items = ctx.c.web.languages.map((l: any) => {
    const on = o.availableLocales.includes(l.code);
    const pre = l.code === ctx.c.web.default_locale ? "" : `/${l.code}`;
    const path = o.page.id === "not_found" ? "/" : o.page.path;
    if (!on) return `<li><span lang="${esc(l.code)}" dir="${l.dir}" aria-disabled="true" class="lang off">${esc(l.name)}</span> <span class="soon">(${esc(L.ui.translation_coming)})</span></li>`;
    const cur = l.code === ctx.locale;
    return `<li><a lang="${esc(l.code)}" hreflang="${esc(l.code)}" dir="${l.dir}" class="lang${cur ? " cur" : ""}" href="${esc(pre + path)}"${cur ? ' aria-current="true"' : ""}>${esc(l.name)}</a></li>`;
  });
  return `<nav class="langs" aria-label="${esc(L.ui.languages)}"><ul>${items.join("")}</ul></nav>`;
}

export function layout(ctx: Ctx, o: LayoutOpts, body: string): string {
  const { c, L, locale } = ctx;
  const p = o.page;
  const lang = c.web.languages.find((l: any) => l.code === locale);
  const title = p.id === "home" ? `${c.brand.name}: ${p.title}` : `${p.title} · ${c.brand.name}`;
  const htmlUrl = ctx.base + ctx.prefix + p.path;
  const md = p.mdPath ? (p.id.startsWith("need-") ? ctx.base + p.mdPath : ctx.base + ctx.prefix + p.mdPath) : "";
  const multi = o.availableLocales.length > 1;
  const ogTitle = p.id === "home" ? L.meta.og_title : title;
  const nav = NAV_ORDER.map((id) => {
    const cur = p.id === id || (id === "needs" && p.id.startsWith("need-"));
    return `<li><a href="${esc(ctx.prefix + PAGE_PATHS[id])}"${cur ? ' aria-current="page"' : ""}>${esc(L.pages[id].nav)}</a></li>`;
  }).join("");
  const alternates = multi
    ? o.availableLocales.map((code) => {
        const pre = code === c.web.default_locale ? "" : `/${code}`;
        return `<link rel="alternate" hreflang="${code}" href="${ctx.base}${pre}${p.path}">`;
      }).join("\n") + `\n<link rel="alternate" hreflang="x-default" href="${ctx.base}${p.path}">`
    : "";
  const img = ctx.base + o.ogImage;
  return `<!doctype html>
<html lang="${esc(locale)}" dir="${lang.dir}"${ctx.draft ? ' data-draft="true"' : ""}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(p.description)}">
${ctx.draft ? '<meta name="robots" content="noindex, nofollow">\n<meta name="x-draft" content="true">' : ""}
<meta name="color-scheme" content="dark light">
<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#070b14">
<meta name="theme-color" media="(prefers-color-scheme: light)" content="#f2f7fa">
${p.id !== "not_found" ? `<link rel="canonical" href="${esc(htmlUrl)}">` : ""}
${md ? `<link rel="alternate" type="text/markdown" href="${esc(md)}">` : ""}
<link rel="describedby" href="${ctx.base}/llms.txt" type="text/plain">
${alternates}
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(c.brand.name)}">
<meta property="og:title" content="${esc(ogTitle)}">
<meta property="og:description" content="${esc(p.description)}">
<meta property="og:url" content="${esc(htmlUrl)}">
<meta property="og:locale" content="${esc(locale)}">
<meta property="og:image" content="${esc(img)}">
<meta property="og:image:alt" content="${esc(L.meta.og_alt)}">
${o.ogPng ? '<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">' : ""}
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(ogTitle)}">
<meta name="twitter:description" content="${esc(p.description)}">
<meta name="twitter:image" content="${esc(img)}">
<meta name="twitter:image:alt" content="${esc(L.meta.og_alt)}">
<script src="/assets/theme.js"></script>
<link rel="stylesheet" href="/assets/site.css">
</head>
<body>
<a class="skip" href="#main">${esc(L.ui.skip)}</a>
<div class="fog" aria-hidden="true"><i></i><i></i><i></i></div>
<header class="site-header">
<a class="brand" href="${esc(ctx.prefix || "/")}" aria-label="${esc(c.brand.name)}, ${esc(L.ui.home)}">${markSvg()}<span>${esc(c.brand.name)}</span></a>
<nav class="main-nav" aria-label="${esc(L.ui.menu)}"><ul>${nav}</ul></nav>
<button type="button" class="theme-btn" id="theme-btn" hidden aria-label="${esc(L.ui.theme_toggle)}"><span aria-hidden="true"></span></button>
</header>
${ctx.draft ? `<p class="draft-banner" role="note">${esc(L.draft.banner)}</p>` : ""}
<main id="main">
${body}
</main>
<footer class="site-footer">
${langSwitcher(ctx, o)}
<p>${esc(L.footer.generated)}</p>
<p>${esc(L.footer.operator)} ${esc(L.footer.legal)}</p>
<p>${esc(L.footer.exit)}</p>
<p class="foot-links"><a href="${esc(ctx.prefix + PAGE_PATHS.data_policy)}">${esc(L.footer.data_policy_link)}</a> · ${md ? `<a href="${esc(md)}">${esc(L.ui.markdown_version)}</a> · ` : ""}<a href="/llms.txt">llms.txt</a></p>
</footer>
<script src="/assets/site.js" defer></script>
</body>
</html>
`;
}

export function renderPage(ctx: Ctx, o: LayoutOpts): string {
  const p = o.page;
  const pager = p.pager
    ? `<nav class="pager" aria-label="${esc(ctx.L.ui.all_needs)}">${p.pager.prev ? `<a rel="prev" href="${esc(href(ctx, p.pager.prev.href, "html"))}"><small>${esc(ctx.L.ui.previous)}</small> ${esc(p.pager.prev.label)}</a>` : "<span></span>"}<a href="${esc(ctx.prefix + PAGE_PATHS.needs)}">${esc(ctx.L.ui.all_needs)}</a>${p.pager.next ? `<a rel="next" href="${esc(href(ctx, p.pager.next.href, "html"))}"><small>${esc(ctx.L.ui.next)}</small> ${esc(p.pager.next.label)}</a>` : "<span></span>"}</nav>`
    : "";
  return layout(ctx, o, `${heroHtml(ctx, p)}\n${sections(ctx, p.blocks)}\n${pager}`);
}

// ---- Markdown
export function renderMarkdown(ctx: Ctx, p: Page): string {
  const L = ctx.L;
  const m = (s: string) => inlineMd(ctx, s);
  const out: string[] = [`# ${p.hero.title}`, ""];
  if (p.hero.lead) out.push(`> ${m(p.hero.lead)}`, "");
  if (p.hero.quote) out.push(`> ${m(p.hero.quote)}`, "");
  if (p.hero.badges?.length) out.push(p.hero.badges.map((b) => `**${b.text}**`).join(" · "), "");
  if (p.hero.aside) out.push(`*${m(p.hero.aside)}*`, "");
  if (p.hero.readout) out.push(`**${p.hero.readout.title}**`, "", ...p.hero.readout.lines.map((l) => `- ${l}`), "");
  if (p.hero.actions) out.push(p.hero.actions.map((a) => `[${a.label}](${href(ctx, a.href, "md")})`).join(" · "), "");
  const cell = (s: string) => m(s).replaceAll("|", "\\|");
  for (const b of p.blocks) {
    switch (b.t) {
      case "h2": out.push(`## ${b.text}`, ""); break;
      case "p": out.push(m(b.text), ""); break;
      case "ul": out.push(...b.items.map((i) => `- ${m(i)}`), ""); break;
      case "steps": out.push(...b.items.map((i, n) => `${n + 1}. **${i.title}.** ${m(i.text)}`), ""); break;
      case "cards": out.push(...b.items.map((c) => {
        const t = c.code ? `\`${c.title}\`` : c.title;
        const head = c.href ? `[${t}](${href(ctx, c.href, "md")})` : t;
        const bd = c.badges?.length ? ` (${c.badges.map((x) => x.text).join("; ")})` : "";
        return `- ${head}${c.text ? `: ${m(c.text)}` : ""}${bd}`;
      }), ""); break;
      case "tools": out.push(...b.items.map((t) => `- [\`${t.name}\`](${href(ctx, t.mdRef, "md")}): ${t.description} ${t.trigger} ${L.ui.mechanism}: ${t.mechanism}. ${L.ui.price}: ${t.price}.`), ""); break;
      case "table": out.push(`| ${b.head.join(" | ")} |`, `|${b.head.map(() => "---").join("|")}|`, ...b.rows.map((r) => `| ${r.map(cell).join(" | ")} |`), ""); break;
      case "dl": out.push(...b.rows.map(([k, v]) => `- **${k}:** ${m(v)}`), ""); break;
      case "code": out.push(...(b.label ? [`**${b.label}**`, ""] : []), b.plain ? `> ${tokens(ctx, b.text)}` : "```\n" + tokens(ctx, b.text) + "\n```", ""); break;
      case "callout": out.push(`> ${b.title ? `**${b.title}** ` : ""}${m(b.text)}`, ""); break;
      case "faq": out.push(...b.items.flatMap((i) => [`**${i.q}**`, "", m(i.a), ""])); break;
      case "links": out.push(...b.items.map((i) => `- [${i.label}](${ctx.base}${i.href})${i.desc ? `: ${i.desc}` : ""}`), ""); break;
      case "image": out.push(`![${tokens(ctx, b.alt)}](${ctx.base}${b.src})`, ""); break;
    }
  }
  out.push("---", "", ctx.L.footer.generated, "");
  return out.join("\n");
}
