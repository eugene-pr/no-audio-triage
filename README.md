# No-Audio Call Triage

Prototype. Reads one call bundle for a "no audio / one-way audio" ticket and prints a triage note: owner, suspected cause, next step, evidence, missing data.

**Report** (problem, feature, AI usage, architecture, validation, real vs. simulated): [`docs/REPORT.md`](docs/REPORT.md). Terms: [`CONTEXT.md`](CONTEXT.md).

All code is in `prototype/`. Paths and commands below are relative to it.

## Run

Needs Node 22+ and either an Anthropic API key or a logged-in [Claude Code](https://claude.com/claude-code) CLI (used when `ANTHROPIC_API_KEY` is not set; same model, prompt and schema).

```sh
cd prototype
npm install
export ANTHROPIC_API_KEY=sk-ant-...   # optional, see above
npm run triage -- bundles/01-firewall.json   # one bundle
npm run triage:all                           # all bundles + score table
npm run show                                 # list saved results, no LLM
npm run show -- outputs/01-firewall.json     # re-print one note, no LLM
npm test && npm run typecheck                # no API key needed
```

Bundles (simulated): `01-firewall`, `02-nat`, `03-stale-sdp`, `04-bypass`. Each has a `*.expected.json`: expected owner, line IDs that must / must not be cited, optional banned-cause pattern (regex) the suspected cause must not match.

`triage:all` prints a pass/fail table with the reason for each fail. Exit code 1 if any bundle fails.

Every run saves `outputs/<bundle>.json` (call ID, timeline, diagnosis, score) and `outputs/<bundle>.txt` (the note), overwriting old saved results. Committed saved results are real Claude Sonnet 5.5 runs; LLM output varies, so a rerun may differ. The JSON is self-contained, e.g.:

```sh
jq -r '"\(.call_id): \(.diagnosis.next_check)"' outputs/*.json
```

## How it works

1. **Call timeline** (`src/timeline.ts`, code): merges all bundle lines, sorts by time, labels each with ID, call leg, capture point. Keeps every media setup.
2. **Diagnosis** (`src/diagnosis.ts`, LLM): Claude Sonnet 5.5 gets the ticket + timeline, returns JSON. Prompt: `prompts/diagnose.md`.
3. **Evidence check** (`src/evidence.ts`, code): each quote must be in the line it names. One failure hides the whole diagnosis.
4. **Note** (`src/note.ts`): answer first: SUMMARY, NEXT STEP, FINDINGS, EVIDENCE, MISSING.
5. **Scoring** (`src/score.ts`, code, no judge LLM): owner, evidence check, required / forbidden line IDs, banned cause.
6. **Saved result** (`src/result.ts`, `src/show.ts`): save, list and re-print `outputs/*.json`.
