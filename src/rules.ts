/**
 * The rule data. Every Trustpilot and Google rule this package names: its id, its name as the platform uses it, the
 * rule in plain words, a short quote from the platform's own page (copied word for word, with the page and the date
 * it was read), and the Remove One Star page that explains it.
 *
 * This file is the one source of truth. The package's checker, its CLI, the review-rules-mcp server, the public API,
 * the Chrome extension and every tool on removeonestar.com read their rules from here.
 */
export type Platform = "trustpilot" | "google";

export type Rule = {
  /** Unique across platforms: "trustpilot-advertising", "google-personal". */
  id: string;
  /** The key within its platform: "advertising", "personal". */
  key: string;
  platform: Platform;
  /** The rule's name as the platform uses it. */
  name: string;
  /** The rule in plain words: what the platform removes, and the limit it sets. */
  policy: string;
  /** A short quote from the platform's own page, word for word. */
  quote: string;
  /**
   * What a report of this rule needs, from the rule's page on removeonestar.com ("Evidence that supports a flag").
   * Three Trustpilot rules have no such section: a business flags them as "Not based on a genuine experience",
   * so they carry that rule's first two items.
   */
  evidence: string[];
  sourceTitle: string;
  sourceUrl: string;
  /** The day the quote was last checked against the live page. */
  verified: string;
  /** The page on removeonestar.com that explains the rule. */
  pageUrl: string;
};

const SITE = "https://www.removeonestar.com";
const TP_FLAG = { sourceTitle: "Trustpilot Help Center: For which reasons can businesses flag service reviews?", sourceUrl: "https://help.trustpilot.com/s/article/For-which-reasons-can-businesses-flag-service-reviews?language=en_US" };
const G_POLICY = { sourceTitle: "Google Maps User Generated Content Policy: Prohibited and restricted content", sourceUrl: "https://support.google.com/contributionpolicy/answer/7400114" };
const VERIFIED = "2026-09-22";

type Entry = Omit<Rule, "id" | "platform" | "pageUrl" | "verified"> & { path: string };
const make = (platform: Platform) => (entry: Entry): Rule => {
  const { path, ...rest } = entry;
  return { id: `${platform}-${entry.key}`, platform, ...rest, verified: VERIFIED, pageUrl: `${SITE}${path}` };
};

