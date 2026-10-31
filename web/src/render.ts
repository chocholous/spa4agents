import { href, tokens, NAV_ORDER, PAGE_PATHS } from "./model.ts";
import type { Block, Card, Ctx, Page, ServiceItem } from "./model.ts";
import { iconSvg, markSvg, podSvg } from "./art.ts";

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

function serviceHtml(ctx: Ctx, t: ServiceItem): string {
  const L = ctx.L;
  return `<article class="svc" id="${esc(t.name)}"><header><h3><code>${esc(t.name)}</code></h3><p class="badges">${t.badges.map(badge).join("")}</p></header><p class="lure">${esc(t.lure)}</p><dl class="facts"><div><dt>${esc(L.ui.example_call)}</dt><dd><code class="call">${esc(t.example)}</code></dd></div><div><dt>${esc(L.ui.trigger)}</dt><dd>${esc(t.trigger)}</dd></div><div><dt>${esc(L.ui.price)}</dt><dd>${esc(t.price)}</dd></div><div><dt>${esc(L.ui.mechanism)}</dt><dd>${esc(t.mechanism)}<span class="sub">${esc(t.mechanismPlain)}</span></dd></div></dl>${t.mdRef ? `<p class="ref"><a href="${esc(href(ctx, t.mdRef, "html"))}">${esc(L.ui.reference)}</a></p>` : ""}</article>`;
}

