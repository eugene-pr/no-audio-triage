# Report: No-Audio Call Triage (AI)

**In one line:** for a "no audio / one-way audio" ticket, an LLM reads all data for the failed call and writes a short triage note: what we saw, a guessed cause, who should act next, and the evidence. Code checks that every quote is real.

Run it: [README](../README.md). Raw material: [RESEARCH.md](RESEARCH.md) (problem research), [AI-LOG.md](AI-LOG.md) (prompts, stakeholder chat, tuning runs). Terms: [CONTEXT.md](../CONTEXT.md).

## 1. Problem Exploration

- I started from the company's world: voice, call centers and messaging on FreeSWITCH and Asterisk.
- I used ChatGPT to find **real** problems with evidence (forums, mailing lists, docs): 9 problems, 5 feature ideas ([RESEARCH.md](RESEARCH.md)).
- The problems with the most evidence are about **audio**: one-way audio, choppy audio, silent recordings, DTMF lost between legs. They cost repeat calls, escalations and expert time.
- I checked the problem with a simulated stakeholder: "Dana", an L2 support engineer (ChatGPT persona). Her points:
  - A couple of audio escalations a day. 20–40 min with a clear cause; hours if it comes and goes.
  - The slowest part is getting one exact failed call that everyone discusses.
  - "Everybody checks their own boundary and nobody checks the gap."

**The feature.** Input: one ticket with an identified call. Code merges all data for the call into a **call timeline** (every line sorted, with an ID, call leg and capture point). The LLM reads it and writes a **triage note**, scannable in 10 seconds: `observed` (facts), `suspected_cause` (a guess), `owner` (customer side / carrier / platform / unknown), `visibility_ends_at`, `evidence` (quotes tied to line IDs), `next_check`, `missing`, `confidence` (a reason, not a number). If any quote is not in the line it names, the diagnosis is hidden.

**For whom:** L2 engineers get a faster start; L1 learns what data to collect. Dana's estimate: saves 10–15 min of first digging per ticket. It does **not** remove the biggest delay: waiting for the customer's IT team.

## 2. AI Usage

| Tool | Used for |
|---|---|
| ChatGPT | Researching real problems, first ideas, simulating the stakeholder |
| Claude Code | Reviewing ideas, refining the design, writing docs, building and tuning the prototype |
| Claude Sonnet 5.5 | Inside the prototype: the diagnosis itself |

## 3. Prompts and Iterations

Word-for-word prompts for the stakeholder chat and design review are in [AI-LOG.md](AI-LOG.md). The others are summarised here.

1. **Research (ChatGPT):** asked for 10–15 real problems with links, fitted to FreeSWITCH/Asterisk, ranked by pain, real AI fit, ~60 min to prototype, clear metric. Asked it to be skeptical. Worked: real problems with sources. Did not work: its ideas (IVR, call notes, QA) were about transcripts and ignored the VoIP problems it had just found.
2. **Review (Claude Code):** spotted that mismatch. Picked the VoIP incident idea, narrowed to no audio / one-way audio. Some problems (CDR totals, registration) need rules or SQL, not AI.
3. **Check against the task:** the first design used rules to find the cause and the LLM only to write text. I pushed back: the task asks for an AI-driven feature. Now the AI diagnoses; code only checks the quotes.
4. **Stakeholder (ChatGPT as Dana):** interview first, feature second, so she would not just react to my idea. Changes: facts split from guess; `owner: unknown` plus `visibility_ends_at`; confidence as a reason ("92% means nothing"); a `missing` field; failed check hides the diagnosis; trigger only on tickets with a call, not low MOS. Key insight: the check catches **made-up** evidence, not **bad reasoning** on real evidence.
5. **Design review (Claude Code, one question at a time):** found that code picking the newest SDP would make the stale-SDP trap test the code, not the AI. Now code only merges and labels; the LLM picks. Evidence is line ID + quote. Scoring uses structured checks, not a judge LLM.
6. **Prompt tuning on 4 trap bundles:** 9 runs (table in AI-LOG). Baseline passed 3 of 4: on the NAT trap the model hedged to `unknown`. Fixes: ruling out is a valid way to pick an owner; the cause is one short sentence; if NAT was corrected and audio flows, do not list NAT. A code review (not the tests) found a prompt rule that contradicted the stale-SDP trap. A passing test did not prove the prompt was right.

