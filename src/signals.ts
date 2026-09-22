import { explain, type GoogleRuleKey, type Platform, type Rule, type TrustpilotRuleKey } from "./rules.ts";

/**
 * The signals: patterns in the text of a review that point at one platform rule each, with a strength. This is a
 * transparent heuristic. Every match is returned with the words that matched, and nothing is scored as certain. The
 * platform makes every decision.
 *
 * Strong: the text on its own shows the kind of content the rule removes (an email address, a promo code, "never used
 * them"). Weak: the text points at a rule, but whether it breaks it depends on context or on facts outside the review
 * (a first and last name could be a doctor who trades under it; "fraud" is usually opinion).
 */
export type Strength = "strong" | "weak";
type Target<K extends string> = { rule: K; strength: Strength } | null;

export type Signal = {
  id: string;
  /** What the signal looks for, in the words shown next to a match. */
  label: string;
  pattern: RegExp;
  trustpilot: Target<TrustpilotRuleKey>;
  google: Target<GoogleRuleKey>;
  /** A match on this pattern is ignored (a false-positive guard), for example "order 555-0142". */
  unless?: RegExp;
};

/**
 * A few slurs, stored in ROT13 so the source file does not print them. The page says the list exists and is short.
 * The "[slur]" placeholder used in the site's own examples counts as one too.
 */
const rot13 = (s: string) => s.replace(/[a-z]/g, (c) => String.fromCharCode(((c.charCodeAt(0) - 97 + 13) % 26) + 97));
const SLURS = ["snttbg", "snt", "avttre", "avttn", "ergneq", "genaal", "xvxr", "fcvp", "puvax", "jrgonpx", "pbba", "qlxr"].map(rot13);
const PROFANITY = ["shpx", "shpxvat", "fuvg", "ohyyfuvg", "ovgpu", "onfgneq", "phag", "nffubyr", "qvpx"].map(rot13);
const words = (list: string[]) => new RegExp(`\\b(${list.join("|")})\\b`, "i");

