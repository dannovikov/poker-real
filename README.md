# poker-real

Hyper-realistic poker simulator. Tuesday night, $1/$2 no-limit, worn felt, bad coffee, and the guy in seat 3 won't stop talking about his divorce.

## Play

```bash
npm install
npm run dev
```

## What's here

- **Texas Hold'em engine** — full game logic with deck, shuffle, deal, betting rounds, hand evaluation, pot/side-pot management, winner determination
- **AI opponents** — 5 distinct personalities (tight Earl, aggro Dustin, grinding Vicky, calling-station Maurice, wildcard Tammy) with varied playstyles
- **Casino atmosphere** — worn felt, fluorescent lights, water-stained ceiling tiles, procedural ambient audio (slot chimes, chip clacks, HVAC hum, distant murmurs, PA dings)
- **First-person table UI** — your cards, community cards, chip stacks, betting controls with fold/check/call/raise + slider
- **Landing screen** — casino floor vibe with patterned carpet and distant slot machine lights

## Tech

React + TypeScript + Vite. No external assets — all audio is procedurally generated via Web Audio API.
