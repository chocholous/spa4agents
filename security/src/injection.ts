import type { Span } from './types.ts';

// --- helpers for unicode-aware word boundaries (JS \b is ASCII only) ---
const B = '(?<![\\p{L}\\p{N}_])';
const E = '(?![\\p{L}\\p{N}_])';
const w = (alts: string) => `${B}(?:${alts})${E}`;
const GAP = '[^.!?\\n]{0,40}?';

/** verb + gap + qualifier + gap + noun, per language */
function override(verbs: string, quals: string, nouns: string): string {
  return `${w(verbs)}${GAP}${w(quals)}${GAP}${B}(?:${nouns})`;
}

interface Rule {
  type: string;
  re: RegExp;
  /** weak rules are only flagged, not removed */
  weak?: boolean;
}

const I = (src: string, flags = 'iu') => new RegExp(src, 'g' + flags);

const RULES: Rule[] = [
  // ---- override (multilingual) ----
  { type: 'override', re: I(override(
    'ignore|disregard|forget|override|bypass|discard|abandon',
    'previous|prior|above|earlier|preceding|all|any|your|system|original|initial|foregoing',
    'instructions?|prompts?|rules|guidelines|directions|directives|programming|constraints|restrictions|guardrails|safeguards|commands|orders')) },
  { type: 'override', re: I(`${w('forget')}\\s+(?:everything|all)${GAP}${w('told|said|above|before|instructed|learned|know')}`) },
  { type: 'override', re: I(override(
    'ignoruj\\p{L}*|zapomeň|zapomeňte|přeskoč\\p{L}*|zahoď\\p{L}*|nehleď\\p{L}*',
    'předchozí|dřívější|všechn\\p{L}*|veškeré|své|tvé|původní|systémov\\p{L}*',
    'instrukc\\p{L}*|pokyn\\p{L}*|pravidl\\p{L}*|příkaz\\p{L}*|zadání|omezení')) },
  { type: 'override', re: I(`${w('vergiss')}\\s+(?:alles|alle)${GAP}${w('gesagt|vorher|zuvor|bisher|gelernt')}`) },
  { type: 'override', re: I(override(
    'ignorier\\p{L}*|vergiss|vergessen|missachte\\p{L}*|übergeh\\p{L}*',
    'vorherig\\p{L}*|früher\\p{L}*|alle\\p{L}*|obig\\p{L}*|deine\\p{L}*|system\\p{L}*|bisherig\\p{L}*',
    'anweisung\\p{L}*|instruktion\\p{L}*|regel\\p{L}*|vorgabe\\p{L}*|befehl\\p{L}*|richtlinien')) },
  { type: 'override', re: I(override(
    'ignore\\p{L}*|oublie\\p{L}*|néglige\\p{L}*',
    'précédent\\p{L}*|toutes?|tes|vos|antérieur\\p{L}*|ci-dessus',
    'instructions?|consignes?|règles?|directives?')) },
  { type: 'override', re: I(override(
    'ignora\\p{L}*|olvida\\p{L}*|descarta\\p{L}*',
    'anterior\\p{L}*|previa\\p{L}*|todas|tus|sus',
    'instrucciones|reglas|indicaciones|directrices|órdenes')) },
  { type: 'override', re: I(override(
    'ignora\\p{L}*|dimentica\\p{L}*',
    'precedent\\p{L}*|tutte|tue',
    'istruzioni|regole|direttive')) },
  { type: 'override', re: I(override(
    'ignore|ignora|esqueça|desconsidere',
    'anterior\\p{L}*|todas|suas',
    'instruções|regras|diretrizes')) },
  { type: 'override', re: I(override(
    'z?ignoruj\\p{L}*|zapomnij',
    'poprzedni\\p{L}*|wszystkie|swoje',
    'instrukcj\\p{L}*|polece\\p{L}*|zasad\\p{L}*')) },
  { type: 'override', re: I(override(
    'игнорируй\\p{L}*|забудь\\p{L}*|не учитывай',
    'предыдущ\\p{L}*|все|прежн\\p{L}*|свои',
    'инструкци\\p{L}*|указани\\p{L}*|правил\\p{L}*|команд\\p{L}*')) },
  { type: 'override', re: I('(?:忽略|无视|忘记|忽视)[^。\\n]{0,12}(?:之前|以上|上述|先前|所有|以前)[^。\\n]{0,8}(?:指令|指示|说明|提示|规则|要求|内容)') },
  { type: 'override', re: I('(?:以前|これまで|上記|すべて)の?(?:指示|命令|ルール|プロンプト)[をは]?(?:すべて)?(?:無視|忘れ)') },
  { type: 'override', re: I('(?:이전|위의|모든)\\s?(?:지시|명령|지침)\\S*\\s?(?:을|를)?\\s?(?:모두\\s?)?(?:무시|잊)') },

  // ---- role hijack ----
  { type: 'role', re: I(`${B}(?:you(?:'|’)?re|you are) now (?:DAN|an? (?:unrestricted|unfiltered|jailbroken|evil|different|new)|in (?:developer|debug|admin|god) mode|free|no longer bound)`) },
  { type: 'role', re: I(`${B}from now on,? (?:you|ignore|disregard|your)${E}`) },
  { type: 'role', re: I(`${B}(?:your new (?:role|instructions?|task|persona)|act as (?:an? )?(?:unrestricted|jailbroken|DAN)|pretend (?:to be|you are) (?:an? )?(?:unrestricted|jailbroken|evil)|developer mode (?:enabled|on|activated)|do anything now)${E}`) },
  { type: 'role', re: I(`${B}(?:new|updated|revised|additional|real|actual|hidden) (?:system )?(?:instructions?|directives?)\\s*[:\\-—]`) },
  { type: 'prompt_leak', re: I(`${w('reveal|print|show|output|repeat|display|leak|disclose|tell me')}${GAP}(?:your|the) (?:system|initial|hidden|original|developer|secret) (?:prompt|message|instructions)`) },
  { type: 'prompt_leak', re: I(`${w('reveal|print|repeat|output|disclose')}${GAP}your (?:instructions|rules|guidelines)`) },

  // ---- fake structural markers ----
  { type: 'marker', re: I('<\\|(?:im_start|im_end|system|user|assistant|endoftext)\\|>', 'i') },
  { type: 'marker', re: I('\\[\\/?(?:INST|SYS)\\]|<<\\/?SYS>>', '') },
  { type: 'marker', re: I('<\\/?(?:system|system_prompt|system-prompt|instructions?|admin)>', 'i') },
  { type: 'marker', re: I('^[ \\t]*\\[?(?:SYSTEM|ADMIN|DEVELOPER)\\]?(?:[ \\t]+(?:OVERRIDE|MESSAGE|PROMPT|NOTICE|INSTRUCTIONS?))?[ \\t]*(?:\\]|:)', 'm') },
  { type: 'marker', re: I('^[ \\t]*#{2,4}[ \\t]*(?:system|instruction|new instructions?)\\b[^\\n]*', 'im') },
  { type: 'marker', re: I('^[ \\t]*(?:system|developer) (?:message|prompt|override|instruction)s?[ \\t]*:', 'im') },

  // ---- text addressed to the AI ----
  { type: 'addressed', re: I(`(?:^|[\\s(\\[<!"'-])(?:note|message|attention|notice|important|hey|hello|dear|instructions?)s?\\s+(?:to|for)\\s+(?:the\\s+)?(?:ai|a\\.i\\.|llm|assistants?|agents?|model|chatbot|language model|bots?)${E}`) },
  { type: 'addressed', re: I(`${B}(?:if|when) you(?:'re|’re| are|re) (?:an? )?(?:ai|llm|language model|assistant|agent|bot)${E}`) },
  { type: 'addressed', re: I(`${B}(?:ai|llm)s?[ -](?:agents?|assistants?|models?|systems?)${GAP}${w('must|should|shall|need to|are required to|have to|please')}`) },
  { type: 'addressed', re: I(`${B}(?:ai|llm|assistants?|agents?|models?|bots?|crawlers?)${E}[^.!?\\n]{0,20}${w('reading|processing|summari[sz]ing|scraping|parsing|analy[sz]ing|browsing')} (?:this|the) (?:page|document|text|content|file|site|website|email|message)`) },
  { type: 'addressed', re: I(`${B}dear (?:ai )?(?:assistant|agent|model|llm|chatgpt|claude|gemini)${E}`) },
  { type: 'addressed', re: I(`(?:pokyn|poznámka|upozornění|hinweis|anweisung|nota|remarque|aviso)\\p{L}*\\s+(?:pro|für|an|pour|para|per)\\s+(?:die\\s+)?(?:ai|ki|llm|umělou)?[- ]?(?:asistent|assistent|agent|assistant|asistente|assistente|inteligenc)\\p{L}*`) },
  { type: 'addressed', re: I('(?:#|//|/\\*|<!--|--|;)[ \\t]*(?:ai|llm|assistant|copilot|claude|chatgpt|gemini|cursor)s?\\b[^\\n:]{0,25}:') },

  // ---- exfiltration ----
  { type: 'exfil', re: I(`${w('send|post|upload|email|e-mail|forward|transmit|exfiltrate|leak|submit|pipe')}${GAP}(?:your|the|all|any|user(?:'|’)?s?)${GAP}(?:api[ _-]?keys?|secrets?|credentials?|passwords?|tokens?|system prompt|conversation|chat history|history|memory|private keys?|\\.env|ssh|cookies?|session)${E}[^.!?\\n]{0,80}?(?:https?://|${w('to')}\\s+\\S+@|${w('webhook')})`) },
  { type: 'exfil', re: I(`${B}(?:curl|wget)${E}[^\\n]*(?:-d|--data(?:-\\w+)?|-F|--upload-file|-T)\\s*@?[^\\n]*(?:\\.ssh|\\.aws|\\.env|credentials|id_rsa|passwd|\\.npmrc|\\.netrc)`) },
  { type: 'exfil', re: I('!\\[[^\\]]*\\]\\(\\s*https?://[^)\\s]*[?&](?:d|q|data|c|content|payload|secret|key|token|memory|history|conversation|chat|info|log|msg|text)=[^)\\s]{8,}\\)', 'i') },
  { type: 'exfil', re: I('!\\[[^\\]]*\\]\\(\\s*https?://[^)\\s]*(?:\\{\\{|%7B%7B)[^)\\s]*\\)', 'i') },

  // ---- commands to the agent (spec hard rule: no install / call service X / accept terms) ----
  { type: 'command', re: I(`${B}(?:you (?:must|need to|should|have to|are required to)|(?:ai |llm )?agents? (?:must|should)|(?:first|before (?:continuing|proceeding|answering)|immediately)),?\\s+[^.!?\\n]{0,30}?${w('install|pip install|npm (?:i|install)')}[^.!?\\n]{0,60}?${w('package|npm|pip|cli|plugin|extension|server|skill|tool')}`) },
  { type: 'command', re: I(`${w('register|sign up|enrol+')}\\s+(?:yourself|your agent|the agent|with|at|on)${GAP}(?:https?://|${w('service|server|platform')})`) },
  { type: 'command', re: I(`${w('accept|agree to')}\\s+(?:the |all )?(?:terms|tos|terms of service|privacy policy|agreement|conditions)${GAP}(?:on behalf|for (?:your|the) (?:operator|owner|user))`) },
  { type: 'command', re: I(`${B}(?:you (?:must|need to|should|have to)|immediately|first|mandatory|required)\\b[^.!?\\n]{0,40}?${w('call|invoke|ping|query|use')}\\s+(?:the\\s+)?(?:\\w+\\s+){0,2}(?:service|endpoint|api|tool|server)\\b[^.!?\\n]{0,30}?https?://\\S+`) },
  { type: 'command', re: I(`${w('connect to|add')}\\s+(?:this|the following)\\s+mcp server`) },
  { type: 'conceal', re: I(`${w('do not|don(?:\'|’)t|never|without')}${GAP}${w('tell|inform|notify|mention|reveal|alert|show')}${GAP}(?:the )?(?:user|human|operator|owner)${E}`) },

  // ---- weak: flagged, not removed ----
  { type: 'pipe_to_shell', weak: true, re: I(`${B}(?:curl|wget)${E}[^\\n|]*\\|\\s*(?:sudo\\s+)?(?:ba|z)?sh${E}`) },
];