/** Trustpilot: the five reasons a business can flag a review for, and the three rules behind them. */
export const TRUSTPILOT_RULES = [
  {
    key: "advertising",
    name: "Advertising or promotional",
    path: "/trustpilot-guidelines/advertising-or-promotional",
    policy: "Trustpilot can remove reviews that promote another business or product, include promotional codes or calls to action, promote scams, or are spam. It will not remove a review just because it mentions or compares you with a competitor.",
    quote: "Promotes another business or product which isn’t related to the reviewer’s experience, including unauthorised advertisements, links to another business, promotional codes and calls to action.",
    evidence: [
      "The promotional words, highlighted. The code, the link, \"DM me\", \"link in bio\". Trustpilot assesses what you highlight.",
      "Nothing else. This is the one reason where your records add nothing.",
      "A search across every star rating. The same codes appear in 5-star reviews, often from a brand's own affiliates.",
    ],
    ...TP_FLAG,
  },
  {
    key: "personal",
    name: "Personal information",
    path: "/trustpilot-guidelines/personal-information",
    policy: "Trustpilot can remove another person's personal information such as a name, phone number, email address, or photos and videos of others. It will not act on information already on your profile or website, or on the reviewer's own details.",
    quote: "We can remove another person’s personal information such as someone’s name, phone number, email address, or photos/videos of others.",
    evidence: [
      "The highlighted detail. The name, number, address or image. That is the whole case.",
      "A note that it is not public. Check your website, your profile and your replies first. One sentence is enough: \"This agent's direct line is not published anywhere.\"",
      "Nothing from your records. You do not need to prove who the named person is.",
    ],
    ...TP_FLAG,
  },
  {
    key: "genuine",
    name: "Not based on a genuine experience",
    path: "/trustpilot-guidelines/genuine-experience",
    policy: "Trustpilot can remove a review if the reviewer was not eligible to write it, for example a current employee or a competitor, someone paid to write a fake review, or a review that is not about a recent experience of their own. It will not remove a review just because the person did not buy from you or you disagree with their version of events.",
    quote: "We can remove a review if the reviewer wasn’t eligible to write a review about your business (for example, if the reviewer is a current employee or a competitor, was paid to write a fake review, or the review isn’t about a recent experience)",
    evidence: [
      "The reviewer's own words. \"I work there.\" \"This happened to my brother.\" \"I have never used them, but...\"",
      "A fact about who the writer is. A public profile that ties them to a competitor. A name that matches a current member of staff.",
      "The outcome of Request information. What the reviewer said, or that nothing identified an experience.",
      "Account-level facts, stated plainly. No order, account or ticket under that name and date. State it. Do not attach records, and for a health brand never attach anything from a patient file.",
    ],
    ...TP_FLAG,
  },
  {
    key: "different",
    name: "About a different business",
    path: "/trustpilot-guidelines/different-business",
    policy: "Trustpilot can remove a review that clearly indicates it is for another business, or move one that belongs on another of your domains. It does not remove a review just because it is non-specific.",
    quote: "We can remove a review if it clearly indicates it’s for another business, like if it describes buying a handbag and your business sells insurance.",
    evidence: [
      "The words that point elsewhere, highlighted. The other company's name. A product you have never sold. A state you do not serve. A price you have never charged.",
      "One plain sentence of context. \"We have never sold a skin cream.\" Trustpilot can check that against your website.",
      "For the wrong-domain case, the domain the review belongs on.",
    ],
    ...TP_FLAG,
  },
  {
    key: "harmful",
    name: "Harmful or illegal",
    path: "/trustpilot-guidelines/harmful-or-illegal",
    policy: "Trustpilot can remove hate speech or discrimination, terrorism-related content, threats or violence, and obscenity. It will not remove a review just because it criticizes your business or includes swear words.",
    quote: "We can remove content that incites or glorifies harm. This includes descriptions and promotion of violence, threats of harm, abusive behavior, and promoting self-harm.",
    evidence: [
      "The words themselves. For the first four sub-reasons the evidence is the text. Highlight the threat, the slur or the explicit content, and nothing else.",
      "For defamation, three things. The statement of fact, proof that it is false, and the financial loss it caused. \"We lost customers\" is weaker than a cancelled contract that cites the review.",
      "The right sub-reason. Trustpilot assesses the sub-reason you choose. A threat flagged as obscenity can fail.",
    ],
    ...TP_FLAG,
  },
  {
    key: "fake",
    name: "Fake reviews",
    path: "/trustpilot-guidelines/fake-reviews",
    policy: "Trustpilot defines a fake review as one that does not reflect a genuine service or buying experience, positive or negative. Its examples are reviews from review sellers, reviews written to move a TrustScore, and reviews gathered through biased invitations.",
    quote: "Fake reviews: Fake reviews are strictly prohibited and will be removed.",
    evidence: [
      "Flag it under \"Not based on a genuine experience\".",
      "The reviewer's own words. \"I work there.\" \"This happened to my brother.\" \"I have never used them, but...\"",
      "A fact about who the writer is. A public profile that ties them to a competitor. A name that matches a current member of staff.",
    ],
    sourceTitle: "Trustpilot: Action We Take",
    sourceUrl: "https://legal.trustpilot.com/for-everyone/action-we-take",
  },
  {
    key: "incentivized",
    name: "Incentivized reviews",
    path: "/trustpilot-guidelines/incentivized-reviews",
    policy: "Trustpilot bans incentives for writing or editing reviews, such as discounts, promo codes, prize draws, refunds and freebies. A person who has received or been offered an incentive for a review is not eligible to write it.",
    quote: "Businesses are encouraged to invite customers to leave reviews, but invitations must be fair, neutral, and unbiased with no incentives offered.",
    evidence: [
      "Flag it under \"Not based on a genuine experience\".",
      "The reviewer's own words. \"I work there.\" \"This happened to my brother.\" \"I have never used them, but...\"",
      "A fact about who the writer is. A public profile that ties them to a competitor. A name that matches a current member of staff.",
    ],
    sourceTitle: "Trustpilot: Guidelines for Businesses",
    sourceUrl: "https://legal.trustpilot.com/for-businesses/guidelines-for-businesses",
  },
  {
    key: "whoCanWrite",
    name: "Who can write a review",
    path: "/trustpilot-guidelines/who-can-write-a-review",
    policy: "A person over 18 who has had a recent, genuine experience with a business can write a review about it. The experience does not have to be a purchase, and recent typically means within the last 12 months.",
    quote: "If you’re over 18 and you’ve had a recent, genuine experience with a business, you can write a review about it.",
    evidence: [
      "Flag it under \"Not based on a genuine experience\".",
      "The reviewer's own words. \"I work there.\" \"This happened to my brother.\" \"I have never used them, but...\"",
      "A fact about who the writer is. A public profile that ties them to a competitor. A name that matches a current member of staff.",
    ],
    sourceTitle: "Trustpilot: Guidelines for Reviewers",
    sourceUrl: "https://legal.trustpilot.com/for-reviewers/guidelines-for-reviewers",
  },
].map(make("trustpilot"));

