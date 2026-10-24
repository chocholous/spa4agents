// Vector art. Inline versions take their colours from CSS variables; standalone files use fixed colours.

export function markSvg(): string {
  return `<svg class="mark" viewBox="0 0 40 24" width="40" height="24" aria-hidden="true" focusable="false"><rect x="1.5" y="3" width="37" height="18" rx="9" fill="none" stroke="currentColor" stroke-width="1.6"/><rect x="6" y="8" width="9" height="8" rx="4" fill="var(--accent)"/><circle cx="29" cy="12" r="2.2" fill="var(--accent-2)"/></svg>`;
}

export function podSvg(): string {
  const chips = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
    .map((i) => `<rect class="chip" style="--i:${i}" x="${112 + i * 26}" y="176" width="18" height="12" rx="5"/>`)
    .join("");
  return `<svg class="pod" viewBox="0 0 560 360" role="presentation" aria-hidden="true" focusable="false">
<defs>
<radialGradient id="floor" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="var(--accent)" stop-opacity=".55"/><stop offset="1" stop-color="var(--accent)" stop-opacity="0"/></radialGradient>
<linearGradient id="beam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--accent)" stop-opacity="0"/><stop offset=".45" stop-color="var(--accent)" stop-opacity=".22"/><stop offset="1" stop-color="var(--accent)" stop-opacity="0"/></linearGradient>
<linearGradient id="glass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--glass-top)"/><stop offset="1" stop-color="var(--glass-bottom)"/></linearGradient>
<filter id="soft" x="-30%" y="-80%" width="160%" height="260%"><feGaussianBlur stdDeviation="9"/></filter>
</defs>
<polygon class="beam" points="230,0 330,0 470,290 90,290" fill="url(#beam)"/>
<ellipse cx="280" cy="318" rx="250" ry="26" fill="url(#floor)"/>
<g class="legs"><rect x="110" y="262" width="14" height="46" rx="5"/><rect x="436" y="262" width="14" height="46" rx="5"/><rect x="90" y="304" width="54" height="8" rx="4"/><rect x="416" y="304" width="54" height="8" rx="4"/></g>
<rect class="shell" x="40" y="120" width="480" height="150" rx="75"/>
<rect class="glass" x="52" y="130" width="456" height="130" rx="65" fill="url(#glass)"/>
<path class="gloss" d="M96 150 Q280 128 464 150" fill="none"/>
<g class="chips">${chips}</g>
<rect class="rim" x="40" y="120" width="480" height="150" rx="75" fill="none"/>
<circle class="led" cx="498" cy="195" r="5"/>
<g class="mist" filter="url(#soft)"><ellipse class="m1" cx="150" cy="290" rx="120" ry="22"/><ellipse class="m2" cx="330" cy="300" rx="150" ry="20"/><ellipse class="m3" cx="470" cy="286" rx="90" ry="18"/></g>
<g class="wisps" fill="none"><path class="w1" d="M200 112 C 180 84, 224 70, 204 40"/><path class="w2" d="M286 108 C 266 82, 312 64, 290 30"/><path class="w3" d="M372 112 C 352 90, 394 72, 376 46"/></g>
</svg>`;
}

const SANS = `'Segoe UI','Helvetica Neue',Arial,sans-serif`;

export function faviconSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#070b14"/><rect x="8" y="20" width="48" height="24" rx="12" fill="none" stroke="#5ef0e1" stroke-width="3"/><rect x="15" y="27" width="12" height="10" rx="5" fill="#5ef0e1"/><circle cx="46" cy="32" r="3" fill="#a78bfa"/></svg>\n`;
}

export function markFileSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 24" width="160" height="96"><title>mark</title><rect x="1.5" y="3" width="37" height="18" rx="9" fill="none" stroke="#5ef0e1" stroke-width="1.6"/><rect x="6" y="8" width="9" height="8" rx="4" fill="#5ef0e1"/><circle cx="29" cy="12" r="2.2" fill="#a78bfa"/></svg>\n`;
}

const xml = (s: string) => s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

export function badgeSvg(left: string, right: string, alt: string): string {
  const w = (s: string) => Math.round(s.length * 6.6 + 18);
  const lw = w(left) + 22, rw = w(right);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${lw + rw}" height="20" viewBox="0 0 ${lw + rw} 20" role="img" aria-label="${xml(alt)}"><title>${xml(alt)}</title><clipPath id="r"><rect width="${lw + rw}" height="20" rx="10"/></clipPath><g clip-path="url(#r)"><rect width="${lw}" height="20" fill="#0c1322"/><rect x="${lw}" width="${rw}" height="20" fill="#0b6f78"/></g><rect x="6" y="6" width="9" height="8" rx="4" fill="#5ef0e1"/><g fill="#ffffff" font-family="${SANS}" font-size="11"><text x="20" y="14">${xml(left)}</text><text x="${lw + 9}" y="14">${xml(right)}</text></g></svg>\n`;
}

export function ogSvg(name: string, title: string, line: string): string {
  const fogs = `<g filter="url(#b)"><ellipse cx="260" cy="560" rx="360" ry="70" fill="#5ef0e1" opacity=".28"/><ellipse cx="760" cy="590" rx="420" ry="60" fill="#a78bfa" opacity=".26"/><ellipse cx="1040" cy="150" rx="300" ry="120" fill="#5ef0e1" opacity=".12"/></g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><title>${xml(title)}</title>
<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#050913"/><stop offset="1" stop-color="#0d1730"/></linearGradient>
<linearGradient id="gl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1c3a52"/><stop offset="1" stop-color="#0b1b2e"/></linearGradient>
<filter id="b" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="38"/></filter></defs>
<rect width="1200" height="630" fill="url(#bg)"/>${fogs}
<g transform="translate(560 190)"><rect x="0" y="40" width="560" height="170" rx="85" fill="#0f2236" stroke="#5ef0e1" stroke-width="3"/><rect x="14" y="52" width="532" height="146" rx="73" fill="url(#gl)"/>
${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => `<rect x="${60 + i * 34}" y="112" width="22" height="16" rx="6" fill="#5ef0e1" opacity="${(0.25 + (i % 5) * 0.15).toFixed(2)}"/>`).join("")}
<circle cx="520" cy="125" r="6" fill="#a78bfa"/></g>
<text x="72" y="250" fill="#e6edf7" font-family="${SANS}" font-size="84" font-weight="300">${xml(name)}</text>
<text x="72" y="320" fill="#9db0c9" font-family="${SANS}" font-size="34">${xml(line)}</text>
</svg>\n`;
}
