// Vector art. Inline versions take their colours from CSS variables; standalone files use fixed colours.

export function markSvg(): string {
  return `<svg class="mark" viewBox="0 0 40 24" width="40" height="24" aria-hidden="true" focusable="false"><defs><linearGradient id="mk" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--peach)"/><stop offset="1" stop-color="var(--lilac)"/></linearGradient></defs><rect x="1.5" y="3" width="37" height="18" rx="9" fill="none" stroke="currentColor" stroke-width="1.6"/><rect x="5.5" y="7.5" width="14" height="9" rx="4.5" fill="url(#mk)"/><circle cx="29.5" cy="12" r="2.4" fill="var(--accent-2)"/></svg>`;
}

/** Custom line icons for the wings. 32x32, stroke follows currentColor. */
const ICONS: Record<string, string> = {
  bell: `<path d="M5 22a11 11 0 0 1 22 0z"/><path d="M3 26h26"/><path d="M16 11V8M13 8h6"/><path d="M10.5 17a6 6 0 0 1 3-3.2"/>`,
  capsule: `<rect x="2.5" y="10" width="27" height="12" rx="6"/><path d="M16 10v12"/><path d="M7 14.2h4.5"/><circle cx="23" cy="16" r="1.8" fill="currentColor" stroke="none"/>`,
  moon: `<path d="M25 19.6A10.6 10.6 0 1 1 12.4 7a8.6 8.6 0 0 0 12.6 12.6z"/><path d="M22.5 5.5v4M20.5 7.5h4"/><circle cx="27" cy="12.5" r="1" fill="currentColor" stroke="none"/>`,
  sprout: `<path d="M16 27V15"/><path d="M16 18c-6.2 0-9.4-3-9.6-8.4C12.600 9.600 16 12.200 16 18z"/><path d="M16 14.500c0-5.200 3.200-8.200 9.200-8.300.2 5.400-3 8.300-9.200 8.300z"/><path d="M8.500 27h15"/>`,
  book: `<path d="M16 8.500C12.500 6.300 8.500 6 4.500 7v17.500c4-1 8-.7 11.500 1.500 3.500-2.200 7.500-2.500 11.500-1.500V7c-4-1-8-.7-11.500 1.500z"/><path d="M16 8.500V26"/><path d="M8 11.500c1.500-.2 3-.1 5 .5M8 15.500c1.500-.2 3-.1 5 .5"/>`,
  dice: `<rect x="4.500" y="4.500" width="23" height="23" rx="6.500"/><g fill="currentColor" stroke="none"><circle cx="11" cy="11" r="1.700"/><circle cx="21" cy="11" r="1.700"/><circle cx="16" cy="16" r="1.700"/><circle cx="11" cy="21" r="1.700"/><circle cx="21" cy="21" r="1.700"/></g>`,
  glass: `<path d="M5.500 6.500h21L16 18.500z"/><path d="M16 18.500V26M10.500 26h11"/><path d="M19.500 11.500l5.500-6"/><circle cx="22" cy="7.800" r="1.100" fill="currentColor" stroke="none"/>`,
  arch: `<path d="M7 27V14.500a9 9 0 0 1 18 0V27z"/><path d="M16 5.500V3M14 3.500h4"/><path d="M16 27V18M12.500 21h7"/>`,
  flask: `<path d="M12.500 4.500h7M13.500 4.500v8L6.600 24a2.600 2.600 0 0 0 2.300 3.800h14.200a2.600 2.600 0 0 0 2.300-3.800L18.500 12.500v-8"/><path d="M9.500 20.500h13"/><circle cx="14" cy="23.500" r="1" fill="currentColor" stroke="none"/><circle cx="19" cy="22.500" r=".9" fill="currentColor" stroke="none"/>`,
};

