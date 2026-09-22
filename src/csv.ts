/**
 * Reading pasted reviews: one per line, or CSV with a header row naming a text column and, optionally, stars and a
 * date. Used by the CLI and by the bulk checker on removeonestar.com.
 */
export type ParsedReview = { line: number; text: string; stars: number | null; date: string };

/** The most reviews one check takes. */
export const MAX_REVIEWS = 200;

/** Splits one CSV line into fields, honouring double quotes. */
function csvFields(line: string): string[] {
  const out: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { out.push(field); field = ""; }
    else field += c;
  }
  out.push(field);
  return out.map((f) => f.trim());
}

/**
 * Reads pasted input: one review per line, or CSV with a header row naming a text column and, optionally, stars and
 * date. Blank lines are skipped. Returns at most MAX_REVIEWS and says how many were left out.
 */
export function parseReviews(input: string): { reviews: ParsedReview[]; skipped: number; csv: boolean } {
  const lines = input.replace(/\r\n?/g, "\n").split("\n");
  const first = lines.find((line) => line.trim())?.toLowerCase() ?? "";
  const header = csvFields(first);
  const csv = header.includes("text") || header.includes("review");
  const reviews: ParsedReview[] = [];
  if (csv) {
    const at = (name: string) => header.indexOf(name);
    const textAt = at("text") >= 0 ? at("text") : at("review");
    const starsAt = at("stars") >= 0 ? at("stars") : at("rating");
    const dateAt = at("date");
    let seenHeader = false;
    lines.forEach((line, i) => {
      if (!line.trim()) return;
      if (!seenHeader) { seenHeader = true; return; }
      const fields = csvFields(line);
      const text = fields[textAt] ?? "";
      if (!text) return;
      const stars = starsAt >= 0 ? Number.parseInt(fields[starsAt] ?? "", 10) : NaN;
      reviews.push({ line: i + 1, text, stars: Number.isFinite(stars) && stars >= 1 && stars <= 5 ? stars : null, date: dateAt >= 0 ? (fields[dateAt] ?? "") : "" });
    });
  } else {
    lines.forEach((line, i) => {
      const text = line.trim();
      if (text) reviews.push({ line: i + 1, text, stars: null, date: "" });
    });
  }
  return { reviews: reviews.slice(0, MAX_REVIEWS), skipped: Math.max(0, reviews.length - MAX_REVIEWS), csv };
}

/** One CSV field, quoted when it needs to be. */
export const csvCell = (value: string | number | null) => {
  const text = value === null ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};
