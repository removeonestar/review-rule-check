// The CommonJS build sits under a package whose "type" is "module", so it needs its own package.json saying so.
import fs from "node:fs";
fs.writeFileSync("dist/cjs/package.json", `${JSON.stringify({ type: "commonjs" })}\n`);
