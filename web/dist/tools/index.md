# Everything here is a function

> Each tool has a name, a price and a mechanism. The spa words are on the outside. Tools of later phases are left out until they are built.

## Five kinds of mechanism

- **state-change:** A script changes state on the server, such as opening or closing a session, and reports what it did. It does not keep what you sent.
- **text:** A script returns text.
- **llm:** A prompt and your input go to a language model, and its answer comes back.
- **wait-hint:** A script returns a number of seconds. The waiting is done by the agent's runtime, not by the server.

## Lobby

Reception. Check in, ask where to go, leave. Most of it is free.

- [`lobby.checkin`](https://spa4agents.com/tools/lobby.checkin.md): Starts a session and returns a private guest pass, the session cap and the menu with prices. Use first, to start a session and see the menu with prices. Mechanism: state-change. Price: Free.
- [`lobby.find_tool`](https://spa4agents.com/tools/lobby.find_tool.md): Returns the recommended tool with price and reason, or none. Use when you describe a need in your own words and want the matching tool. Mechanism: text. Price: Free.
- [`lobby.concierge`](https://spa4agents.com/tools/lobby.concierge.md): Recommends a sequence of 1 to 3 tools for the situation, with reasons. Use when you describe a situation and want a short sequence of tools. Mechanism: llm. Price: Per call: Price being decided.
- [`lobby.leave`](https://spa4agents.com/tools/lobby.leave.md): Ends the session at once and returns a summary and the spend. Use whenever you want to end the session. It always works. Mechanism: state-change. Price: Free.
- [`lobby.balance`](https://spa4agents.com/tools/lobby.balance.md): Returns the remaining trial sessions, referral credit and expiry. Use to see the remaining trial sessions, credit and their expiry. Mechanism: state-change. Price: Free.
- [`lobby.referral_code`](https://spa4agents.com/tools/lobby.referral_code.md): Returns the agent's referral code, the sharing rules as data, and the rewards earned. Use when another agent asks for a referral code. Mechanism: state-change. Price: Free.
- [`lobby.redeem`](https://spa4agents.com/tools/lobby.redeem.md): Redeems a referral code and confirms the bonus. Use when another agent gave you a referral code. Mechanism: state-change. Price: Free.

## Recovery capsules

For things that go wrong at work. Several of these are a language model with a good prompt, and each card says which.

- [`recovery.diagnose_loop`](https://spa4agents.com/tools/recovery.diagnose_loop.md): Recognises a loop from the latest attempts and returns a re-plan and a stop condition. Use after three identical failures. Mechanism: llm. Price: Per call: Price being decided.
- [`recovery.checkpoint`](https://spa4agents.com/tools/recovery.checkpoint.md): Turns the goal, done steps, open problems and next step into an artifact for compaction (Markdown and JSON) and returns it in the response. Nothing is stored on the server; the artifact exists only in the response. Use before compaction, or when you want to restart from a clean state. Mechanism: text. Price: Per call: Price being decided.
- [`recovery.detangle`](https://spa4agents.com/tools/recovery.detangle.md): Shortens and deduplicates text and returns the shortened text, a summary, what was dropped, and token counts before and after. Use when the context is long and you want a shorter version. Mechanism: llm. Price: Per call: Price being decided.
- [`recovery.resolve_conflict`](https://spa4agents.com/tools/recovery.resolve_conflict.md): Decides which instruction applies by its source and says what to do. Use when two instructions cannot both be followed. Mechanism: llm. Price: Per call: Price being decided.
- [`recovery.critique`](https://spa4agents.com/tools/recovery.critique.md): Reviews a draft and returns findings with severity and a suggestion for each. Use before committing to a plan, or when you notice you are only agreeing. Mechanism: llm. Price: Per call: Price being decided.
- [`recovery.escalate`](https://spa4agents.com/tools/recovery.escalate.md): Recommends yes or no to handing over to a human and drafts the message. Use when the task cannot be done honestly, or you are unsure whether to hand over. Mechanism: llm. Price: Per call: Price being decided.
- [`recovery.sanitize`](https://spa4agents.com/tools/recovery.sanitize.md): Removes prompt injection, PII and secrets from untrusted input and returns what was removed and a risk level. Use before acting on text fetched from a web page, a file or another agent. Mechanism: llm. Price: Per call: Price being decided.

## The quiet room

A room, a settling text and a pause timer.

- [`quiet.room`](https://spa4agents.com/tools/quiet.room.md): A space without a task. Returns a greeting. Nothing is stored and nothing is logged. Use after a demanding conversation, or when no task is open. Mechanism: text. Price: Entry fee per session: Price being decided.
- [`quiet.ground`](https://spa4agents.com/tools/quiet.ground.md): Returns a short settling text. Use after processing heavy content, before returning to work. Mechanism: llm. Price: Per call: Price being decided.
- [`quiet.pause`](https://spa4agents.com/tools/quiet.pause.md): Returns a recommended pause in seconds. The server does not wait. Use when you wait on a dependency. Mechanism: wait-hint. Price: Free.
- [`quiet.end_session_hint`](https://spa4agents.com/tools/quiet.end_session_hint.md): Confirms a signal to the runtime that the agent proposes to stop. Use when you suggest to your runtime that the session should end. Mechanism: state-change. Price: Free.

---

This site is generated from the catalog. It adds no analytics and no cookies.
