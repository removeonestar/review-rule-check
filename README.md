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

### Trustpilot

| Rule | Id | What it covers | Source |
| --- | --- | --- | --- |
| [Advertising or promotional](https://www.removeonestar.com/trustpilot-guidelines/advertising-or-promotional) | `trustpilot-advertising` | Trustpilot can remove reviews that promote another business or product, include promotional codes or calls to action, promote scams, or are spam. | [For which reasons can businesses flag service reviews?](https://help.trustpilot.com/s/article/For-which-reasons-can-businesses-flag-service-reviews?language=en_US), read 2026-09-22 |
| [Personal information](https://www.removeonestar.com/trustpilot-guidelines/personal-information) | `trustpilot-personal` | Trustpilot can remove another person's personal information such as a name, phone number, email address, or photos and videos of others. | [For which reasons can businesses flag service reviews?](https://help.trustpilot.com/s/article/For-which-reasons-can-businesses-flag-service-reviews?language=en_US), read 2026-09-22 |
| [Not based on a genuine experience](https://www.removeonestar.com/trustpilot-guidelines/genuine-experience) | `trustpilot-genuine` | Trustpilot can remove a review if the reviewer was not eligible to write it, for example a current employee or a competitor, someone paid to write a fake review, or a review that is not about a recent experience of their own. | [For which reasons can businesses flag service reviews?](https://help.trustpilot.com/s/article/For-which-reasons-can-businesses-flag-service-reviews?language=en_US), read 2026-09-22 |
| [About a different business](https://www.removeonestar.com/trustpilot-guidelines/different-business) | `trustpilot-different` | Trustpilot can remove a review that clearly indicates it is for another business, or move one that belongs on another of your domains. | [For which reasons can businesses flag service reviews?](https://help.trustpilot.com/s/article/For-which-reasons-can-businesses-flag-service-reviews?language=en_US), read 2026-09-22 |
| [Harmful or illegal](https://www.removeonestar.com/trustpilot-guidelines/harmful-or-illegal) | `trustpilot-harmful` | Trustpilot can remove hate speech or discrimination, terrorism-related content, threats or violence, and obscenity. | [For which reasons can businesses flag service reviews?](https://help.trustpilot.com/s/article/For-which-reasons-can-businesses-flag-service-reviews?language=en_US), read 2026-09-22 |
| [Fake reviews](https://www.removeonestar.com/trustpilot-guidelines/fake-reviews) | `trustpilot-fake` | Trustpilot defines a fake review as one that does not reflect a genuine service or buying experience, positive or negative. | [Action We Take](https://legal.trustpilot.com/for-everyone/action-we-take), read 2026-09-22 |
| [Incentivized reviews](https://www.removeonestar.com/trustpilot-guidelines/incentivized-reviews) | `trustpilot-incentivized` | Trustpilot bans incentives for writing or editing reviews, such as discounts, promo codes, prize draws, refunds and freebies. | [Guidelines for Businesses](https://legal.trustpilot.com/for-businesses/guidelines-for-businesses), read 2026-09-22 |
| [Who can write a review](https://www.removeonestar.com/trustpilot-guidelines/who-can-write-a-review) | `trustpilot-whoCanWrite` | A person over 18 who has had a recent, genuine experience with a business can write a review about it. | [Guidelines for Reviewers](https://legal.trustpilot.com/for-reviewers/guidelines-for-reviewers), read 2026-09-22 |

### Google

| Rule | Id | What it covers | Source |
| --- | --- | --- | --- |
| [Spam and fake content](https://www.removeonestar.com/google-review-guidelines/spam-and-fake-content) | `google-fake` | Google's fake engagement policy covers content not based on a real experience, paid reviews, and content posted from multiple accounts by one person. | [Prohibited and restricted content](https://support.google.com/contributionpolicy/answer/7400114), read 2026-09-22 |
| [Conflict of interest](https://www.removeonestar.com/google-review-guidelines/conflict-of-interest) | `google-conflict` | Google removes content based on a conflict of interest. | [Prohibited and restricted content](https://support.google.com/contributionpolicy/answer/7400114), read 2026-09-22 |
| [Off-topic](https://www.removeonestar.com/google-review-guidelines/off-topic) | `google-offTopic` | Google asks for content based on an experience at a specific location, and does not allow general, political or social commentary or personal rants. | [Prohibited and restricted content](https://support.google.com/contributionpolicy/answer/7400114), read 2026-09-22 |
| [Personal information](https://www.removeonestar.com/google-review-guidelines/personal-information) | `google-personal` | Google bars posting another person's personal information without consent, such as a full name or last name, their face in a photo or video, and financial, medical or identification details. | [Prohibited and restricted content](https://support.google.com/contributionpolicy/answer/7400114), read 2026-09-22 |
| [Offensive content](https://www.removeonestar.com/google-review-guidelines/offensive-content) | `google-offensive` | Google removes specific threats of harm, doxxing, hate speech, attacks on individuals or groups, and profanity or obscenity used to offend or to emphasize criticism. | [Prohibited and restricted content](https://support.google.com/contributionpolicy/answer/7400114), read 2026-09-22 |
| [Advertising and solicitation](https://www.removeonestar.com/google-review-guidelines/advertising-and-solicitation) | `google-advertising` | Google bars promotional or commercial content in reviews, and bars email addresses, phone numbers, social media links and links to other websites. | [Prohibited and restricted content](https://support.google.com/contributionpolicy/answer/7400114), read 2026-09-22 |
| [Restricted content](https://www.removeonestar.com/google-review-guidelines/restricted-content) | `google-restricted` | Google bars calls to action and offers for the sale of regulated goods, including regulated pharmaceuticals and health and medical devices. | [Prohibited and restricted content](https://support.google.com/contributionpolicy/answer/7400114), read 2026-09-22 |
| [Impersonation](https://www.removeonestar.com/google-review-guidelines/impersonation) | `google-impersonation` | Google bars content that seeks to impersonate any person, group or organization, and content that pretends to be a verified authoritative source. | [Prohibited and restricted content](https://support.google.com/contributionpolicy/answer/7400114), read 2026-09-22 |
| [Dangerous content](https://www.removeonestar.com/google-review-guidelines/dangerous-content) | `google-dangerous` | Google bars content that facilitates or encourages serious physical harm to health, safety, property, animals or the environment, and instructional content for making dangerous items. | [Prohibited and restricted content](https://support.google.com/contributionpolicy/answer/7400114), read 2026-09-22 |
| [Illegal content](https://www.removeonestar.com/google-review-guidelines/illegal-content) | `google-illegal` | Google's content policies apply worldwide. | [Legal Removals](https://support.google.com/contributionpolicy/answer/16426540), read 2026-09-22 |
| [Sexually explicit content](https://www.removeonestar.com/google-review-guidelines/sexually-explicit-content) | `google-explicit` | Google does not allow sexually explicit content, and its harassment policy covers unwanted sexualization of a person, including claims about a person's sexual activities. | [Prohibited and restricted content](https://support.google.com/contributionpolicy/answer/7400114), read 2026-09-22 |
| [Terrorist content](https://www.removeonestar.com/google-review-guidelines/terrorist-content) | `google-terrorist` | Google Maps prohibits terrorist content, including content that incites violence, promotes terrorist acts or celebrates terrorist attacks. | [Prohibited and restricted content](https://support.google.com/contributionpolicy/answer/7400114), read 2026-09-22 |

## Also from Remove One Star

- [review-rules-mcp](https://www.removeonestar.com/developers): the same checks as tools for AI assistants (MCP).
- A free REST API and a browser extension: [removeonestar.com/developers](https://www.removeonestar.com/developers).

## Licence

MIT. See [LICENSE](LICENSE).

---

Maintained by Remove One Star ([removeonestar.com](https://www.removeonestar.com)). If you want a real count of which
reviews on your own profile break a rule, ask for a [free audit](https://www.removeonestar.com/contact).
