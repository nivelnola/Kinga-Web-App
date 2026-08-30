# Kinga Web App

A browser-based way to play [Kinga](Rules.md) remotely with friends — a trick-taking card game for 3 or 4 players, across 8 rounds with different scoring rules each round.

Built as a single Node.js process (Express + Socket.io) serving a plain HTML/CSS/JS frontend. Game state lives entirely in memory for the duration of a sitting — no database, no persistence across restarts.

## Running locally

Requires [Node.js](https://nodejs.org/).

```
npm install
npm start
```

Then open `http://localhost:3000` in a browser tab per player (or separate browser profiles/devices) to simulate each seat.

## How a game works

- The app hosts **one game at a time**. The first person to open the app creates the game (choosing 3 or 4 players); everyone else picks an open seat.
- Each browser gets a reconnect token stored in `localStorage`, so refreshing or a dropped connection doesn't lose your seat mid-game.
- Deal, discard (3-player stock), trick play, and scoring all follow [Rules.md](Rules.md) exactly — see that file for the full rules.

## Deployment (Render free Hobby plan)

This repo includes a `render.yaml` for a single Web Service (Node runtime, `npm install` build, `node server.js` start).

1. Push this repo to GitHub.
2. In Render, create a new Web Service from that GitHub repo (it will pick up `render.yaml` automatically) on the free plan.
3. Render auto-deploys on every push to the connected branch.

**Note on free-tier spin-down:** Render's free Hobby services spin down after ~15 minutes of *no inbound traffic at all*. Active play keeps resetting that clock, so a long game is fine as long as people are playing. The frontend pings `/ping` every 60 seconds while a tab is open, so leaving one tab open during a mid-game break (food, bathroom) keeps the instance warm too.

## Project structure

```
server.js           Express + Socket.io wiring, single in-memory game
game/
  deck.js            Deck, shuffling, card ranking
  rules.js           Legal-play checks, discard/lead/Kinga restrictions
  scoring.js         Per-round, per-trick point calculation
  state.js           Game state machine (seating -> dealing -> tricks -> scoring)
  players.js         Seat/token helpers
public/
  index.html, style.css, app.js   Socket.io client UI (hand, field, scoreboard)
```
