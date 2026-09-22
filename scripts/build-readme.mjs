// Writes README.md from README.template.md, filling the rule list from src/rules.ts, so the README cannot list a rule
// the package does not have. --check fails if README.md is out of date.
import fs from "node:fs";

process.removeAllListeners("warning");
const { rulesFor } = await import("../src/rules.ts");
const section = (platform, title) => [
  `### ${title}`,
  "",
  "| Rule | Id | What it covers | Source |",
  "| --- | --- | --- | --- |",
  ...rulesFor(platform).map((r) => `| [${r.name}](${r.pageUrl}) | \`${r.id}\` | ${r.policy.split(". ")[0].replace(/\.$/, "")}. | [${r.sourceTitle.split(": ").pop()}](${r.sourceUrl}), read ${r.verified} |`),
  "",
].join("\n");
const readme = fs.readFileSync("README.template.md", "utf8").replace("<!-- rules -->", `${section("trustpilot", "Trustpilot")}\n${section("google", "Google")}`.trimEnd());
if (process.argv.includes("--check")) {
  if (!fs.existsSync("README.md") || fs.readFileSync("README.md", "utf8") !== readme) {
    console.log("packages/review-rule-check/README.md is out of date. Run node scripts/build-readme.mjs.");
    process.exit(1);
  }
  console.log("README is in step with src/rules.ts.");
} else {
  fs.writeFileSync("README.md", readme);
  console.log("README.md written.");
}
