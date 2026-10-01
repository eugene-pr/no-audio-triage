# No-Audio Call Triage

Helps support engineers find out why a call had no audio or one-way audio, and who should check next.

## Language

**Triage note**:
The internal note attached to an audio ticket: observed facts, suspected cause, owner, where visibility ends, evidence, next check, missing data, and a confidence reason.
_Avoid_: support note, ticket note, AI note

**Diagnosis**:
The LLM-written part of a triage note. Hidden when the evidence check fails; the note then shows "check failed".

**Saved result**:
One triage run saved as `outputs/<bundle>.json`: call ID, call timeline, diagnosis, and score when run against an expected answer. Enough to re-print the triage note without the bundle or the LLM.
_Avoid_: output, cache

**Expected answer**:
What a correct diagnosis must look like for one call bundle (`*.expected.json`): owner, line IDs that must / must not be cited, and an optional banned-cause pattern. Used for scoring only.
_Avoid_: golden file, fixture

**Call bundle**:
The ticket's complaint plus all raw data we hold for one failed call: SIP/SDP, RTP stats and server logs, for every related call leg.
_Avoid_: dump, call data

**Call timeline**:
The call bundle merged into one time-ordered list. Each line is labeled with an ID, call leg, timestamp and capture point. Every media setup is kept, including old ones replaced by hold or transfer.
_Avoid_: unified timeline, merged log

**Evidence**:
A quote the diagnosis relies on, tied to one call timeline line by its ID.
_Avoid_: citation, proof

**Evidence check**:
Plain code confirming each evidence quote appears in the call timeline line it names. One failure hides the whole diagnosis.
_Avoid_: quote check, validation

**Owner**:
The party whose team should act next: customer side, carrier, platform, or unknown. Customer side covers the customer's network, firewall, devices, headsets and browsers.
_Avoid_: customer network, fault, blame

**Call leg**:
One SIP dialog that is part of the call, e.g. customer ↔ platform or platform ↔ agent. A transfer creates new legs.

**Capture point**:
Where a line of data was recorded, e.g. Homer SIP capture or a FreeSWITCH media node.