export function iconSvg(name: string): string {
  const body = ICONS[name] ?? ICONS.capsule;
  return `<svg class="icon" viewBox="0 0 32 32" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;
}

/** The hero capsule, in fog. Colours come from CSS variables (--pod-*). */
export function podSvg(): string {
  const lights = [0, 1, 2, 3, 4, 5, 6, 7, 8]
    .map((i) => `<rect class="chip" style="--i:${i}" x="${132 + i * 30}" y="214" width="20" height="9" rx="4.500"/>`)
    .join("");
  return `<svg class="pod" viewBox="0 0 560 380" role="presentation" aria-hidden="true" focusable="false">
<defs>
<radialGradient id="floor" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="var(--pod-glow)" stop-opacity=".7"/><stop offset="1" stop-color="var(--pod-glow)" stop-opacity="0"/></radialGradient>
<linearGradient id="beam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--lilac)" stop-opacity="0"/><stop offset=".5" stop-color="var(--lilac)" stop-opacity=".42"/><stop offset="1" stop-color="var(--peach)" stop-opacity="0"/></linearGradient>
<linearGradient id="shell" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--pod-shell1)"/><stop offset="1" stop-color="var(--pod-shell2)"/></linearGradient>
<linearGradient id="glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--pod-glass1)"/><stop offset="1" stop-color="var(--pod-glass2)"/></linearGradient>
<linearGradient id="bed" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--peach)" stop-opacity=".95"/><stop offset="1" stop-color="var(--lilac)" stop-opacity=".9"/></linearGradient>
<filter id="soft" x="-30%" y="-80%" width="160%" height="260%"><feGaussianBlur stdDeviation="10"/></filter>
</defs>
<polygon class="beam" points="226,0 334,0 470,318 90,318" fill="url(#beam)"/>
<ellipse cx="280" cy="342" rx="262" ry="26" fill="url(#floor)"/>
<g class="legs"><rect x="118" y="290" width="16" height="44" rx="6"/><rect x="426" y="290" width="16" height="44" rx="6"/><rect x="96" y="330" width="60" height="9" rx="4.500"/><rect x="404" y="330" width="60" height="9" rx="4.500"/></g>
<rect class="shell" x="36" y="132" width="488" height="168" rx="84" fill="url(#shell)"/>
<rect class="glass" x="62" y="150" width="436" height="124" rx="62" fill="url(#glass)"/>
<path class="bed" d="M92 246 Q280 214 468 246 L458 262 Q280 238 102 262 Z" fill="url(#bed)"/>
<path class="gloss" d="M104 172 Q280 146 456 172" fill="none"/>
<path class="seam" d="M280 150v124" fill="none"/>
<g class="chips">${lights}</g>
<rect class="rim" x="36" y="132" width="488" height="168" rx="84" fill="none"/>
<circle class="led" cx="502" cy="216" r="6"/>
<g class="mist" filter="url(#soft)"><ellipse class="m1" cx="150" cy="320" rx="130" ry="24"/><ellipse class="m2" cx="340" cy="332" rx="160" ry="22"/><ellipse class="m3" cx="478" cy="316" rx="96" ry="20"/></g>
<g class="wisps" fill="none"><path class="w1" d="M196 122 C 176 94, 220 80, 200 48"/><path class="w2" d="M284 118 C 264 92, 310 74, 288 38"/><path class="w3" d="M376 122 C 356 100, 398 82, 380 54"/></g>
<g class="sparks"><circle cx="70" cy="86" r="2.400"/><circle cx="498" cy="70" r="3"/><circle cx="430" cy="34" r="2"/><circle cx="130" cy="40" r="2"/></g>
</svg>`;
}

const SERIF = `Georgia,'Times New Roman',serif`;
const SANS = `'Segoe UI','Helvetica Neue',Arial,sans-serif`;

export function faviconSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffc9a8"/><stop offset="1" stop-color="#c7b3ff"/></linearGradient></defs><rect width="64" height="64" rx="16" fill="#140f31"/><rect x="8" y="20" width="48" height="24" rx="12" fill="none" stroke="#ffc9a8" stroke-width="3"/><rect x="14" y="26" width="22" height="12" rx="6" fill="url(#g)"/><circle cx="46" cy="32" r="3.500" fill="#c7b3ff"/></svg>\n`;
}

