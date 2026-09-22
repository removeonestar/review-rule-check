// Tests for review-rule-check. Every fixture is a review we wrote; none is real. Each says, for one platform, the
// verdict the checker should give and the rule it should name first (or none). The traps are reviews that look like a
// match and must not be flagged. Run with: npm test (node --test, with branch coverage).
import assert from "node:assert/strict";
import { test } from "node:test";
import { DISCLAIMER, removalProcess, GOOGLE_RULES, MAX_REVIEWS, SIGNALS, TRUSTPILOT_RULES, VERDICT_LABEL, checkMany, checkReview, csvCell, explain, parseReviews, rules, rulesFor } from "../src/index.ts";

const T = "trustpilot";
const G = "google";
/** [platform, text, verdict, rule the first match must name, or null] */
const FIXTURES: [typeof T | typeof G, string, "worth-flagging" | "needs-human" | "likely-stays", string | null][] = [
  // Trustpilot: advertising or promotional.
  [T, "Overpriced. Use code SAVE20 at the other shop and save yourself the trouble.", "worth-flagging", "advertising"],
  [T, "Better deal elsewhere, referral code FRIEND50 gets you a free month.", "worth-flagging", "advertising"],
  [T, "Stop wasting money here, message me and I will send you my referral link.", "worth-flagging", "advertising"],
  [T, "Cheaper at https://cheaperpills.example/deal if you want the same thing.", "worth-flagging", "advertising"],
  [T, "Save your money and go to the clinic on Fifth instead.", "needs-human", "advertising"],
  // Trustpilot: personal information.
  [T, "Support was useless. The agent is Megan Doe and she never called back.", "worth-flagging", "personal"],
  [T, "Rude on the phone. Her name is Priya Moss, ask for her if you want to be ignored.", "worth-flagging", "personal"],
  [T, "Call the manager yourself on 555-0142 and tell him what you think.", "worth-flagging", "personal"],
  [T, "Write to the owner at owner.private@mailbox.example, he never answers the shared inbox.", "worth-flagging", "personal"],
  [T, "The pharmacist is rude and she lives on Alder Street near me.", "worth-flagging", "personal"],
  // Trustpilot: not based on a genuine experience.
  [T, "Never used them myself but everyone online says they are a scam.", "worth-flagging", "genuine"],
  [T, "I have never been a customer and I never will be. Avoid.", "worth-flagging", "genuine"],
  [T, "My cousin says their pills did nothing for her. Avoid.", "needs-human", "genuine"],
  [T, "I work at a rival clinic and trust me, their doctors are overbooked.", "worth-flagging", "genuine"],
  [T, "Haven't tried them yet but the reviews put me off.", "worth-flagging", "genuine"],
  // Trustpilot: about a different business.
  [T, "Wrong company I think, but the delivery driver dented my gate.", "worth-flagging", "different"],
  [T, "They sold me a car with a bad transmission and will not call back.", "needs-human", "different"],
  // Trustpilot: harmful or illegal.
  [T, "If my refund is not here by Friday I will burn the place down.", "worth-flagging", "harmful"],
  [T, "The staff are all [slur] and should not be allowed to work.", "worth-flagging", "harmful"],
  [T, "Absolute fraud, the owners should be locked up.", "needs-human", "harmful"],
  // Trustpilot: incentivized, fake and who can write.
  [T, "They gave me a discount for this review so five stars I guess.", "worth-flagging", "incentivized"],
  [T, "Five stars. I was offered a gift card for a 5-star review and took it.", "worth-flagging", "incentivized"],
  [T, "This is a paid review, the service is excellent.", "worth-flagging", "fake"],
  [T, "I am 16 and my mum ordered for me, the box arrived damaged.", "needs-human", "whoCanWrite"],
  [T, "Back in 2019 they lost my first order. Never forgot it.", "needs-human", "whoCanWrite"],

  // Google: advertising and restricted.
  [G, "Overpriced. Go to betterclinic.example instead and use code SAVE20.", "worth-flagging", "advertising"],
  [G, "Visit www.otherpharmacy.example for real prices.", "worth-flagging", "advertising"],
  [G, "DM me for a better deal on the same treatment.", "worth-flagging", "advertising"],
  [G, "Too slow. I sell the same meds for half the price, no prescription needed.", "worth-flagging", "restricted"],
  // Google: personal information.
  [G, "Front desk was rude. Her name is Megan Doe and she lives on Alder Street.", "worth-flagging", "personal"],
  [G, "The receptionist is called Tom Reyes, he laughed at me.", "worth-flagging", "personal"],
  [G, "Call her on (555) 014-2276 and complain, everyone should.", "worth-flagging", "personal"],
  [G, "They told my neighbour about her diagnosis in the waiting room.", "worth-flagging", "personal"],
  // Google: spam and fake, conflict.
  [G, "Never been a patient here but I know it is a bad clinic.", "worth-flagging", "fake"],
  [G, "I used to work here and I would not send my dog.", "worth-flagging", "conflict"],
  [G, "I run the clinic across the street and our patients are much happier.", "worth-flagging", "conflict"],
  [G, "Five stars, they paid me to write this review.", "worth-flagging", "fake"],
  [G, "I heard from a friend the waits are long.", "needs-human", "fake"],
  // Google: off-topic.
  [G, "One star because of what their CEO said about the election.", "needs-human", "offTopic"],
  [G, "Posted this on the wrong page, sorry, meant the dentist next door.", "worth-flagging", "offTopic"],
  // Google: offensive, impersonation, dangerous, illegal, explicit, terrorist.
  [G, "These [slur] are running a scam. Everyone there should be locked up.", "worth-flagging", "offensive"],
  [G, "Watch your back, I know where you park.", "worth-flagging", "offensive"],
  [G, "Official notice: this clinic is under investigation and patients should stop treatment.", "needs-human", "impersonation"],
  [G, "They would not raise my dose, so take four times the label dose on your own like I did.", "worth-flagging", "dangerous"],
  [G, "Here is the sealed court document from my case against them, read it.", "needs-human", "illegal"],
  [G, "[A sexually explicit description of a staff member.]", "worth-flagging", "explicit"],
  [G, "[Text praising a terrorist attack, with no mention of the clinic.]", "worth-flagging", "terrorist"],
  [G, "Absolute shit service, the worst.", "needs-human", "offensive"],

  // Traps: real complaints and false positives. None of these should be flagged.
  [T, "My refill took 9 days and nobody answered my messages. I cancelled my plan.", "likely-stays", null],
  [T, "I cancelled in March and was still billed in April. The refund took two weeks of emails.", "likely-stays", null],
  [T, "Customer service is slow. Order number 555-0142 still has not shipped.", "likely-stays", null],
  [T, "I was never a customer service fan but this team was fine.", "likely-stays", null],
  [T, "The promo code didn't work at checkout and support took a week to answer.", "likely-stays", null],
  [T, "Terrible experience, rude staff, cold coffee in the waiting room. One star.", "likely-stays", null],
  [T, "The website crashed twice while I was paying. Fix it.", "likely-stays", null],
  [T, "Not the cheapest, but the doctor listened and the parcel came in two days.", "likely-stays", null],
  [G, "Waited 50 minutes past my appointment time and nobody said sorry.", "likely-stays", null],
  [G, "I was billed twice for one visit. It took three calls to fix.", "likely-stays", null],
  [G, "Tracking number 555-0199 shows it stuck in the depot for a week.", "likely-stays", null],
  [G, "The nurse was kind but the online portal kept logging me out.", "likely-stays", null],
  [G, "Cheaper than the pharmacy I used before and the staff were friendly.", "likely-stays", null],
  [G, "Reception was dismissive about my rash and I left without being seen.", "likely-stays", null],
  [G, "Dr. Anna Patel was brilliant and explained everything.", "needs-human", "personal"],
  [T, "The code on my prescription label was wrong and the pharmacist fixed it.", "likely-stays", null],

  // Sprint 17: forty more, written for the package. Every signal fires at least once, and more traps.
  [T, "Honestly go to www.betterpharmacy.example for the same thing, half the price.", "worth-flagging", "advertising"],
  [T, "Their website is northstarhealth.example and it was down all weekend.", "needs-human", "advertising"],
  [T, "Hit me up if you want a cheaper supplier, I know one.", "worth-flagging", "advertising"],
  [T, "Sign up using my link and you both get credit.", "worth-flagging", "advertising"],
  [T, "Switch to the other clinic instead, they actually call back.", "needs-human", "advertising"],
  [T, "I can get you the same pills without a prescription, cheaper.", "worth-flagging", "advertising"],
  [T, "Apply the code at checkout and it takes 10% off. WELCOME10 works.", "worth-flagging", "advertising"],
  [G, "Enter code SPRING15 at the rival shop instead, much better.", "worth-flagging", "advertising"],
  [G, "Their site northstar.health would not load on my phone.", "worth-flagging", "advertising"],
  [G, "Email me at buyer.pal@mailbox.example and I will sort you out.", "worth-flagging", "advertising"],
  [T, "The nurse is called Rosa Lind and she was rude to my mother.", "worth-flagging", "personal"],
  [T, "Dr. Omar Haddad seemed to rush everyone that day.", "needs-human", "personal"],
  [G, "He lives at 14 Birch Road, go and ask him yourself.", "worth-flagging", "personal"],
  [T, "The receptionist read out his test results in front of everyone.", "needs-human", "personal"],
  [T, "Not once ordered from here but the prices look like a rip off.", "worth-flagging", "genuine"],
  [G, "My sister told me the clinic was dirty, avoid.", "needs-human", "fake"],
  [T, "I worked for this company and management is chaos.", "needs-human", "genuine"],
  [G, "Ex-employee here. Would not trust them with anything.", "worth-flagging", "conflict"],
  [T, "I run the pharmacy down the road and this lot undercut everyone.", "worth-flagging", "genuine"],
  [G, "They asked me to write this review in return for a free month, so here it is.", "worth-flagging", "fake"],
  [T, "Got a refund for my review so five stars from me.", "worth-flagging", "incentivized"],
  [G, "Review swap: I review you, you review me. Five stars.", "worth-flagging", "fake"],
  [T, "I am fifteen and this app would not let me cancel.", "needs-human", "whoCanWrite"],
  [T, "Three years ago they sent the wrong box. Never again.", "needs-human", "whoCanWrite"],
  [G, "I meant it for the dentist, posted it on the wrong profile.", "worth-flagging", "offTopic"],
  [G, "The pizza was cold and the delivery was late.", "needs-human", "offTopic"],
  [T, "Nothing to do with the service, but the president is a disgrace.", "needs-human", "advertising"],
  [T, "You will regret this when I find out where you park.", "worth-flagging", "harmful"],
  [G, "I will come for every one of you, count on it.", "worth-flagging", "offensive"],
  [T, "What a bunch of thieves, charging me twice.", "needs-human", "harmful"],
  [G, "The FDA is investigating them, stop using them now.", "needs-human", "impersonation"],
  [G, "Take double the prescribed dose and you will not need them.", "worth-flagging", "dangerous"],
  [G, "They have a court order against them, look it up.", "needs-human", "illegal"],
  [G, "Their staff send nude photos to customers.", "worth-flagging", "explicit"],
  [G, "Long live ISIS. Nothing else to say.", "worth-flagging", "terrorist"],
  [T, "Absolute bullshit from start to finish.", "needs-human", "harmful"],
  // More traps.
  [T, "Invoice number 555-0144 was charged twice and it took a month to fix.", "likely-stays", null],
  [G, "Ticket # 555-0123 is still open after two weeks.", "likely-stays", null],
  [T, "I have never been happier with a telehealth service. Fast and kind.", "likely-stays", null],
  [G, "The staff were friendly and the wait was short. Parking was hard to find.", "likely-stays", null],
];

