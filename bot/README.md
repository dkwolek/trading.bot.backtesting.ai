# Grid Bot

Spot-only grid bot. Places resting limit buys on Kraken below the market and
pairs each fill with a limit take-profit sell one step above. The 15s poll
only reconciles order statuses — the actual buy/sell triggers live on the
exchange.

## How it works

1. Starts flat. First tick anchors the grid top at
   `floor(currentPrice / stepPrice) * stepPrice` and places limit buys at the
   top level and each step below until `maxOpenPositions` slots are filled.
2. Each tick queries the state of every outstanding order:
   - A **buy** that closed transitions the slot to `owned` and a TP limit
     sell is placed at `level + stepPrice`.
   - A **TP sell** that closed realises PnL and frees the slot.
   - Any canceled/expired order is reconciled (slot dropped or TP re-placed).
3. After reconciliation the bot tops the slot count back up to
   `maxOpenPositions` with fresh limit buys one step below the deepest slot.
4. When every slot has closed the grid re-anchors on the next tick.

## Config

Copy `config.example.json` to `config.json` and adjust:

- `pair` — Kraken altname, e.g. `ETHUSDC`
- `amountPerLevel` — quote currency spent per buy
- `stepPrice` — grid spacing in quote currency
- `maxOpenPositions` — max slots (pending buy + owned) active at once
- `maxGridDepth` — stop opening new buys once deepest slot is this many steps below the grid top
- `pollIntervalMs` — reconcile cadence (min 1000)

State (open slots, running totals) lives in `state.json`; delete it for a
fresh start.

## Environment

`.env` must contain:

```
KRAKEN_API_KEY=...
KRAKEN_API_SECRET=...
```

## Run

```
cd bot
npm install
npm start
```

`Ctrl+C` cancels pending buys but **leaves any TP sells in place** so a
profitable exit can still fire after the bot is down.

## Notes

- Spot only, no leverage, no shorts.
- Buys and sells are limit orders. Limit buys below the market wait for
  price; limit sells above wait for the TP trigger. No market orders are
  used by the main flow.
- Kraken-reported fees are aggregated into `state.json`.
