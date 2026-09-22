import type { Platform } from "./rules.ts";

/**
 * How a review gets reported and decided on each platform, step by step. The steps follow the platform's own help
 * pages, as set out on removeonestar.com's service pages (/trustpilot-review-removal and /google-review-removal).
 * Each step links to the page it comes from.
 */
export type ProcessStep = { step: number; title: string; detail: string; sourceUrl: string };
export type RemovalProcess = { platform: Platform; summary: string; steps: ProcessStep[]; pageUrl: string };

const TP_FLAG = "https://help.trustpilot.com/s/article/How-to-flag-service-reviews-from-your-business-account?language=en_US";
const TP_APPEAL = "https://help.trustpilot.com/s/article/How-can-I-dispute-a-decision-made-by-the-Content-Integrity-Team?language=en_US";
const G_REPORT = "https://support.google.com/business/answer/4596773";

const PROCESS: Record<Platform, RemovalProcess> = {
  trustpilot: {
    platform: "trustpilot",
    summary: "Any business with a claimed profile can flag a review for free. Trustpilot assesses the one reason you choose, and decides.",
    pageUrl: "https://www.removeonestar.com/trustpilot-review-removal",
    steps: [
      ["Claim the profile and log in to Trustpilot Business", "Flags are only accepted from a business account.", TP_FLAG],
      ["Open Manage reviews, then Service reviews, then Inbox", "Find the review there.", TP_FLAG],
      ["Click the flag icon and choose one reason", "There are five, and Trustpilot assesses only the one you pick.", TP_FLAG],
      ["Read the guideline it shows you and confirm", "Confirm that you want to continue.", TP_FLAG],
      ["Highlight the words that break the rule", "Trustpilot looks at what you highlight.", TP_FLAG],
      ["Do the first step if the reason has one", "Personal information and different business flags start with an edit request to the reviewer. A genuine experience flag starts with Request information. The reviewer has 3 days.", TP_FLAG],
      ["Confirm you understand misuse is a breach of the guidelines, and submit", "Only a harmful or illegal flag hides the review while it is assessed.", TP_FLAG],
      ["Wait for the email with the outcome", "You can appeal a decision once if you have new facts. Do not flag the same review again.", TP_APPEAL],
    ].map(([title, detail, sourceUrl], i) => ({ step: i + 1, title, detail, sourceUrl })),
  },
  google: {
    platform: "google",
    summary: "A business reports a review from its Business Profile or the Reviews Management Tool. Google evaluates it, and a business gets one appeal.",
    pageUrl: "https://www.removeonestar.com/google-review-removal",
    steps: [
      ["Report from the profile", "Go to your Business Profile, select Read reviews, select Report next to the review, choose the reason and send.", G_REPORT],
      ["Or report from the Reviews Management Tool", "Confirm the account that manages the profile, select the business, choose to report a new review, and pick the reason.", G_REPORT],
      ["Google evaluates the report", "Google says review evaluation typically takes several days.", G_REPORT],
      ["Check the status", "\"Decision pending\" means it has not been looked at yet. \"Report reviewed - no policy violation\" means Google kept the review. \"Escalated - check your email for updates\" means an appeal is in progress or decided.", G_REPORT],
      ["Appeal once", "In the tool, choose to check reviews you reported, select \"Appeal eligible reviews\", pick up to 10, and fill in the form. Google emails the result.", G_REPORT],
      ["The outcome", "If Google finds a breach, the review is removed from Maps and Search. If not, it stays, and that review has no further route through the tool.", G_REPORT],
    ].map(([title, detail, sourceUrl], i) => ({ step: i + 1, title, detail, sourceUrl })),
  },
};

/** The reporting steps for one platform, each with the page it comes from. */
export function removalProcess(platform: Platform): RemovalProcess {
  const process = PROCESS[platform];
  if (!process) throw new TypeError(`review-rule-check: platform must be "trustpilot" or "google", not ${JSON.stringify(platform)}`);
  return process;
}