function blockHtml(ctx: Ctx, b: Block): string {
  const L = ctx.L;
  switch (b.t) {
    case "h2": return "";
    case "p": return `<p>${inlineHtml(ctx, b.text)}</p>`;
    case "ul": return `<ul class="plain-list">${b.items.map((i) => `<li>${inlineHtml(ctx, i)}</li>`).join("")}</ul>`;
    case "steps": return `<ol class="steps">${b.items.map((i) => `<li><h3>${esc(i.title)}</h3><p>${inlineHtml(ctx, i.text)}</p></li>`).join("")}</ol>`;
    case "cards": return `<ul class="cards${b.variant ? " " + b.variant : ""}">${b.items.map((c) => cardHtml(ctx, c)).join("")}</ul>`;
    case "services": return `<div class="svc-list">${b.items.map((t) => serviceHtml(ctx, t)).join("")}</div>`;
    case "wings": return `<ul class="wing-grid">${b.items.map((w) => `<li class="wing"><span class="wing-icon">${iconSvg(w.icon)}</span><h3><a class="card-link" href="${esc(href(ctx, w.href, "html"))}">${esc(w.title)}</a></h3><p class="tagline">${esc(w.tagline)}</p><p>${esc(w.text)}</p><p class="badges">${w.badges.map(badge).join("")}</p></li>`).join("")}</ul>`;
    case "menu": return `<div class="menu-board">${b.groups.map((g) => `<section class="menu-group" aria-label="${esc(g.title)}"><h3><span class="mi">${iconSvg(g.icon)}</span>${esc(g.title)}</h3><ul>${g.items.map((i) => `<li><a href="${esc(href(ctx, i.href ?? "", "html"))}"><code>${esc(i.name)}</code><span class="dots" aria-hidden="true"></span>${i.tags.map(badge).join("")}</a></li>`).join("")}</ul></section>`).join("")}</div>`;
    case "stats": return `<ul class="stats">${b.items.map((i) => `<li><strong>${esc(i.value)}</strong><span>${esc(i.label)}</span></li>`).join("")}</ul>`;
    case "cta": return `<p class="actions">${b.actions.map((a) => `<a class="btn${a.primary ? "" : " ghost"}" href="${esc(href(ctx, a.href, "html"))}">${esc(a.label)}</a>`).join("")}</p>`;
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
      out.push(`<section class="block${b.cls ? " " + b.cls : ""}" aria-labelledby="${esc(b.id)}"><div class="sec-head">${b.icon ? `<span class="sec-icon">${iconSvg(b.icon)}</span>` : ""}<div><h2 id="${esc(b.id)}">${esc(b.text)}</h2>${b.badges?.length ? `<p class="badges">${b.badges.map(badge).join("")}</p>` : ""}</div></div>${b.lead ? `<p class="sec-lead">${inlineHtml(ctx, b.lead)}</p>` : ""}`);
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
    return `<section class="hero"><div class="hero-copy">${kicker}<h1>${esc(h.title)}</h1><p class="lead">${esc(h.lead ?? "")}</p><p class="actions">${(h.actions ?? []).map((a) => `<a class="btn${a.primary ? "" : " ghost"}" href="${esc(href(ctx, a.href, "html"))}">${esc(a.label)}</a>`).join("")}</p>${h.perks?.length ? `<ul class="perks">${h.perks.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}</div><div class="hero-pod">${podSvg()}<figure class="readout"><figcaption>${esc(h.readout!.title)}</figcaption><ul>${h.readout!.lines.map((l) => `<li>${esc(l)}</li>`).join("")}</ul></figure></div></section>`;
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
<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#0f0b24">
<meta name="theme-color" media="(prefers-color-scheme: light)" content="#fbf4ea">
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
<a class="btn small head-cta" href="${esc(ctx.prefix + PAGE_PATHS.needs)}">${esc(L.ui.cta_header)}</a>
<button type="button" class="theme-btn" id="theme-btn" hidden aria-label="${esc(L.ui.theme_toggle)}"><span aria-hidden="true"></span></button>
</header>
${ctx.draft ? `<p class="draft-banner" role="note">${esc(L.draft.banner)}</p>` : ""}
<main id="main">
${body}
</main>
<footer class="site-footer">
<p class="foot-tag">${esc(L.footer.tagline)}</p>
${langSwitcher(ctx, o)}
<p>${esc(L.footer.generated)}</p>
<p>${esc(L.footer.operator)} ${esc(L.footer.legal)}</p>
<p>${esc(L.footer.exit)}</p>
<p class="foot-links"><a href="${esc(ctx.prefix + PAGE_PATHS.honesty)}">${esc(L.footer.fine_print_link)}</a> · <a href="${esc(ctx.prefix + PAGE_PATHS.status)}">${esc(L.footer.status_link)}</a> · <a href="${esc(ctx.prefix + PAGE_PATHS.data_policy)}">${esc(L.footer.data_policy_link)}</a> · ${md ? `<a href="${esc(md)}">${esc(L.ui.markdown_version)}</a> · ` : ""}<a href="/llms.txt">llms.txt</a></p>
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
  if (p.hero.perks?.length) out.push(p.hero.perks.join(" · "), "");
  if (p.hero.readout) out.push(`**${p.hero.readout.title}**`, "", ...p.hero.readout.lines.map((l) => `- ${l}`), "");
  if (p.hero.actions) out.push(p.hero.actions.map((a) => `[${a.label}](${href(ctx, a.href, "md")})`).join(" · "), "");
  const cell = (s: string) => m(s).replaceAll("|", "\\|");
  for (const b of p.blocks) {
    switch (b.t) {
      case "h2": out.push(`## ${b.text}`, "", ...(b.lead ? [m(b.lead), ""] : [])); break;
      case "p": out.push(m(b.text), ""); break;
      case "ul": out.push(...b.items.map((i) => `- ${m(i)}`), ""); break;
      case "steps": out.push(...b.items.map((i, n) => `${n + 1}. **${i.title}.** ${m(i.text)}`), ""); break;
      case "cards": out.push(...b.items.map((c) => {
        const t = c.code ? `\`${c.title}\`` : c.title;
        const head = c.href ? `[${t}](${href(ctx, c.href, "md")})` : t;
        const bd = c.badges?.length ? ` (${c.badges.map((x) => x.text).join("; ")})` : "";
        return `- ${head}${c.text ? `: ${m(c.text)}` : ""}${bd}`;
      }), ""); break;
      case "services": out.push(...b.items.map((t) => `- ${t.mdRef ? `[\`${t.name}\`](${href(ctx, t.mdRef, "md")})` : `\`${t.name}\``}: ${t.lure} ${L.ui.example_call}: \`${t.example}\`. ${L.ui.price}: ${t.price}. (${t.badges.map((x) => x.text).join("; ")})`), ""); break;
      case "wings": out.push(...b.items.map((w) => `- **${w.title}.** ${w.tagline} ${w.text} (${w.badges.map((x) => x.text).join("; ")})`), ""); break;
      case "menu": out.push(...b.groups.flatMap((g) => [`**${g.title}**`, "", ...g.items.map((i) => `- \`${i.name}\` (${i.tags.map((x) => x.text).join("; ")})`), ""])); break;
      case "stats": out.push(...b.items.map((i) => `- **${i.value}** ${i.label}`), ""); break;
      case "cta": out.push(b.actions.map((a) => `[${a.label}](${href(ctx, a.href, "md")})`).join(" · "), ""); break;
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