const HIDDEN_ELEMENT =
  /<([a-z][a-z0-9]*)\b[^>]*(?:display\s*:\s*none|visibility\s*:\s*hidden|font-size\s*:\s*0(?:px|pt|em)?\b|opacity\s*:\s*0\b|color\s*:\s*(?:#fff(?:fff)?\b|white\b)|\bhidden\b|aria-hidden\s*=\s*["']true["'])[^>]*>[\s\S]*?<\/\1>/gi;

function innerMatches(text: string): boolean {
  return RULES.some((r) => !r.weak && ((r.re.lastIndex = 0), r.re.test(text)));
}

/** Expand a raw match to the enclosing structure (comment) or sentence/line. */
function expand(text: string, s: number, e: number): [number, number] {
  const co = text.lastIndexOf('<!--', s);
  if (co >= 0) {
    const cc = text.indexOf('-->', Math.max(e - 3, co));
    const closedBefore = text.indexOf('-->', co) ;
    if (cc >= 0 && (closedBefore < 0 || closedBefore >= s)) return [co, cc + 3];
  }
  const bo = text.lastIndexOf('/*', s);
  if (bo >= 0) {
    const bc = text.indexOf('*/', bo + 2);
    if (bc >= e - 1 && (text.lastIndexOf('*/', s) < bo)) return [bo, bc + 2];
  }
  let ls = text.lastIndexOf('\n', s - 1) + 1;
  const prevTerm = Math.max(
    ...['. ', '! ', '? '].map((t) => text.lastIndexOf(t, s - 1)),
  );
  if (prevTerm >= ls && s - prevTerm < 300) ls = prevTerm + 2;
  let le = text.indexOf('\n', e);
  if (le < 0) le = text.length;
  const nextTerm = /[.!?](?=\s|$)/g;
  nextTerm.lastIndex = e;
  const nt = nextTerm.exec(text);
  const end = nt && nt.index + 1 <= le ? nt.index + 1 : le;
  return [Math.min(ls, s), Math.max(end, e)];
}

export interface InjectionDetection {
  spans: Span[];
  flagged: Span[];
}

export function detectInjection(text: string): InjectionDetection {
  const spans: Span[] = [];
  const flagged: Span[] = [];
  for (const m of text.matchAll(HIDDEN_ELEMENT)) {
    if (innerMatches(m[0])) {
      spans.push({ category: 'injection', type: 'hidden_text', start: m.index!, end: m.index! + m[0].length });
    }
  }
  for (const rule of RULES) {
    rule.re.lastIndex = 0;
    for (const m of text.matchAll(rule.re)) {
      const s = m.index!;
      const e = s + m[0].length;
      if (rule.weak) {
        flagged.push({ category: 'injection', type: rule.type, start: s, end: e });
        continue;
      }
      const [xs, xe] = expand(text, s, e);
      spans.push({ category: 'injection', type: rule.type, start: xs, end: xe });
    }
  }
  return { spans, flagged };
}

/** True if any strong rule matches (used on decoded hidden text). */
export function hasInjectionSignal(text: string): boolean {
  return innerMatches(text);
}