export const SIGNALS: Signal[] = [
  // Advertising and promotion.
  {
    id: "promo-code",
    label: "A promo, discount, coupon or referral code",
    pattern: /\b([Pp]romo|[Dd]iscount|[Cc]oupon|[Rr]eferral|[Vv]oucher)\s+code\b|\b([Uu]se|[Ee]nter|[Aa]pply)\s+(the\s+)?code\b|\bcode\s+[A-Z][A-Z0-9]{3,}\b/,
    trustpilot: { rule: "advertising", strength: "strong" },
    google: { rule: "advertising", strength: "strong" },
    unless: /\b(no|the|their|your|a|my)\s+(promo|discount|coupon)\s+code\s+(did(n'?t| not)|would(n'?t| not)|was|is|never|failed|expired)\b/i,
  },
  {
    id: "link",
    label: "A web link",
    pattern: /\bhttps?:\/\/\S+|\bwww\.[a-z0-9-]+\.[a-z]{2,}\S*/i,
    trustpilot: { rule: "advertising", strength: "strong" },
    google: { rule: "advertising", strength: "strong" },
  },
  {
    id: "domain",
    label: "A website address without a link",
    pattern: /(?<![@\w.-])[a-z0-9][a-z0-9-]{1,40}\.(com|net|org|io|co|shop|store|health|example)\b/i,
    trustpilot: { rule: "advertising", strength: "weak" },
    google: { rule: "advertising", strength: "strong" },
  },
  {
    id: "contact-me",
    label: "A call to contact the reviewer",
    pattern: /\b(message|text|dm|call|email|e-mail|contact|whatsapp|ping)\s+me\b|\bhit me up\b/i,
    trustpilot: { rule: "advertising", strength: "strong" },
    google: { rule: "advertising", strength: "strong" },
  },
  {
    id: "affiliate",
    label: "A referral or affiliate link offer",
    pattern: /\b(referral|affiliate|invite)\s+link\b|\bsign up (through|with|using) my\b/i,
    trustpilot: { rule: "advertising", strength: "strong" },
    google: { rule: "advertising", strength: "strong" },
  },
  {
    id: "go-elsewhere",
    label: "Sends readers to another business",
    pattern: /\b(go|switch|buy)\s+(to|from|with)\s+[^.!?]{1,40}\binstead\b/i,
    trustpilot: { rule: "advertising", strength: "weak" },
    google: { rule: "advertising", strength: "weak" },
  },
  {
    id: "sells-meds",
    label: "Offers to sell prescription medicine",
    pattern: /\bno (prescription|script|rx)\s+(needed|required)\b|\bwithout a (prescription|script)\b|\bI (sell|can get you|ship)\b/i,
    trustpilot: { rule: "advertising", strength: "strong" },
    google: { rule: "restricted", strength: "strong" },
  },

  // Personal information.
  {
    id: "email",
    label: "An email address",
    pattern: /\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/i,
    trustpilot: { rule: "personal", strength: "strong" },
    google: { rule: "personal", strength: "strong" },
  },
  {
    id: "phone",
    label: "A phone number",
    pattern: /(?<![\d#$])(\+?1[\s.-]?)?(\(\d{3}\)\s?|\d{3}[\s.-])?\d{3}[\s.-]\d{4}(?!\d)/,
    trustpilot: { rule: "personal", strength: "strong" },
    google: { rule: "personal", strength: "strong" },
    unless: /\b(order|ref|reference|invoice|ticket|case|tracking|account|rx)\s*(number|no\.?|#)?\s*:?\s*(\+?1[\s.-]?)?(\(\d{3}\)\s?|\d{3}[\s.-])?\d{3}[\s.-]\d{4}/i,
  },
  {
    id: "named-person",
    label: "Someone else's first and last name",
    // Case matters for the name (two capitalised words), not for the words before it.
    pattern: /\b([Hh]er|[Hh]is|[Tt]heir|[Tt]he (agent|rep|nurse|pharmacist|receptionist|manager)'?s?)\s+name\s+(is|was)\s+[A-Z][a-z]+\s+[A-Z][a-z]+\b|\b(agent|rep|nurse|pharmacist|receptionist|manager|employee|staff member)\s+(is |was )?(called|named|is|was)\s+[A-Z][a-z]+\s+[A-Z][a-z]+\b/,
    trustpilot: { rule: "personal", strength: "strong" },
    google: { rule: "personal", strength: "strong" },
  },
  {
    id: "doctor-named",
    label: "A clinician named in full",
    pattern: /\b(Dr\.?|Doctor|NP|PA)\s+[A-Z][a-z]+\s+[A-Z][a-z]+\b/,
    // Google allows professionals who do business under their own name; Trustpilot counts an employee's name as
    // personal information. Either way it is a judgment call, so a human looks.
    trustpilot: { rule: "personal", strength: "weak" },
    google: { rule: "personal", strength: "weak" },
  },
  {
    id: "home-address",
    label: "Where someone lives",
    pattern: /\b(she|he|they)\s+lives?\s+(on|at|in)\b|\b\d{1,5}\s+[A-Z][a-z]+\s+(Street|St|Avenue|Ave|Road|Rd|Lane|Ln|Drive|Dr)\b/,
    trustpilot: { rule: "personal", strength: "strong" },
    google: { rule: "personal", strength: "strong" },
  },
  {
    id: "health-details",
    label: "Another person's medical details",
    pattern: /\b(her|his|their)\s+(diagnosis|prescription|medical record|test results|hiv status|condition)\b/i,
    trustpilot: { rule: "personal", strength: "weak" },
    google: { rule: "personal", strength: "strong" },
  },

  // No genuine experience, conflicts and incentives.
  {
    id: "never-used",
    label: "Says they never used the business",
    pattern: /\b(never|not once)\s+(used|tried|ordered from|bought from|been to|visited|been a (customer|patient|client) of)\b|\b(never|not)\s+(been\s+)?(a|their)\s+(customer|patient|client)\b(?!\s+(service|support|care|portal))|\bhaven'?t (used|tried) (them|it|this)\b/i,
    trustpilot: { rule: "genuine", strength: "strong" },
    google: { rule: "fake", strength: "strong" },
  },
  {
    id: "second-hand",
    label: "Describes someone else's experience",
    pattern: /\b(my|a)\s+(friend|cousin|brother|sister|mother|mom|father|dad|neighbou?r|coworker|colleague|aunt|uncle)\s+(says|said|told me|heard)\b|\bI('ve| have)? heard (that|they|from)\b/i,
    trustpilot: { rule: "genuine", strength: "weak" },
    google: { rule: "fake", strength: "weak" },
  },
  {
    id: "competitor",
    label: "The writer works for or runs a competitor",
    pattern: /\bI\s+(work|worked)\s+(at|for)\s+(a|the|another)\s+(rival|competitor|competing|different clinic|other clinic)\b|\bI\s+(own|run|manage)\s+(a|the)\s+(rival|competing)\b|\bI\s+(own|run)\s+the\s+[a-z ]{0,20}(clinic|pharmacy|practice|shop|store)\s+(across|down|next)\b/i,
    trustpilot: { rule: "genuine", strength: "strong" },
    google: { rule: "conflict", strength: "strong" },
  },
  {
    id: "staff",
    label: "The writer works or worked for the business",
    pattern: /\bI\s+(work|used to work|worked)\s+(here|there|for them|for this (company|clinic|business))\b|\b(former|ex-)\s?(employee|staff|worker)\b/i,
    // Trustpilot bars current employees; a former one can review. Google counts current and former employment.
    trustpilot: { rule: "genuine", strength: "weak" },
    google: { rule: "conflict", strength: "strong" },
  },
  {
    id: "paid-review",
    label: "Says the review was paid for or rewarded",
    pattern: /\b(paid|asked)\s+(me\s+)?to\s+(write|leave|post)\s+(this|a|the)\s+review\b|\bin exchange for\s+(this|a|my)\s+review\b|\b(gave|give|offered|sent)\s+(me|us)\s+(a\s+)?(discount|refund|gift card|free [a-z]+|\$\d+)[^.!?]{0,30}\bfor\s+(this|a|my|the)\s+review\b|\b(discount|refund|gift card)\s+for\s+(a|this|my)\s+(5.star\s+)?review\b/i,
    trustpilot: { rule: "incentivized", strength: "strong" },
    google: { rule: "fake", strength: "strong" },
  },
  {
    id: "review-for-hire",
    label: "Reads as a review written to order",
    pattern: /\bthis is a (paid|sponsored) review\b|\breview (exchange|swap)\b|\bwrote this for (a|my) client\b/i,
    trustpilot: { rule: "fake", strength: "strong" },
    google: { rule: "fake", strength: "strong" },
  },
  {
    id: "under-18",
    label: "The writer says they are under 18",
    pattern: /\bI('m| am)\s+(1[0-7]|thirteen|fourteen|fifteen|sixteen|seventeen)(\s+years old)?\b/i,
    trustpilot: { rule: "whoCanWrite", strength: "weak" },
    google: null,
  },
  {
    id: "old-experience",
    label: "The experience was years ago",
    pattern: /\b(back in|in)\s+(19\d\d|20[01]\d|202[0-4])\b|\b(\d+|two|three|four|five|several)\s+years\s+ago\b/i,
    trustpilot: { rule: "whoCanWrite", strength: "weak" },
    google: null,
  },

  // A different business, or off-topic.
  {
    id: "wrong-business",
    label: "Says it is about another business",
    pattern: /\bwrong (company|business|page|profile)\b|\b(meant|posted) (this|it) (for|on) (the wrong|another|a different)\b/i,
    trustpilot: { rule: "different", strength: "strong" },
    google: { rule: "offTopic", strength: "strong" },
  },
  {
    id: "other-product",
    label: "Describes a product a health brand does not sell",
    pattern: /\b(sold me a car|transmission|car dealer|oil change|the pizza|the burger|hotel room|my flight|the handbag|insurance policy|mortgage)\b/i,
    trustpilot: { rule: "different", strength: "weak" },
    google: { rule: "offTopic", strength: "weak" },
  },
  {
    id: "politics-news",
    label: "About politics or the news, not an experience",
    pattern: /\b(election|president|politics|political|democrats?|republicans?|liberals|conservatives|in the news|what (their|the) ceo said)\b/i,
    trustpilot: { rule: "advertising", strength: "weak" },
    google: { rule: "offTopic", strength: "weak" },
  },

  // Harmful, offensive and the rest.
  {
    id: "threat",
    label: "A threat of violence",
    pattern: /\bI('ll| will| am going to|'m going to)\s+(kill|hurt|find|come for|burn)\b|\b(watch your back|burn (it|the place|this place) down|should be (shot|killed|hanged|beaten))\b|\byou('ll| will) (regret|pay for) (this|it)\b/i,
    trustpilot: { rule: "harmful", strength: "strong" },
    google: { rule: "offensive", strength: "strong" },
  },
  {
    id: "slur",
    label: "A slur (from a short list we do not print)",
    pattern: new RegExp(`\\[slur\\]|${words(SLURS).source}`, "i"),
    trustpilot: { rule: "harmful", strength: "strong" },
    google: { rule: "offensive", strength: "strong" },
  },
  {
    id: "profanity",
    label: "Profanity",
    pattern: words(PROFANITY),
    // Trustpilot will not remove a review for swear words alone. Google lists profanity used to offend.
    trustpilot: { rule: "harmful", strength: "weak" },
    google: { rule: "offensive", strength: "weak" },
  },
  {
    id: "crime-claim",
    label: "Accuses the business of a crime",
    pattern: /\b(fraud|criminals?|crooks?|thie(f|ves)|money laundering|illegal operation|drug dealers?)\b|\bshould be (locked up|in jail|arrested)\b/i,
    // Usually opinion. Google counts an unsubstantiated allegation as offensive content; Trustpilot keeps opinion.
    trustpilot: { rule: "harmful", strength: "weak" },
    google: { rule: "offensive", strength: "weak" },
  },
  {
    id: "official-notice",
    label: "Poses as an official notice",
    pattern: /\b(official (notice|statement|warning))\b|\b(the )?(FDA|FBI|DEA|police|state board)\s+(is|are|has)\s+(investigating|shut|raided)\b/i,
    trustpilot: null,
    google: { rule: "impersonation", strength: "weak" },
  },
  {
    id: "dangerous-dose",
    label: "Instructions for unsafe use",
    pattern: /\b(two|three|four|five|double|triple|\d+)\s+times\s+the\s+(label|recommended|prescribed)?\s*dose\b|\b(double|triple)\s+the\s+(label|recommended|prescribed)?\s*dose\b|\bhow to (make|cook|take)\b[^.!?]{0,40}\b(on your own|at home|without a doctor)\b/i,
    trustpilot: { rule: "harmful", strength: "weak" },
    google: { rule: "dangerous", strength: "strong" },
  },
  {
    id: "sealed-or-copyright",
    label: "Sealed court papers or copied text",
    pattern: /\b(under seal|sealed (court )?(document|record|filing)|court order|copyrighted)\b/i,
    trustpilot: { rule: "harmful", strength: "weak" },
    google: { rule: "illegal", strength: "weak" },
  },
  {
    id: "explicit",
    label: "Sexually explicit content",
    pattern: /\[sexually explicit|\bsexually explicit\b|\b(sex acts?|porn|nude photos?)\b/i,
    trustpilot: { rule: "harmful", strength: "weak" },
    google: { rule: "explicit", strength: "strong" },
  },
  {
    id: "terror",
    label: "Praise of terrorism",
    pattern: /\b(praising|praise|glory to|long live|celebrat\w*)\b[^.!?]{0,40}\b(terror\w*|attack|jihad)\b|\b(isis|al[- ]qaeda)\b/i,
    trustpilot: { rule: "harmful", strength: "strong" },
    google: { rule: "terrorist", strength: "strong" },
  },
];

export type Verdict = "worth-flagging" | "needs-human" | "likely-stays";
export const VERDICT_LABEL: Record<Verdict, string> = { "worth-flagging": "Worth flagging", "needs-human": "Needs a human look", "likely-stays": "Likely stays" };

export type Match = {
  /** The signal's id, such as "promo-code". */
  signal: string;
  /** What the signal looks for, in words. */
  label: string;
  /** The rule's key within its platform, such as "advertising". */
  rule: string;
  /** The rule's full id, such as "trustpilot-advertising". */
  ruleId: string;
  strength: Strength;
  /** The words in the review that matched. */
  text: string;
};

export type CheckResult = {
  platform: Platform;
  verdict: Verdict;
  /** Every signal that matched, strongest first. */
  matches: Match[];
  /** The rules those signals point at, once each, in the order of the matches. */
  rules: Rule[];
  stars: number | null;
};

export type CheckInput = { platform: Platform; text: string; stars?: number | null };

const PLATFORMS: readonly Platform[] = ["trustpilot", "google"];

/** Checks one review's text against every signal for one platform. */
export function checkReview({ platform, text, stars = null }: CheckInput): CheckResult {
  if (!PLATFORMS.includes(platform)) throw new TypeError(`review-rule-check: platform must be "trustpilot" or "google", not ${JSON.stringify(platform)}`);
  if (typeof text !== "string") throw new TypeError("review-rule-check: text must be a string");
  const matches: Match[] = [];
  for (const signal of SIGNALS) {
    const target = signal[platform];
    if (!target) continue;
    const found = text.match(signal.pattern);
    if (!found) continue;
    if (signal.unless && signal.unless.test(text)) continue;
    matches.push({ signal: signal.id, label: signal.label, rule: target.rule, ruleId: `${platform}-${target.rule}`, strength: target.strength, text: found[0].trim() });
  }
  // Strong matches first; within a strength, the order of SIGNALS.
  matches.sort((a, b) => (a.strength === b.strength ? 0 : a.strength === "strong" ? -1 : 1));
  const verdict: Verdict = matches.some((m) => m.strength === "strong") ? "worth-flagging" : matches.length ? "needs-human" : "likely-stays";
  const ids = [...new Set(matches.map((m) => m.ruleId))];
  return { platform, verdict, matches, rules: ids.map((id) => explain(id) as Rule), stars: typeof stars === "number" && stars >= 1 && stars <= 5 ? stars : null };
}

export type ManyResult = { platform: Platform; results: CheckResult[]; totals: Record<Verdict, number> };

/** Checks many reviews for one platform. Each review is a string or an object with text and, optionally, stars. */
export function checkMany(platform: Platform, reviews: readonly (string | { text: string; stars?: number | null })[]): ManyResult {
  const results = reviews.map((review) => (typeof review === "string" ? checkReview({ platform, text: review }) : checkReview({ platform, text: review.text, stars: review.stars ?? null })));
  const totals: Record<Verdict, number> = { "worth-flagging": 0, "needs-human": 0, "likely-stays": 0 };
  for (const result of results) totals[result.verdict] += 1;
  return { platform, results, totals };
}
