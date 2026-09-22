/**
 * review-rule-check: checks the text of a Trustpilot or Google review against the platform's published rules.
 *
 * A transparent heuristic. It reads words, not facts, returns the words that matched, and never predicts a decision:
 * Trustpilot and Google decide every report. Maintained by Remove One Star (https://www.removeonestar.com).
 */
export { rules, rulesFor, explain, TRUSTPILOT_RULES, GOOGLE_RULES, type Rule, type Platform, type TrustpilotRuleKey, type GoogleRuleKey } from "./rules.ts";
export { SIGNALS, VERDICT_LABEL, checkReview, checkMany, type Signal, type Strength, type Verdict, type Match, type CheckResult, type CheckInput, type ManyResult } from "./signals.ts";
export { removalProcess, type ProcessStep, type RemovalProcess } from "./process.ts";
export { MAX_REVIEWS, parseReviews, csvCell, type ParsedReview } from "./csv.ts";

/** The line every result from this package's tools carries. */
export const DISCLAIMER = "Heuristic from removeonestar.com; the platform makes the decision.";
