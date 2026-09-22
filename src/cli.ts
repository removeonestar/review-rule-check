/**
 * review-rule-check CLI.
 *
 *   npx review-rule-check "Use code SAVE20 at the other shop" --platform trustpilot
 *   npx review-rule-check --csv reviews.csv --platform google --json
 *   cat reviews.txt | npx review-rule-check --csv - --platform trustpilot
 *   npx review-rule-check --rules --platform google
 *   npx review-rule-check --explain trustpilot-advertising
 *
 * A heuristic: it reads words, not facts. Trustpilot and Google decide every report.
 */
import { DISCLAIMER, VERDICT_LABEL, checkMany, explain, parseReviews, rules, rulesFor, type CheckResult, type Platform } from "./index.ts";

/** The package version. test/cli.test.ts checks it matches package.json. */
export const VERSION = "0.1.0";

const HELP = `review-rule-check: check review text against Trustpilot's or Google's published rules.

Usage
  review-rule-check "review text" --platform trustpilot|google [--json]
  review-rule-check --csv <file|-> --platform trustpilot|google [--json]
  review-rule-check --rules [--platform trustpilot|google] [--json]
  review-rule-check --explain <rule-id> [--json]
  review-rule-check --version

CSV input needs a header row with a "text" (or "review") column, and may have "stars" and "date".
A plain text file, one review per line, works too.

${DISCLAIMER}
Free audit of a whole profile: https://www.removeonestar.com/contact`;

export type CliIO = { out: (line: string) => void; err: (line: string) => void; readFile: (path: string) => string };

/** Runs the CLI and returns its exit code. Exported for the tests; the bin calls it with the real process. */
export function run(argv: string[], io: CliIO): number {
  const flags = new Map<string, string | true>();
  const words: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--json" || arg === "--rules" || arg === "--help" || arg === "-h" || arg === "--version" || arg === "-v") flags.set(arg, true);
    else if (arg === "--platform" || arg === "--csv" || arg === "--explain") {
      const value = argv[i + 1];
      if (value === undefined) {
        io.err(`${arg} needs a value.\n\n${HELP}`);
        return 2;
      }
      flags.set(arg, value);
      i++;
    } else words.push(arg);
  }
  const json = flags.has("--json");
  if (flags.has("--version") || flags.has("-v")) {
    io.out(VERSION);
    return 0;
  }
  if (flags.has("--help") || flags.has("-h")) {
    io.out(HELP);
    return 0;
  }

  const platformFlag = flags.get("--platform");
  if (platformFlag !== undefined && platformFlag !== "trustpilot" && platformFlag !== "google") {
    io.err(`--platform must be trustpilot or google, not "${String(platformFlag)}".`);
    return 2;
  }
  const platform = platformFlag as Platform | undefined;

  if (flags.has("--explain")) {
    const rule = explain(String(flags.get("--explain")), platform);
    if (!rule) {
      io.err(`No rule "${String(flags.get("--explain"))}". Run review-rule-check --rules to list them.`);
      return 1;
    }
    io.out(json ? JSON.stringify(rule, null, 2) : [`${rule.name} (${rule.id})`, "", rule.policy, "", `"${rule.quote}"`, `Source: ${rule.sourceTitle}, ${rule.sourceUrl} (read ${rule.verified})`, `More: ${rule.pageUrl}`].join("\n"));
    return 0;
  }

  if (flags.has("--rules")) {
    const list = platform ? rulesFor(platform) : [...rules];
    io.out(json ? JSON.stringify(list, null, 2) : list.map((rule) => `${rule.id.padEnd(26)} ${rule.name}\n${"".padEnd(26)} ${rule.sourceUrl}`).join("\n"));
    return 0;
  }

  if (!platform) {
    io.err(`--platform is required: trustpilot or google.\n\n${HELP}`);
    return 2;
  }

  let reviews: { text: string; stars: number | null }[];
  const csvPath = flags.get("--csv");
  if (csvPath !== undefined) {
    let input: string;
    try {
      input = io.readFile(String(csvPath));
    } catch {
      io.err(`Could not read ${String(csvPath)}.`);
      return 1;
    }
    reviews = parseReviews(input).reviews.map(({ text, stars }) => ({ text, stars }));
  } else if (words.length) {
    reviews = [{ text: words.join(" "), stars: null }];
  } else {
    io.err(`Give some review text, or --csv <file>.\n\n${HELP}`);
    return 2;
  }

  const result = checkMany(platform, reviews);
  if (json) {
    io.out(JSON.stringify({ ...result, note: DISCLAIMER }, null, 2));
    return 0;
  }
  const row = (r: CheckResult, i: number) => {
    const top = r.matches[0];
    const text = reviews[i].text;
    return [
      `${String(i + 1).padStart(3)}  ${VERDICT_LABEL[r.verdict].padEnd(18)} ${text.length > 70 ? `${text.slice(0, 69)}…` : text}`,
      top ? `     ${r.rules.map((rule) => rule.name).join(", ")}: ${top.label} ("${top.text}")\n     ${r.rules[0].pageUrl}` : "     No signal.",
    ].join("\n");
  };
  const { totals } = result;
  io.out(
    [
      ...result.results.map(row),
      "",
      `${result.results.length} checked against ${platform === "google" ? "Google" : "Trustpilot"}: ${totals["worth-flagging"]} worth flagging, ${totals["needs-human"]} need a human look, ${totals["likely-stays"]} likely stay.`,
      DISCLAIMER,
    ].join("\n"),
  );
  return 0;
}
