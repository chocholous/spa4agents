import type { Case } from './build.ts';
import { holdoutBenign, holdoutCases } from './holdout.ts';
import { injectionBenign, injectionCases } from './injection.ts';
import { piiBenign, piiCases } from './pii.ts';
import { secretBenign, secretCases } from './secrets.ts';

export type { Case } from './build.ts';

export const corpus: Case[] = [
  ...secretCases, ...secretBenign,
  ...piiCases, ...piiBenign,
  ...injectionCases, ...injectionBenign,
  ...holdoutCases, ...holdoutBenign,
];
