import { existsSync, readdirSync } from "node:fs";
import { checkEvidence } from "./evidence.ts";
import { renderNote } from "./note.ts";
import { loadResult } from "./result.ts";

// No LLM. With a file: print its note. Without: list saved results.
const path = process.argv[2];
if (path) {
  console.log(renderNote(loadResult(path)));
} else {
  const files = (existsSync("outputs") ? readdirSync("outputs", { withFileTypes: true }) : [])
    .filter((f) => f.isFile() && f.name.endsWith(".json"))
    .map((f) => `outputs/${f.name}`)
    .sort();
  if (!files.length) {
    console.log("No saved results in outputs/. Run: npm run triage -- <bundle.json>");
    process.exit(0);
  }
  const header = ["file", "call_id", "owner", "evidence", "score"];
  const rows = files.map((file) => {
    const r = loadResult(file);
    const evidenceOk = checkEvidence(r.timeline, r.diagnosis.evidence).length === 0;
    return [
      file,
      r.call_id,
      evidenceOk ? r.diagnosis.owner : "(hidden)",
      evidenceOk ? "passed" : "FAILED",
      r.score ? (r.score.pass ? "PASS" : "FAIL") : "-",
    ];
  });
  const widths = header.map((h, i) => Math.max(h.length, ...rows.map((row) => row[i].length)));
  for (const row of [header, ...rows]) console.log(row.map((c, i) => c.padEnd(widths[i])).join("  "));
  console.log("\nShow one: npm run show -- <file>");
}
