// Public types of recovery.sanitize (WP5). Output shape follows docs/zadani.md:
// "vyčištěný text, seznam odstraněného, riziko".

export type Category = 'secret' | 'pii' | 'injection';

export interface Removal {
  category: Category;
  /** e.g. openai_key, email, iban, override, hidden_unicode */
  type: string;
  /** offsets (UTF-16 code units) into the ORIGINAL input; end exclusive */
  start: number;
  end: number;
  length: number;
  /** text that replaced the span in `sanitized` (never contains the removed value) */
  placeholder: string;
  source: 'rule' | 'llm';
}

export type RiskLevel = 'none' | 'low' | 'medium' | 'high';

export interface Risk {
  level: RiskLevel;
  reasons: string[];
}

export interface LlmStatus {
  status: 'not_used' | 'ok' | 'error';
  detail?: string;
}

export interface SanitizeResult {
  sanitized: string;
  removed: Removal[];
  risk: Risk;
  llm: LlmStatus;
  /** weak signals that were NOT removed (e.g. "curl | sh" in docs) */
  flagged: { type: string; start: number; end: number }[];
}

/** Raw detection from a rule, offsets into the text it was run on. */
export interface Span {
  category: Category;
  type: string;
  start: number;
  end: number;
}