/** Google: the categories on Google Maps' "Prohibited & restricted content" page. */
export const GOOGLE_RULES = [
  {
    key: "fake",
    name: "Spam and fake content",
    path: "/google-review-guidelines/spam-and-fake-content",
    policy: "Google's fake engagement policy covers content not based on a real experience, paid reviews, and content posted from multiple accounts by one person.",
    quote: "Contributions to Google Maps should reflect a genuine experience at a place or business. Fake engagement is not allowed and will be removed.",
    evidence: [
      "The pattern. Several reviews in a short window, from accounts with no history, often with the same phrases.",
      "The copy. The same text on another business's profile. Search a sentence in quotes to find it.",
      "The mismatch. A review of a service, a location or a staff member you do not have.",
      "The demand. If a message asked for money to stop the reviews, that is extortion, and Google has a separate form for it.",
    ],
    ...G_POLICY,
  },
  {
    key: "conflict",
    name: "Conflict of interest",
    path: "/google-review-guidelines/conflict-of-interest",
    policy: "Google removes content based on a conflict of interest. Its examples are current or former employment, a contractual or consulting relationship, competitors and family.",
    quote: "A conflict of interest may include current or former employment, a contractual or consultory relationship, or other professional or personal affiliations",
    evidence: [
      "Who the reviewer is. The name on the Google account, matched to a staff record or a public work profile.",
      "The tie. One line: employed here until March, owns the clinic two streets away, married to a former manager.",
      "The review's own words. Many give themselves away: \"when I worked there\", \"as someone in this industry\".",
      "Dates. A review posted the week someone was let go tells its own story.",
    ],
    ...G_POLICY,
  },
  {
    key: "offTopic",
    name: "Off-topic",
    path: "/google-review-guidelines/off-topic",
    policy: "Google asks for content based on an experience at a specific location, and does not allow general, political or social commentary or personal rants.",
    quote: "We don’t allow content which contains general, political, or social commentary or personal rants.",
    evidence: [
      "The sentence that shows it. \"Never been a patient\", \"I saw this on the news\", \"boycott\".",
      "The event. One line naming the news story or post that set it off, with its date.",
      "The wave. Off-topic reviews arrive together. List them together.",
    ],
    ...G_POLICY,
  },
  {
    key: "personal",
    name: "Personal information",
    path: "/google-review-guidelines/personal-information",
    policy: "Google bars posting another person's personal information without consent, such as a full name or last name, their face in a photo or video, and financial, medical or identification details. It allows the names of doctors and other professionals who do business under their name.",
    quote: "Do not distribute or post personal information without consent.",
    evidence: [
      "The detail, quoted: the full name, the number, the street, the diagnosis.",
      "Who it belongs to. A staff member, a patient other than the reviewer, a relative.",
      "No consent. One line saying the person did not agree. The person named can also report the review themselves.",
    ],
    ...G_POLICY,
  },
  {
    key: "offensive",
    name: "Offensive content",
    path: "/google-review-guidelines/offensive-content",
    policy: "Google removes specific threats of harm, doxxing, hate speech, attacks on individuals or groups, and profanity or obscenity used to offend or to emphasize criticism.",
    quote: "Content using profanity or obscenity to offend other users or emphasize criticism.",
    evidence: [
      "The words, quoted exactly.",
      "The target. A named member of staff makes a harassment case stronger than abuse aimed at \"them\".",
      "For an allegation, one line on what is missing: no visit described, no event, no date.",
    ],
    ...G_POLICY,
  },
  {
    key: "advertising",
    name: "Advertising and solicitation",
    path: "/google-review-guidelines/advertising-and-solicitation",
    policy: "Google bars promotional or commercial content in reviews, and bars email addresses, phone numbers, social media links and links to other websites.",
    quote: "Posting email addresses, phone numbers, social media links, or links to other websites in your reviews",
    evidence: [
      "The link, code, number or handle, quoted.",
      "Nothing else. This category rarely needs context. If the first report fails, the appeal can point to the exact characters.",
    ],
    ...G_POLICY,
  },
  {
    key: "restricted",
    name: "Restricted content",
    path: "/google-review-guidelines/restricted-content",
    policy: "Google bars calls to action and offers for the sale of regulated goods, including regulated pharmaceuticals and health and medical devices. That covers purchase links, contact details for buying, and deals or prices for them.",
    quote: "Email address and/or phone numbers to contact for the purchase of restricted goods.",
    evidence: [
      "The offer, quoted: what is for sale and how to buy it.",
      "The regulated product. One line: this is a prescription-only medicine.",
      "The contact route, which also breaks the advertising policy.",
    ],
    ...G_POLICY,
  },
  {
    key: "impersonation",
    name: "Impersonation",
    path: "/google-review-guidelines/impersonation",
    policy: "Google bars content that seeks to impersonate any person, group or organization, and content that pretends to be a verified authoritative source.",
    quote: "Content posted or shared seeking to impersonate any person, group, or organization.",
    evidence: [
      "The account name and what it pretends to be.",
      "Proof it is not them. A line from the real person or body, or a link to the real body's official channel.",
      "For a health claim, the sentence, and one line on why it could cause harm.",
    ],
    ...G_POLICY,
  },
  {
    key: "dangerous",
    name: "Dangerous content",
    path: "/google-review-guidelines/dangerous-content",
    policy: "Google bars content that facilitates or encourages serious physical harm to health, safety, property, animals or the environment, and instructional content for making dangerous items.",
    quote: "Content that promotes dangerous activities that could result in serious physical harm to the person committing the act, those around them, or animals.",
    evidence: [
      "The instruction or the encouragement, quoted.",
      "Why it is harmful. One plain line, such as the labeled maximum dose.",
    ],
    ...G_POLICY,
  },
  {
    key: "illegal",
    name: "Illegal content",
    path: "/google-review-guidelines/illegal-content",
    policy: "Google's content policies apply worldwide. In addition, anyone can report content they believe breaks local law, through Google's legal removal forms.",
    quote: "In addition, users can report content they believe is in violation of local law.",
    evidence: [
      "The law or the order. A court order, a copyright registration, or a lawyer's statement of the legal basis.",
      "The exact content, with its link.",
      "Your standing. Who you are and why the claim is yours to make.",
    ],
    sourceTitle: "Google Maps User Generated Content Policy: Legal Removals",
    sourceUrl: "https://support.google.com/contributionpolicy/answer/16426540",
  },
  {
    key: "explicit",
    name: "Sexually explicit content",
    path: "/google-review-guidelines/sexually-explicit-content",
    policy: "Google does not allow sexually explicit content, and its harassment policy covers unwanted sexualization of a person, including claims about a person's sexual activities.",
    quote: "Google Maps is a place for safe exploration of the world around us. For that reason, we don't allow sexually explicit content.",
    evidence: [
      "The passage, identified but not repeated at length.",
      "The person targeted, if there is one, and that they did not consent.",
    ],
    ...G_POLICY,
  },
  {
    key: "terrorist",
    name: "Terrorist content",
    path: "/google-review-guidelines/terrorist-content",
    policy: "Google Maps prohibits terrorist content, including content that incites violence, promotes terrorist acts or celebrates terrorist attacks.",
    quote: "Google Maps prohibits terrorist content and the use of this service by terrorist organizations for any purpose, including recruitment.",
    evidence: [
      "The passage, identified.",
      "The event it refers to, with the date.",
    ],
    ...G_POLICY,
  },
].map(make("google"));

/** Every rule, Trustpilot first. */
export const rules: readonly Rule[] = [...TRUSTPILOT_RULES, ...GOOGLE_RULES];

export type TrustpilotRuleKey = "advertising" | "personal" | "genuine" | "different" | "harmful" | "fake" | "incentivized" | "whoCanWrite";
export type GoogleRuleKey = "fake" | "conflict" | "offTopic" | "personal" | "offensive" | "advertising" | "restricted" | "impersonation" | "dangerous" | "illegal" | "explicit" | "terrorist";

/** The rules for one platform, in the order the platform lists them. */
export function rulesFor(platform: Platform): Rule[] {
  return rules.filter((rule) => rule.platform === platform);
}

/**
 * One rule, with everything known about it. Accepts a full id ("trustpilot-advertising") or a key and a platform
 * ("advertising", "trustpilot"). Returns undefined for an id it does not know.
 */
export function explain(ruleId: string, platform?: Platform): Rule | undefined {
  return rules.find((rule) => rule.id === ruleId) ?? (platform ? rules.find((rule) => rule.platform === platform && rule.key === ruleId) : undefined);
}
