# review-rule-check

Check the text of a Trustpilot or Google review against the platform's published rules.

`review-rule-check` reads a review and tells you which rule it may break, which words matched, and whether it looks
**worth flagging**, **needs a human look** or **likely stays**. It covers Trustpilot's flagging reasons and Google
Maps' prohibited and restricted content policy.

**It is a heuristic.** It looks for patterns in the words, like a promo code, a phone number or "never used them". It
cannot see facts outside the text: who wrote the review, when, or from which account. It finds some rule breaks and
misses others, and it never predicts an outcome. **Trustpilot decides every flag, and Google decides every report.**

Zero runtime dependencies. ESM and CommonJS. Types included. Node 18 or later, and it runs in the browser too.

## Install

```sh
npm install review-rule-check
```

Or run it without installing:

```sh
npx review-rule-check "Use code SAVE20 at the other shop" --platform trustpilot
```

## Use it in code

```js
import { checkReview, checkMany, explain, rules } from "review-rule-check";

const result = checkReview({ platform: "trustpilot", text: "Support was useless. Call the agent on 555-0142." });
result.verdict;             // "worth-flagging"
result.rules[0].name;       // "Personal information"
result.matches[0].label;    // "A phone number"
result.matches[0].text;     // "555-0142"
result.rules[0].pageUrl;    // "https://www.removeonestar.com/trustpilot-guidelines/personal-information"

const many = checkMany("google", ["Use code SAVE20", { text: "Lovely staff", stars: 5 }]);
many.totals;                // { "worth-flagging": 1, "needs-human": 0, "likely-stays": 1 }

explain("google-conflict"); // the rule: name, plain-words policy, a quote, the source link, the date it was read
rules.length;               // 20
```

CommonJS works the same way: `const { checkReview } = require("review-rule-check")`.

### What you get back

| Field | Meaning |
| --- | --- |
| `verdict` | `"worth-flagging"` when a strong signal matched, `"needs-human"` when only weak ones did, `"likely-stays"` when none did |
| `matches` | Every signal that matched, strongest first: `signal`, `label`, `rule`, `ruleId`, `strength` (`"strong"` or `"weak"`) and the matched `text` |
| `rules` | The rules those signals point at, once each, with the full rule object |
| `stars` | The star rating you passed, if it was 1 to 5 |

A strong signal shows the problem in the text on its own, like an email address or "they paid me to write this". A
weak one depends on context: a doctor named in full is allowed on Google, and "fraud" is usually an opinion.

## Use it from the command line

```sh
npx review-rule-check "Never used them, but my cousin says they are crooks" --platform trustpilot
npx review-rule-check --csv reviews.csv --platform google          # a table
npx review-rule-check --csv reviews.csv --platform google --json   # JSON
cat reviews.txt | npx review-rule-check --csv - --platform trustpilot
npx review-rule-check --rules --platform google
npx review-rule-check --explain trustpilot-advertising
npx review-rule-check --version
```

CSV input needs a header row with a `text` (or `review`) column, and may have `stars` and `date` columns. A plain
file with one review per line works too. The first 200 reviews are read.

## The rules

Each rule carries a short quote from the platform's own page, the link to that page, the date the quote was
checked, and `evidence`: what a report under that rule needs to show.

<!-- rules -->

## Also from Remove One Star

- [review-rules-mcp](https://www.removeonestar.com/developers): the same checks as tools for AI assistants (MCP).
- A free REST API and a browser extension: [removeonestar.com/developers](https://www.removeonestar.com/developers).

## Licence

MIT. See [LICENSE](LICENSE).

---

Maintained by Remove One Star ([removeonestar.com](https://www.removeonestar.com)). If you want a real count of which
reviews on your own profile break a rule, ask for a [free audit](https://www.removeonestar.com/contact).
