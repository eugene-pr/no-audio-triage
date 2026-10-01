import { basename } from "node:path";
import { renderNote } from "./note.ts";
import { saveResult, triageBundle } from "./result.ts";

const path = process.argv[2];
if (!path) {
  console.error("Usage: npm run triage -- <bundle.json>");
  process.exit(1);
}

const result = await triageBundle(path);
console.log(renderNote(result));
console.error(`\nSaved: ${saveResult(basename(path, ".json"), result)}`);