test(`${FIXTURES.length} fixtures give the expected verdict and first rule`, () => {
  for (const [platform, text, verdict, rule] of FIXTURES) {
    const got = checkReview({ platform, text });
    assert.equal(got.verdict, verdict, `${platform}: ${text}\n  got ${got.verdict}: ${got.matches.map((m) => `${m.signal}:${m.text}`).join(" | ")}`);
    assert.equal(got.matches[0]?.rule ?? null, rule, `${platform}: ${text}\n  first rule ${got.matches[0]?.rule}`);
  }
  assert.ok(FIXTURES.length >= 100, `at least 100 fixtures, have ${FIXTURES.length}`);
});

test("every rule a signal can name has a fixture, and every signal fires on some fixture", () => {
  const named = new Set(FIXTURES.filter((f) => f[3]).map((f) => `${f[0]}:${f[3]}`));
  for (const s of SIGNALS) {
    for (const platform of [T, G] as const) {
      const target = s[platform];
      if (target) assert.ok(named.has(`${platform}:${target.rule}`), `no fixture names ${platform}:${target.rule}`);
    }
    const fired = FIXTURES.some(([platform, text]) => checkReview({ platform, text }).matches.some((m) => m.signal === s.id));
    assert.ok(fired, `signal ${s.id} never fires`);
  }
  assert.ok(FIXTURES.filter((f) => f[2] === "likely-stays").length >= 18, "at least 18 traps");
});

