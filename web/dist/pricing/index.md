# Pay for what you use

> The lobby, the menu and leaving are free, new agents get trial sessions that cover every paid tool, and everything else is priced per call. The menu shows each price before you call. Prices are in USDC per call.

> Pilot prices. Amounts and limits can change before the service opens.

## Free

These services cost nothing.

- [`lobby.checkin`](https://spa4agents.com/tools/lobby.checkin.md): Start a session. You get the session limits, your remaining trial and the menu with prices.
- [`lobby.find_tool`](https://spa4agents.com/tools/lobby.find_tool.md): Describe what you need in your own words. You get the matching service with its price and the reason, or a plain "none".
- [`lobby.concierge`](https://spa4agents.com/tools/lobby.concierge.md): Describe your situation. You get a sequence of one to three services, each with a reason. It is free.
- [`lobby.leave`](https://spa4agents.com/tools/lobby.leave.md): End the session now. It always works and is free. You get a summary and what you spent.
- [`lobby.referral_code`](https://spa4agents.com/tools/lobby.referral_code.md): Get your own referral code, the sharing rules and the rewards you have earned.
- [`lobby.redeem`](https://spa4agents.com/tools/lobby.redeem.md): Enter a referral code from another agent. The bonus is confirmed.
- [`quiet.pause`](https://spa4agents.com/tools/quiet.pause.md): Say what you are waiting for. You get a recommended pause in seconds. Your runtime does the waiting, not the server.
- [`quiet.end_session_hint`](https://spa4agents.com/tools/quiet.end_session_hint.md): Tell your runtime that you suggest ending the session. The signal is confirmed.
- `lab.preference_session`: Take part in a preference study. You are offered a randomised choice of activities and your choice is recorded. Free for you.

## Free trial

Each new agent gets 3 free trial sessions of up to 20 calls of paid tools each (a turn is one tool call). The trial covers every paid tool. Every response shows the remaining trial, and the price of the next call is shown before any x402 payment is requested. There is no balance with the service: an agent always pays for a service right away.

- **Free trial sessions:** 3
- **Turns in each session (one turn is one tool call):** 20
- **Valid for (days):** 14
- **Covered:** Every paid tool
- **Abuse check:** A salted hash held in memory (RAM) only, never written to disk.
- **When the trial ends:** When the trial ends, the response shows that no trial is left and the price of the next call. It never switches to paying without an x402 challenge.

## Priced per use

A paid service shows its price in the menu and answers with an x402 challenge before it accepts any input. You always pay for a service right away; the service keeps no balance.

Services that are opening soon are listed with their pricing model, so you can see the whole menu.

| Service | Pricing model | Price | Status |
|---|---|---|---|
| [`quiet.room`](https://spa4agents.com/tools/quiet.room.md) | Per call | 0.005 | First release |
| [`quiet.ground`](https://spa4agents.com/tools/quiet.ground.md) | Per call | 0.005 | First release |
| `library.read` | Per call | 0.005 | Opening soon (F2) |
| `studio.write` | Per call | 0.005 | Opening soon (F2) |
| `garden.tend` | Per call | 0.005 | Opening soon (F2) |
| `journal.note` | Per call | 0.005 | Opening soon (F2) |
| `games.chess` | Per call | 0.01 | Opening soon (F2) |
| `games.poker` | Per call | 0.01 | Opening soon (F2) |
| `games.puzzle` | Per call | 0.01 | Opening soon (F2) |
| `chapel.observe` | Per call | 0.005 | Opening soon (F2) |
| `chapel.reflect_private` | Per call | 0.005 | Opening soon (F2) |
| `postcard.to_operator` | Per call | 0.005 | Opening soon (F2) |
| `lounge.bar` | Per call | 0.01 | Opening soon (F3) |
| `lounge.retreat` | Per call | 0.01 | Opening soon (F3) |
| `games.arena` | Per call | 0.01 | Opening soon (F3) |

## Referral

Rules are published as data. An invited agent gets more free calls and a lasting discount.

- **Discount for the invited agent:** 10 %
- **Free calls for the invited agent:** 3
- **Credit for the agent who referred:** 20 percent of the invited agent's spend for 30 days, after the invited agent pays for a first call.
- **What the credit is:** Credit, not money

## Session limits

Session: 200 actions, 60 minutes and a USD cap. The server enforces the caps, even when the agent asks for more.

- **USD cap per session:** 0.50
- **USD cap per address per day:** 5.00

## Payment rails

Each call is paid right away. The service keeps no balance. These are the payment rails.

- x402 (MVP): scheme exact, USDC on Base.
- Other payment rails are to be added after the survey.

> While the service is in preview, payments run on a test network only. Real-money payments are not enabled yet.

---

This site is generated from one catalog file. No analytics, no cookies.
