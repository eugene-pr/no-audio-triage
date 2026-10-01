# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Take-home assignment. Full brief: `TASK.md`.

Goal: pick one real problem in a cloud communication platform (call centers, support, voice, agent workflows, monitoring). Define a small AI feature for it. Build a minimal prototype. Write a short report.

Context: the company builds voice / call center / messaging systems on FreeSWITCH and Asterisk. The feature should fit that world.

Time box: 60–90 min. Judged on approach and thinking, not completeness.

## Deliverables

1. **Prototype** — source code + run instructions (or Dockerfile). Can be an endpoint, script, simple UI, or simulated flow.
2. **Report** — short. Sections: Problem Exploration, AI Usage, Prompts and Iterations, Decision Making, Prototype Explanation (real vs. simulated), Reflection.
3. Also cover: architecture (integration point, real-time vs. async vs. batch, scaling) and validation (success metrics, risks, failure cases).

## How to work here

- **KISS and YAGNI.** Smallest thing that shows the idea. No extra layers, config, or abstractions "for later".
- **Simple language** in docs, report, and chat answers. Short sentences. Plain words. Clarity over completeness.
- Say clearly what is real and what is mocked/simulated.
- Keep a log of AI usage (prompts, what worked, what did not). The report needs it.
- **Ask questions one at a time.** When you need input from the user, ask one question, wait for the answer, then ask the next. Never batch several questions in one message or one AskUserQuestion call.

## Status

Prototype built. TypeScript, Node 22+, `@anthropic-ai/sdk` (falls back to `claude` CLI if no `ANTHROPIC_API_KEY`), zod, vitest, tsx. Report: `docs/REPORT.md`. How it works: `README.md`.

Code lives in `prototype/` (package.json, src/, prompts/, bundles/, outputs/). Run commands from there.

Commands:

- `npm run triage -- bundles/<name>.json`: one bundle → triage note, saved to `outputs/`
- `npm run triage:all`: all bundles + score table (LLM calls)
- `npm run show [-- outputs/<name>.json]`: list / re-print saved results, no LLM
- `npm test`, `npm run typecheck`
