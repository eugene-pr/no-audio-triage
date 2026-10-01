# Research (ChatGPT output)

## Problems

| # | Problem / who feels it | Concrete example and evidence | How it’s handled today—and the gap | Cost |
|---|---|---|---|---|
| **1** | **One-way audio after a successful connection.** Customer, agent, VoIP engineer. | Caller hears the agent; agent hears silence. FreeSWITCH documents this exact SIP-success/RTP-failure pattern. [FreeSWITCH troubleshooting](https://developer.signalwire.com/freeswitch/troubleshooting/audio/). ([FreeSWITCH Users Manual][1]) | Inspect SDP, RTP captures, NAT/firewall settings and media mode. Requires expertise and evidence from several places. | Repeat calls, unusable conversations, incident investigation. |
| **2** | **Intermittent choppy audio with unclear ownership.** Agent, customer, engineer. | Some calls sound broken, but the team cannot tell whether the problem is local networking, a carrier or media processing. Operators discuss dropped calls/jitter and interpreting FreeSWITCH quality counters. [r/VOIP](https://www.reddit.com/r/VOIP/comments/1e53tge), [FreeSWITCH mailing list](https://lists.freeswitch.org/pipermail/freeswitch-users/2017-June/126315.html). ([reddit.com][2]) | MOS, jitter/loss dashboards and packet captures. Measurements identify symptoms; they don’t automatically establish cause or the responsible party. | Repetition during calls, longer handling time, support tickets. |
| **3** | **Trunk registration stops recovering.** Ops engineer, business owner. | A January 2026 Asterisk report describes occasional `403` responses followed by registration stopping; the operator had been restarting Asterisk. [Asterisk discussion](https://community.asterisk.org/t/handling-registration-request-rejected/111576). ([Asterisk Community][3]) | Registration alerts, manual reloads, retry configuration and provider escalation. Recovery settings depend on the response and provider policy. | Unreachable numbers, missed calls, outage time. |
| **4** | **Transfers make CDR totals misleading.** Supervisor, billing/ops engineer. | One customer conversation produces several records; summing them counts overlapping consultation time. Asterisk explicitly requires CDR post-processing and recommends CEL for finer detail. [CDR specification](https://docs.asterisk.org/Configuration/Reporting/Call-Detail-Records-CDR/CDR-Specification/). ([Asterisk Documentation][4]) | SQL joins, `linkedid`, CEL reconstruction and billing rules. Basic dashboards may treat records as independent calls. | Incorrect reports, disputed charges, manual reconciliation. |
| **5** | **Callers wait while agents appear available.** Supervisor, customer, engineer. | An Asterisk 20 operator reported callers waiting **22 minutes** while available agents were not ringing. [Asterisk report](https://community.asterisk.org/t/calls-not-ringing-even-there-are-available-members/105308). ([community.asterisk.org][5]) | Check queue membership, device state, pauses, penalties, wrap-up and configuration. A dashboard snapshot may miss the state when routing happened. | Abandonment, SLA misses, wasted agent capacity. |
| **6** | **IVR ignores keypad selections.** Customer, VoIP engineer. | A production FreeSWITCH report describes received DTMF packets failing to cross from the A leg to the B leg. Callers could not use the menu. [FreeSWITCH mailing list](https://lists.freeswitch.org/pipermail/freeswitch-users/2021-February/134549.html). ([lists.freeswitch.org][6]) | Inspect negotiated telephone-event/SIP INFO/in-band handling and both call legs. “Digits received” on one leg doesn’t prove delivery to the IVR. | Repeated menus, abandoned calls, engineering time. |
| **7** | **Recording exists but contains silence or one side only.** Supervisor, QA, engineer. | An Asterisk MixMonitor report describes silent receive/transmit tracks. The response explains why equal file sizes cannot establish valid audio. [Asterisk discussion](https://community.asterisk.org/t/error-recording-using-mixmonitor/103948). ([Asterisk Community][7]) | File-existence checks and manual playback. File size alone misses silent recordings. Audio validation needs signal checks. | Lost review evidence, failed QA, investigation delays. |
| **8** | **Toll fraud / IRSF creates unexpected carrier charges.** Business owner, security/ops engineer. | An Asterisk user reported unauthorized charged calls after leaving a weak-password demo account active. [Operator account](https://community.asterisk.org/t/anyone-suffered-from-toll-fraud-pbx-hacked/74986). ([Asterisk Community][8]) | Destination restrictions, authentication controls, spend/concurrency limits and fraud monitoring. Legitimate credentials can still be abused. | Direct financial loss, emergency blocking and investigation. |
| **9** | **Log noise looks like a security incident.** Ops engineer. | A FreePBX operator saw security entries several times per second; a maintainer identified normal local AMI connections as a likely explanation. [FreePBX discussion](https://community.freepbx.org/t/asterisk-log-flooded-with-security-entries/80651). ([FreePBX Community Forums][9]) | Filters, log levels, deduplication and known-pattern rules. Unfamiliar messages still require contextual investigation. | False alarms, distracted engineers, slower incident response. |

[1]: https://developer.signalwire.com/freeswitch/troubleshooting/audio/?utm_source=chatgpt.com "Chapter 41: No Audio and One-Way Audio"

[2]: https://www.reddit.com/r/VOIP/comments/1e53tge?utm_source=chatgpt.com "Dropped Calls and Jitter"

[3]: https://community.asterisk.org/t/handling-registration-request-rejected/111576?utm_source=chatgpt.com "Handling registration request rejected - Asterisk SIP"

[4]: https://docs.asterisk.org/Configuration/Reporting/Call-Detail-Records-CDR/CDR-Specification/?utm_source=chatgpt.com "CDR Specification"

[5]: https://community.asterisk.org/t/calls-not-ringing-even-there-are-available-members/105308?utm_source=chatgpt.com "Calls not ringing even there are available members"

[6]: https://lists.freeswitch.org/pipermail/freeswitch-users/2021-February/134549.html?utm_source=chatgpt.com "[Freeswitch-users] DTMF not passing from the A Leg to the B Leg"

[7]: https://community.asterisk.org/t/error-recording-using-mixmonitor/103948?utm_source=chatgpt.com "Error recording using mixMonitor - Asterisk Support"

[8]: https://community.asterisk.org/t/anyone-suffered-from-toll-fraud-pbx-hacked/74986?utm_source=chatgpt.com "Anyone suffered from Toll Fraud? (PBX Hacked) - Asterisk"

[9]: https://community.freepbx.org/t/asterisk-log-flooded-with-security-entries/80651?utm_source=chatgpt.com "Asterisk log flooded with security entries - Security"

## Feature ideas

| Rank | Idea | What the AI does | Mock input |
|---|---|---|---|
| **1 ⭐** | **IVR misrouting auditor** | Compares the caller’s actual problem with the queue reached. Flags likely wrong routing and explains why, with transcript evidence. | IVR menu, department definitions, call route, transcript |
| **2** | **Call-note completeness checker** | Finds promises, deadlines or next steps mentioned in the call but missing from the agent’s saved notes. | Transcript, agent notes, task list |
| **3** | **VoIP incident evidence brief** | Explains the available evidence for a failed or poor-quality call and suggests the next diagnostic check. | SIP traces, RTP statistics, logs, configuration |
| **4** | **Repeat-contact cause explainer** | Compares consecutive customer conversations and identifies what remained unresolved or caused the customer to call again. | Linked transcripts, previous notes |
| **5** | **QA evidence checker** | Checks one specific business rule and flags possible violations with supporting transcript excerpts. | Transcript, short policy or checklist |