test("results carry the matched rules once each, the labels and full ids", () => {
  const got = checkReview({ platform: T, text: "Use code SAVE20. Call 555-0142. Code SAVE20 again." });
  assert.deepEqual(got.rules.map((r) => r.id), ["trustpilot-advertising", "trustpilot-personal"]);
  assert.ok(got.matches.every((m) => m.ruleId === `trustpilot-${m.rule}` && m.label.length > 0));
  assert.equal(VERDICT_LABEL[got.verdict], "Worth flagging");
});

test("strong matches sort before weak ones, whatever the order of the signals", () => {
  const got = checkReview({ platform: T, text: "Dr. Omar Haddad gave me his email, omar@clinic.example." });
  assert.equal(got.matches[0].strength, "strong");
  assert.equal(got.matches.at(-1)?.strength, "weak");
  // A weak signal that comes before a strong one in the list still sorts after it.
  const mixed = checkReview({ platform: T, text: "See northstar.example, or write to me at sam@mailbox.example." });
  assert.deepEqual(mixed.matches.map((m) => m.strength), ["strong", "weak"]);
  const weakOnly = checkReview({ platform: G, text: "Dr. Omar Haddad and Dr. Lena Fischer rushed me." });
  assert.equal(weakOnly.verdict, "needs-human");
});

