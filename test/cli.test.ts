// Tests for the CLI, run in-process with a fake stdout, stderr and file system.
import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { run, VERSION } from "../src/cli.ts";

const cli = (argv: string[], files: Record<string, string> = {}) => {
  const out: string[] = [];
  const err: string[] = [];
  const code = run(argv, {
    out: (line) => out.push(line),
    err: (line) => err.push(line),
    readFile: (path) => {
      if (!(path in files)) throw new Error("ENOENT");
      return files[path];
    },
  });
  return { code, out: out.join("\n"), err: err.join("\n") };
};

test("one review as words, as a table", () => {
  const r = cli(["Use", "code", "SAVE20", "at", "the", "other", "shop", "--platform", "trustpilot"]);
  assert.equal(r.code, 0);
  assert.match(r.out, /Worth flagging/);
  assert.match(r.out, /Advertising or promotional/);
  assert.match(r.out, /trustpilot-guidelines\/advertising-or-promotional/);
  assert.match(r.out, /the platform makes the decision/);
});

test("a long review is shortened in the table, and a review with no signal says so", () => {
  const long = "Lovely staff and a quick delivery, with nothing at all to complain about on any count whatsoever.";
  const r = cli([long, "--platform", "google"]);
  assert.match(r.out, /…/);
  assert.match(r.out, /No signal\./);
});

test("CSV input and JSON output", () => {
  const r = cli(["--csv", "reviews.csv", "--platform", "google", "--json"], { "reviews.csv": "text,stars\nUse code SAVE20,1\nLovely staff,5" });
  assert.equal(r.code, 0);
  const json = JSON.parse(r.out);
  assert.equal(json.results.length, 2);
  assert.equal(json.results[0].verdict, "worth-flagging");
  assert.equal(json.results[1].stars, 5);
  assert.match(json.note, /platform makes the decision/);
});

test("--rules lists every rule or one platform's, as text or JSON", () => {
  assert.match(cli(["--rules"]).out, /trustpilot-advertising[\s\S]*google-terrorist/);
  assert.equal(JSON.parse(cli(["--rules", "--platform", "google", "--json"]).out).length, 12);
});

test("--explain prints a rule by id or by key and platform, and fails on an unknown one", () => {
  const text = cli(["--explain", "google-personal"]);
  assert.match(text.out, /Personal information \(google-personal\)/);
  assert.match(text.out, /support\.google\.com/);
  assert.equal(JSON.parse(cli(["--explain", "advertising", "--platform", "trustpilot", "--json"]).out).id, "trustpilot-advertising");
  const missing = cli(["--explain", "nope"]);
  assert.equal(missing.code, 1);
  assert.match(missing.err, /No rule "nope"/);
});

test("--version prints the package version", () => {
  const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  assert.equal(VERSION, pkg.version);
  assert.deepEqual(cli(["--version"]), { code: 0, out: pkg.version, err: "" });
  assert.equal(cli(["-v"]).out, pkg.version);
});

test("help, and every error path with its exit code", () => {
  assert.match(cli(["--help"]).out, /Usage/);
  assert.match(cli(["-h"]).out, /Usage/);
  assert.equal(cli(["--platform"]).code, 2);
  assert.match(cli(["text", "--platform", "yelp"]).err, /must be trustpilot or google/);
  assert.match(cli(["text"]).err, /--platform is required/);
  assert.match(cli(["--platform", "google"]).err, /Give some review text/);
  const unreadable = cli(["--csv", "missing.csv", "--platform", "google"]);
  assert.equal(unreadable.code, 1);
  assert.match(unreadable.err, /Could not read missing\.csv/);
});
