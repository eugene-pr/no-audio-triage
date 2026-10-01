import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { diagnose, type Diagnosis } from "./diagnosis.ts";
import { renderNote } from "./note.ts";
import type { scoreRun } from "./score.ts";
import { buildTimeline, type CallBundle, type TimelineLine } from "./timeline.ts";

// Self-contained: enough to re-render the note without the bundle or the LLM.
export type SavedResult = {
  call_id: string;
  timeline: TimelineLine[];
  diagnosis: Diagnosis;
  score?: ReturnType<typeof scoreRun>; // only from triage:all (needs expected file)
};

// Bundle file -> timeline -> LLM diagnosis. Not saved yet.
export async function triageBundle(path: string): Promise<SavedResult> {
  const bundle: CallBundle = JSON.parse(readFileSync(path, "utf8"));
  const timeline = buildTimeline(bundle);
  const diagnosis = await diagnose(bundle.ticket, timeline);
  return { call_id: bundle.call_id, timeline, diagnosis };
}

// Writes outputs/<name>.json (data) and outputs/<name>.txt (note). Returns the JSON path.
export function saveResult(name: string, result: SavedResult): string {
  mkdirSync("outputs", { recursive: true });
  const path = `outputs/${name}.json`;
  writeFileSync(path, JSON.stringify(result, null, 2) + "\n");
  writeFileSync(`outputs/${name}.txt`, renderNote(result) + "\n");
  return path;
}

export function loadResult(path: string): SavedResult {
  return JSON.parse(readFileSync(path, "utf8"));
}