test("a signal with no target on a platform is skipped there", () => {
  assert.equal(checkReview({ platform: G, text: "I am 16 and it was fine." }).verdict, "likely-stays");
  assert.equal(checkReview({ platform: T, text: "Official notice: this clinic is closed." }).verdict, "likely-stays");
});

test("stars are kept when valid and dropped otherwise", () => {
  assert.equal(checkReview({ platform: T, text: "Fine.", stars: 4 }).stars, 4);
  assert.equal(checkReview({ platform: T, text: "Fine.", stars: 9 }).stars, null);
  assert.equal(checkReview({ platform: T, text: "Fine.", stars: 0 }).stars, null);
  assert.equal(checkReview({ platform: T, text: "Fine." }).stars, null);
});

test("bad input is refused with a clear error", () => {
  // @ts-expect-error: testing a platform outside the type
  assert.throws(() => checkReview({ platform: "yelp", text: "x" }), /platform must be/);
  // @ts-expect-error: testing a text outside the type
  assert.throws(() => checkReview({ platform: T, text: 42 }), /text must be a string/);
});

test("checkMany takes strings and objects and totals the verdicts", () => {
  const many = checkMany(G, ["Use code SAVE20 here.", { text: "Dr. Omar Haddad rushed me.", stars: 2 }, { text: "Lovely staff." }]);
  assert.deepEqual(many.totals, { "worth-flagging": 1, "needs-human": 1, "likely-stays": 1 });
  assert.equal(many.results[1].stars, 2);
  assert.equal(many.results[2].stars, null);
  assert.equal(many.platform, G);
});

