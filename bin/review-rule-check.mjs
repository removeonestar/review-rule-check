#!/usr/bin/env node
// The review-rule-check command. The logic is in src/cli.ts (built to dist/); this file only connects it to the process.
import { readFileSync } from "node:fs";
import { run } from "../dist/esm/cli.js";

process.exitCode = run(process.argv.slice(2), {
  out: (line) => process.stdout.write(`${line}\n`),
  err: (line) => process.stderr.write(`${line}\n`),
  readFile: (path) => readFileSync(path === "-" ? 0 : path, "utf8"),
});