## 4. Decision Making

Why this idea:

- **Real pain** with public evidence.
- **Fits the stack:** FreeSWITCH/Asterisk data; users are the platform's own support engineers.
- **AI is justified:** many causes, signs spread across SIP, SDP, RTP stats and logs. Fixed rules break on traps like a private IP in SDP that NAT handling already fixed.
- **Small:** one prompt, one check, a few mock calls.

Rejected: IVR misrouting (no evidence collected), call-note and QA checkers (generic, crowded), repeat-contact explainer (hard to mock), fraud / CDR / registration (no LLM needed).

## 5. Prototype Explanation

A TypeScript CLI (Node 22). Input: one call bundle. Output: a triage note, also saved to a file. How to run: [README](../README.md).

Pipeline: call timeline (code) → diagnosis (Claude Sonnet 5.5, JSON) → evidence check (code) → triage note, answer first. Scoring (code) compares each note to an expected answer: owner, evidence check, required / forbidden line IDs, a banned-cause pattern.

**Real:** timeline builder, prompt, LLM call, evidence check, scoring. Unit tests cover the timeline, evidence check, note and scoring. Not tested: the LLM call and the CLI scripts.

**Simulated:** 4 fake call bundles (written by Claude Code to look like FreeSWITCH logs, Homer SIP/SDP and RTP stats); no ticket system (note goes to a file); placeholder Homer and log links. Not done: masking IPs and phone numbers.

**Results** (saved run in `prototype/outputs/`, real LLM on fake data):

| Bundle | Expected owner | Got | Result |
|---|---|---|---|
| 1 Customer firewall drops return audio | customer side | customer side | pass |
| 2 NAT trap: private IP in SDP, audio fine at our boundary | customer side | customer side | **fail** |
| 3 Stale SDP after transfer | platform | platform | pass |
| 4 Media bypasses FreeSWITCH | unknown | unknown | pass |

- Bundle 2: owner and evidence are right, but the cause lists "office firewall/NAT" as an option. The data already rules NAT out, and Dana said blaming NAT would make her stop reading.
- The same prompt passed bundle 2 four times in tuning: 1 fail in 5 runs. Too small a sample to trust either way.
- All 4 evidence checks passed. No made-up quotes.

## 6. Architecture

- **Trigger:** async. Runs when an audio ticket has an identified call. Not on low MOS alone: it misses a muted mic and adds noise.
- **Integration point:** FreeSWITCH / Asterisk call stats and logs plus Homer, for all related legs (including transfer legs). The note goes on the ticket as an internal note, with links to Homer and raw logs.
- **Scaling:** runs only on flagged calls, so load is small. Queue the jobs, rate-limit LLM calls, mask private data before the call.

## 7. Validation

**Metrics:** time to first useful diagnosis (before vs. after); L1 → L2/L3 escalation rate; how often engineers agree; share of `unknown` owners and how often that was right; share of "check failed" notes.

**Risks and failure cases:**

- Made-up evidence: caught by the check.
- Bad reasoning on real evidence (e.g. SDP from before a transfer): not caught; covered by trap cases.
- Blaming NAT because a private IP appears in SDP.
- Missing data (no customer-side view, missing legs): shown in `missing`, but can still mislead.
- Privacy of IPs and phone numbers.
- Engineers trust it too much and stop checking.

## 8. Reflection

**Worked:**

- Starting from evidence of real pain, not "where can we add AI".
- Code does the checkable parts (merge, label, check quotes, score). The LLM does the judgment.
- Trap cases found real prompt problems a happy-path case would hide.
- Having the AI grill the design before building caught a flaw that would have made one trap test meaningless.

**Weak:**

- The NAT trap still fails sometimes. One prompt rule does not stop the model naming the usual suspect.
- 4 bundles, a few runs each. The same AI wrote the bundles and tuned the prompt, so they may be easier than real calls.
- The banned-cause check is blunt: it cannot tell "NAT is the cause" from "NAT is one option". Chosen over a judge LLM because it is simple and repeatable.
- Dana is an AI persona, not a real engineer.

**Next:**

- Run on real closed tickets with a known cause. Measure owner accuracy and time saved.
- Run each bundle 10+ times and report a pass rate.
- Show the note to real L2 engineers before building more.
- Mask private data. Group related calls (five tickets, one broken media server).