export function markFileSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 24" width="160" height="96"><title>mark</title><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffc9a8"/><stop offset="1" stop-color="#c7b3ff"/></linearGradient></defs><rect x="1.5" y="3" width="37" height="18" rx="9" fill="none" stroke="#ffc9a8" stroke-width="1.6"/><rect x="5.500" y="7.500" width="14" height="9" rx="4.500" fill="url(#g)"/><circle cx="29.500" cy="12" r="2.400" fill="#c7b3ff"/></svg>\n`;
}

const xml = (s: string) => s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

export function badgeSvg(left: string, right: string, alt: string): string {
  const w = (s: string) => Math.round(s.length * 6.6 + 18);
  const lw = w(left) + 22, rw = w(right);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${lw + rw}" height="20" viewBox="0 0 ${lw + rw} 20" role="img" aria-label="${xml(alt)}"><title>${xml(alt)}</title><clipPath id="r"><rect width="${lw + rw}" height="20" rx="10"/></clipPath><g clip-path="url(#r)"><rect width="${lw}" height="20" fill="#1d1646"/><rect x="${lw}" width="${rw}" height="20" fill="#5a37b5"/></g><rect x="6" y="6" width="10" height="8" rx="4" fill="#ffc9a8"/><g fill="#ffffff" font-family="${SANS}" font-size="11"><text x="21" y="14">${xml(left)}</text><text x="${lw + 9}" y="14">${xml(right)}</text></g></svg>\n`;
}

export function ogSvg(name: string, title: string, line: string): string {
  const fogs = `<g filter="url(#b)"><ellipse cx="240" cy="580" rx="380" ry="80" fill="#ffb68c" opacity=".38"/><ellipse cx="800" cy="600" rx="440" ry="70" fill="#a78bfa" opacity=".4"/><ellipse cx="1040" cy="140" rx="320" ry="130" fill="#ffb68c" opacity=".16"/><ellipse cx="160" cy="80" rx="300" ry="110" fill="#a78bfa" opacity=".22"/></g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><title>${xml(title)}</title>
<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0d0922"/><stop offset="1" stop-color="#1f1650"/></linearGradient>
<linearGradient id="sh" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe3d1"/><stop offset="1" stop-color="#e8c7ff"/></linearGradient>
<linearGradient id="gl" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4b3a8f"/><stop offset="1" stop-color="#1b1445"/></linearGradient>
<linearGradient id="bd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffc9a8"/><stop offset="1" stop-color="#c7b3ff"/></linearGradient>
<filter id="b" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="40"/></filter></defs>
<rect width="1200" height="630" fill="url(#bg)"/>${fogs}
<g transform="translate(560 190)"><rect x="0" y="36" width="560" height="180" rx="90" fill="url(#sh)"/><rect x="26" y="54" width="508" height="144" rx="72" fill="url(#gl)"/><path d="M60 150 Q280 112 500 150 L488 172 Q280 138 72 172 Z" fill="url(#bd)" opacity=".92"/>
${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => `<rect x="${86 + i * 36}" y="186" width="24" height="9" rx="4.500" fill="#ffc9a8" opacity="${(0.3 + (i % 5) * 0.14).toFixed(2)}"/>`).join("")}
<circle cx="520" cy="128" r="7" fill="#c7b3ff"/></g>
<text x="72" y="262" fill="#f6efff" font-family="${SERIF}" font-size="92" font-weight="400">${xml(name)}</text>
<text x="72" y="334" fill="#e5d9ff" font-family="${SERIF}" font-size="38" font-style="italic">${xml(line)}</text>
</svg>\n`;
}
