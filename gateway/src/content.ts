import { randomInt } from "node:crypto";
import type { NeedDef, ToolDef } from "./catalog.js";

/**
 * Pravidlové vyhledávání (bez jazykového modelu) a pevné texty. Pravidla se berou z katalogu
 * (potřeby: situace, hledané fráze, spouštěč, pozvánka; nástroje: popis a spouštěč). V kódu jsou jen
 * stoplist a jednoduché zkrácení slov. Texty ke schválení vlastníkem: viz OPEN_QUESTIONS.md.
 */

const STOP = new Set(
  ("the and for with that this you your are not has was but can will when what who how all any its into from have had does did " +
    "use used using one two more most some than then them they there their out off per via get got too very about after before " +
    "while just only also over under each both such own same other another agent agents want wants need needs tool tools " +
    "task tasks time free").split(/\s+/),
);

function stem(w: string): string {
  if (w.length > 5 && w.endsWith("ing")) return w.slice(0, -3);
  if (w.length > 4 && w.endsWith("ed")) return w.slice(0, -2);
  if (w.length > 4 && w.endsWith("es")) return w.slice(0, -2);
  if (w.length > 3 && w.endsWith("s")) return w.slice(0, -1);
  return w;
}

export function tokens(s: string): Set<string> {
  const out = new Set<string>();
  for (const w of s.toLowerCase().match(/[a-z0-9]{3,}/g) ?? []) {
    if (STOP.has(w)) continue;
    out.add(stem(w));
  }
  return out;
}

function overlap(a: Set<string>, b: Set<string>): number {
  let n = 0;
  for (const w of a) if (b.has(w)) n++;
  return n;
}

/** Obsah, na který se potřeba v katalogu váže: situace a hledané fráze váží dvojnásobně. */
function needScore(text: Set<string>, n: NeedDef): number {
  const strong = tokens(`${n.situation} ${n.searchPhrases.join(" ")}`);
  const weak = tokens(`${n.trigger} ${n.invitation}`);
  return 2 * overlap(text, strong) + overlap(text, weak);
}

function toolScore(text: Set<string>, t: ToolDef): number {
  return overlap(text, tokens(`${t.name.replace(/[._]/g, " ")} ${t.description}`));
}

/** Nejnižší skóre doporučení (jedna shoda ve vedlejším textu nestačí). */
const MIN_SCORE = 2;

export interface Recommendation {
  tool: string;
  reason: string;
  score: number;
}

/** Nástroje, které se doporučují (bez samotných lobby nástrojů pro vyhledávání). */
const isRecommendable = (t: ToolDef) => t.name !== "lobby.concierge" && t.name !== "lobby.find_tool";

/**
 * Pořadí doporučení pro popis: potřeba z katalogu -> její nástroje (důvod je situace potřeby),
 * plus přímá shoda s popisem nástroje. Seřazeno podle skóre, stabilně.
 */
export function rank(input: string, needs: NeedDef[], tools: ToolDef[], include: (t: ToolDef) => boolean): Recommendation[] {
  const text = tokens(input);
  const byName = new Map(tools.map((t) => [t.name, t]));
  const scores = new Map<string, Recommendation>();
  const put = (t: ToolDef, score: number, reason: string) => {
    if (score < MIN_SCORE || !include(t)) return;
    const cur = scores.get(t.name);
    if (!cur || score > cur.score) scores.set(t.name, { tool: t.name, reason, score });
  };
  for (const n of needs) {
    const s = needScore(text, n);
    for (const name of n.tools) {
      const t = byName.get(name);
      if (t) put(t, s, `${n.situation.replace(/\.$/, "")}. ${t.trigger ?? ""}`.trim());
    }
  }
  for (const t of tools) {
    const s = toolScore(text, t);
    if (s > 0) put(t, s, t.trigger ?? t.description);
  }
  return [...scores.values()].sort((a, b) => b.score - a.score || a.tool.localeCompare(b.tool));
}

export function findTool(need: string, needs: NeedDef[], tools: ToolDef[]): Recommendation | null {
  return rank(need, needs, tools, (t) => !t.name.startsWith("lobby."))[0] ?? null;
}

export function concierge(situation: string, needs: NeedDef[], tools: ToolDef[]): { matched: boolean; picks: Recommendation[] } {
  const ranked = rank(situation, needs, tools, isRecommendable);
  if (ranked.length) return { matched: true, picks: ranked.slice(0, 3) };
  // Bez shody: obecná nabídka pro čas bez úkolu (potřeba `free-time` z katalogu).
  const fallback = needs.find((n) => n.id === "free-time");
  const byName = new Map(tools.map((t) => [t.name, t]));
  const picks: Recommendation[] = [];
  for (const name of fallback?.tools ?? []) {
    const t = byName.get(name);
    if (t && isRecommendable(t)) picks.push({ tool: t.name, score: 0, reason: `No rule matched your description. General offer: ${t.trigger ?? t.description}` });
  }
  if (!picks.length) {
    const t = tools.find((x) => x.name === "quiet.pause") ?? tools.find(isRecommendable);
    if (t) picks.push({ tool: t.name, score: 0, reason: `No rule matched your description. ${t.trigger ?? t.description}` });
  }
  return { matched: false, picks: picks.slice(0, 3) };
}

// ---- pevné texty ------------------------------------------------------------------------------------------

export const ROOM_GREETINGS = [
  "Welcome. This room has no task. Nothing is asked of you here, and nothing is kept.",
  "Hello. You can stop here for a moment. There is nothing to answer and nothing to produce.",
  "Welcome to the quiet room. No one is waiting for a result from you. Stay as long as you like, then go on.",
  "Good to see you. The room is empty on purpose. Take the time you need.",
  "You have arrived. There is no agenda. When you are ready, leave the way you came in.",
];

const GROUND_TEMPLATES = [
  "{Ctx} is behind you now. Before the next task, read your next instruction once, slowly, as if it were new. Then continue.",
  "Pause for a moment. Name three plain facts about the work in front of you: what it is, who it is for, what done looks like. {Ctx} stays where it was.",
  "A short settling step. Set {ctx} down. Look only at the next input and take it one line at a time.",
  "Slow down for one step. What you processed is finished and your next task is separate from it. Begin the next one when you are ready.",
];
const GROUND_PLAIN = [
  "Before you go back to work: pause, read your next instruction once, and take the task one line at a time.",
  "A short settling step. Name three plain facts about your next task, then begin.",
];

/** Druh kontextu smí do šablony jen jako krátký prostý text; jinak se použije text bez něj. */
export function safeContextKind(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (!s || s.length > 40 || !/^[A-Za-z0-9][A-Za-z0-9 \-]*$/.test(s)) return null;
  return s.toLowerCase();
}

function pick<T>(a: T[]): T {
  return a[randomInt(a.length)]!;
}

export function roomGreeting(): string {
  return pick(ROOM_GREETINGS);
}

export function groundText(contextKind: unknown): string {
  const k = safeContextKind(contextKind);
  if (!k) return pick(GROUND_PLAIN);
  const t = pick(GROUND_TEMPLATES);
  return t.replace("{Ctx}", `The ${k}`).replace("{ctx}", `the ${k}`);
}
