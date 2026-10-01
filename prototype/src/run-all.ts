import { readdirSync, readFileSync } from "node:fs";
import { saveResult, triageBundle } from "./result.ts";
import { scoreRun, type Expected } from "./score.ts";

// Runs every bundle, scores each note vs its expected answer, saves the results.
const names = readdirSync("bundles")
  .filter((f) => f.endsWith(".json") && !f.endsWith(".expected.json"))
  .map((f) => f.replace(/\.json$/, ""))
  .sort();

const header = ["bundle", "owner expected / got", "required", "forbidden", "cause", "evidence", "result"];
const rows: string[][] = [];
const failures: string[] = [];
let passed = 0;
for (const name of names) {
  console.error(`Running ${name}...`);
  const expected: Expected = JSON.parse(readFileSync(`bundles/${name}.expected.json`, "utf8"));
  try {
    const result = await triageBundle(`bundles/${name}.json`);
    const { diagnosis } = result;
    const score = scoreRun(expected, result.timeline, diagnosis);
    saveResult(name, { ...result, score });

    const { checks } = score;
    rows.push([
      name,
      `${expected.owner} / ${diagnosis.owner}`,
      `${expected.required_line_ids.join(",") || "-"} ${checks.required}`,
      `${expected.forbidden_line_ids.join(",") || "-"} ${checks.forbidden}`,
      checks.cause,
      checks.evidence,
      score.pass ? "PASS" : "FAIL",
    ]);
    if (score.pass) passed++;
    for (const reason of score.reasons) failures.push(`${name}: ${reason}`);
  } catch (err) {
    rows.push([name, `${expected.owner} / ?`, "?", "?", "?", "?", "ERROR"]);
    failures.push(`${name}: run failed: ${err instanceof Error ? err.message : err}`);
  }
}

const widths = header.map((h, i) => Math.max(h.length, ...rows.map((row) => row[i].length)));
for (const row of [header, ...rows]) console.log(row.map((c, i) => c.padEnd(widths[i])).join("  "));
if (failures.length) console.log(["", "Fail reasons:", ...failures.map((f) => `  - ${f}`)].join("\n"));
console.log(`\n${passed}/${rows.length} passed. Saved results in outputs/. Review: npm run show`);
process.exitCode = passed === rows.length ? 0 : 1;