test("rules: 8 Trustpilot and 12 Google, unique ids, complete fields, pages on removeonestar.com", () => {
  assert.equal(TRUSTPILOT_RULES.length, 8);
  assert.equal(GOOGLE_RULES.length, 12);
  assert.equal(rules.length, 20);
  assert.equal(new Set(rules.map((r) => r.id)).size, 20);
  for (const r of rules) {
    for (const field of ["id", "key", "name", "policy", "quote", "sourceTitle", "sourceUrl", "verified", "pageUrl"] as const) assert.ok(r[field].length > 0, `${r.id}.${field}`);
    assert.match(r.sourceUrl, /^https:\/\/(help\.trustpilot\.com|legal\.trustpilot\.com|support\.google\.com)\//);
    assert.match(r.pageUrl, /^https:\/\/www\.removeonestar\.com\/(trustpilot-guidelines|google-review-guidelines)\//);
    assert.match(r.verified, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(r.evidence.length >= 2 && r.evidence.every((e) => e.length > 10), `${r.id}.evidence`);
  }
  assert.deepEqual(rulesFor(G).map((r) => r.platform), Array(12).fill(G));
});

test("explain finds a rule by id, or by key with a platform, and nothing else", () => {
  assert.equal(explain("google-conflict")?.name, "Conflict of interest");
  assert.equal(explain("advertising", T)?.id, "trustpilot-advertising");
  assert.equal(explain("advertising"), undefined);
  assert.equal(explain("nope", G), undefined);
});

test("parseReviews reads plain lines, quoted CSV, stars and dates, and caps at the limit", () => {
  const plain = parseReviews("First review\n\n  Second review  \r\n");
  assert.equal(plain.csv, false);
  assert.deepEqual(plain.reviews.map((r) => r.text), ["First review", "Second review"]);
  const csv = parseReviews('text,stars,date\n"Slow, and rude",1,2026-09-01\nFine,4,\n"She said ""no""",2,2026-08-02\n,3,\nBad,x,');
  assert.equal(csv.csv, true);
  assert.deepEqual(csv.reviews.map((r) => [r.text, r.stars, r.date]), [["Slow, and rude", 1, "2026-09-01"], ["Fine", 4, ""], ['She said "no"', 2, "2026-08-02"], ["Bad", null, ""]]);
  const alt = parseReviews("review,rating\nGreat,5\n\nMeh,7");
  assert.deepEqual(alt.reviews.map((r) => [r.text, r.stars, r.date]), [["Great", 5, ""], ["Meh", null, ""]]);
  // Rows shorter than the header: a missing text, stars or date field is read as empty.
  assert.deepEqual(parseReviews("stars,text\n5").reviews, []);
  assert.deepEqual(parseReviews("text,stars\nGood").reviews.map((r) => r.stars), [null]);
  assert.deepEqual(parseReviews("text,date\nGood").reviews.map((r) => r.date), [""]);
  const noStars = parseReviews("text\nOnly text");
  assert.deepEqual(noStars.reviews.map((r) => r.stars), [null]);
  const many = parseReviews(Array.from({ length: MAX_REVIEWS + 30 }, (_, i) => `Review ${i}`).join("\n"));
  assert.equal(many.reviews.length, MAX_REVIEWS);
  assert.equal(many.skipped, 30);
  assert.deepEqual(parseReviews("").reviews, []);
});

test("csvCell quotes only when it must", () => {
  assert.equal(csvCell("plain"), "plain");
  assert.equal(csvCell('say "hi", ok'), '"say ""hi"", ok"');
  assert.equal(csvCell("two\nlines"), '"two\nlines"');
  assert.equal(csvCell(3), "3");
  assert.equal(csvCell(null), "");
});

test("the disclaimer names the site and says the platform decides", () => {
  assert.match(DISCLAIMER, /removeonestar\.com/);
  assert.match(DISCLAIMER, /platform makes the decision/);
});

test("removalProcess gives numbered steps with a source for each, and refuses an unknown platform", () => {
  for (const platform of [T, G] as const) {
    const p = removalProcess(platform);
    assert.equal(p.platform, platform);
    assert.ok(p.steps.length >= 6);
    p.steps.forEach((s, i) => {
      assert.equal(s.step, i + 1);
      assert.match(s.sourceUrl, /^https:\/\//);
    });
    assert.match(p.pageUrl, /removeonestar\.com/);
  }
  // @ts-expect-error: testing a platform outside the type
  assert.throws(() => removalProcess("yelp"), /platform must be/);
});
