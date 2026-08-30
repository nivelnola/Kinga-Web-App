const { buildDeck, shuffle } = require('./deck');
const { legalPlays, isLegalPlay, trickWinner, canDiscardToStock } = require('./rules');
const { scoreRound, ROUND_NAMES } = require('./scoring');
const { generateToken, createSeats } = require('./players');

const TOTAL_ROUNDS = 8;

class GameState {
  constructor(playerCount) {
    this.playerCount = playerCount;
    this.totalTricks = playerCount === 3 ? 10 : 8;
    this.seats = createSeats(playerCount);
    this.dealerSeat = 0;
    this.roundNumber = 1;
    this.phase = 'seating'; // seating -> discard (3p only) -> trick -> round_scoring -> game_over
    this.currentLeader = null;
    this.currentTurn = null;
    this.ledSuit = null;
    this.currentTrickPlays = []; // [{seat, card}]
    this.tricksThisRound = []; // [{winnerSeat, cards:[card,...]}]
    this.stock = [];
    this.scores = Object.fromEntries(Array.from({ length: playerCount }, (_, s) => [s, 0]));
    this.roundHistory = [];
    this.lastTrickWinner = null;
    this.rematchReady = new Set();
  }

  openSeats() {
    return this.seats.filter((s) => s.token === null).map((s) => s.seat);
  }

  claimSeat(seatIndex, name) {
    const seat = this.seats[seatIndex];
    if (!seat || seat.token !== null) return null;
    seat.name = name;
    seat.token = generateToken();
    seat.connected = true;
    if (this.seats.every((s) => s.token !== null) && this.phase === 'seating') {
      this.startRound();
    }
    return seat.token;
  }

  findSeatByToken(token) {
    if (!token) return null;
    return this.seats.find((s) => s.token === token) || null;
  }

  setConnected(seatIndex, connected) {
    if (this.seats[seatIndex]) this.seats[seatIndex].connected = connected;
  }

  renameSeat(seatIndex, name) {
    const seat = this.seats[seatIndex];
    if (!seat) return { error: 'Invalid seat.' };
    const trimmed = (name || '').trim().slice(0, 20);
    if (!trimmed) return { error: 'Name cannot be empty.' };
    seat.name = trimmed;
    return { ok: true };
  }

  startRound() {
    const deck = shuffle(buildDeck());
    this.tricksThisRound = [];
    this.currentTrickPlays = [];
    this.ledSuit = null;
    this.stock = [];

    if (this.playerCount === 3) {
      for (let i = 0; i < this.playerCount; i++) this.seats[i].hand = deck.slice(i * 10, i * 10 + 10);
      this.stock = deck.slice(30, 32);
      this.currentLeader = (this.dealerSeat + 1) % this.playerCount;
      this.seats[this.currentLeader].hand.push(...this.stock);
      this.phase = 'discard';
      this.currentTurn = this.currentLeader;
    } else {
      for (let i = 0; i < this.playerCount; i++) this.seats[i].hand = deck.slice(i * 8, i * 8 + 8);
      this.currentLeader = (this.dealerSeat + 1) % this.playerCount;
      this.currentTurn = this.currentLeader;
      this.phase = 'trick';
    }
  }

  discardCards(seat, cardIds) {
    if (this.phase !== 'discard' || seat !== this.currentLeader) {
      return { error: 'Not your turn to discard.' };
    }
    if (cardIds.length !== 2) return { error: 'Must discard exactly 2 cards.' };
    const hand = this.seats[seat].hand;
    const cards = cardIds.map((id) => hand.find((c) => c.id === id));
    if (cards.some((c) => !c)) return { error: 'Card not in hand.' };
    for (const card of cards) {
      if (!canDiscardToStock(card, this.roundNumber)) {
        return { error: `${card.rank}${card.suit} cannot be discarded this round.` };
      }
    }
    this.seats[seat].hand = hand.filter((c) => !cardIds.includes(c.id));
    this.stock = [];
    this.phase = 'trick';
    this.currentTurn = this.currentLeader;
    return { ok: true };
  }

  playCard(seat, cardId) {
    if (this.phase !== 'trick' || seat !== this.currentTurn) {
      return { error: 'Not your turn.' };
    }
    const hand = this.seats[seat].hand;
    const card = hand.find((c) => c.id === cardId);
    if (!card) return { error: 'Card not in hand.' };
    if (!isLegalPlay(card, hand, this.ledSuit, this.roundNumber)) {
      return { error: 'Illegal play.' };
    }

    this.seats[seat].hand = hand.filter((c) => c.id !== cardId);
    if (this.currentTrickPlays.length === 0) this.ledSuit = card.suit;
    this.currentTrickPlays.push({ seat, card });

    if (this.currentTrickPlays.length < this.playerCount) {
      this.currentTurn = (seat + 1) % this.playerCount;
      return { ok: true };
    }

    // Trick complete. Leave the played cards on the field and pause here;
    // server.js schedules advanceTrick() after a short delay so every client
    // gets to see who won before the field clears.
    const winnerSeat = trickWinner(this.currentTrickPlays, this.ledSuit);
    this.tricksThisRound.push({
      winnerSeat,
      cards: this.currentTrickPlays.map((p) => p.card),
    });
    this.lastTrickWinner = winnerSeat;
    this.phase = 'trick_complete';
    this.currentTurn = null;
    return { ok: true, trickComplete: true };
  }

  advanceTrick() {
    const winnerSeat = this.lastTrickWinner;
    this.currentTrickPlays = [];
    this.ledSuit = null;
    this.lastTrickWinner = null;

    if (this.tricksThisRound.length === this.totalTricks) {
      this.finishRound();
    } else {
      this.currentLeader = winnerSeat;
      this.currentTurn = winnerSeat;
      this.phase = 'trick';
    }
  }

  finishRound() {
    const { perSeatPoints, breakdown } = scoreRound(this.roundNumber, this.playerCount, this.tricksThisRound);
    for (const [seat, points] of Object.entries(perSeatPoints)) {
      this.scores[seat] += points;
    }
    this.roundHistory.push({
      roundNumber: this.roundNumber,
      roundName: ROUND_NAMES[this.roundNumber],
      perSeatPoints,
      breakdown,
    });

    if (this.roundNumber === TOTAL_ROUNDS) {
      this.phase = 'game_over';
      this.currentTurn = null;
      this.currentLeader = null;
      this.rematchReady = new Set();
      return;
    }

    this.roundNumber += 1;
    this.dealerSeat = (this.dealerSeat + 1) % this.playerCount;
    this.startRound();
  }

  markReadyForRematch(seatIndex) {
    if (this.phase !== 'game_over') return { error: 'Game is not over.' };
    this.rematchReady.add(seatIndex);
    if (this.rematchReady.size === this.playerCount) this.resetForRematch();
    return { ok: true };
  }

  resetForRematch() {
    this.roundNumber = 1;
    this.scores = Object.fromEntries(this.seats.map((s) => [s.seat, 0]));
    this.roundHistory = [];
    this.tricksThisRound = [];
    this.currentTrickPlays = [];
    this.lastTrickWinner = null;
    this.ledSuit = null;
    this.stock = [];
    this.rematchReady = new Set();
    this.dealerSeat = (this.dealerSeat + 1) % this.playerCount;
    this.startRound();
  }

  // Builds the view a given seat's client should see: their own hand, everyone
  // else's hand sizes only, the current field, scores, and round info.
  viewForSeat(seatIndex) {
    const mySeat = this.seats[seatIndex];
    const legal = this.phase === 'trick' && this.currentTurn === seatIndex
      ? legalPlays(mySeat.hand, this.ledSuit, this.roundNumber).map((c) => c.id)
      : [];
    const legalDiscard = this.phase === 'discard' && this.currentLeader === seatIndex;
    const { perSeatPoints: liveRoundPoints } = scoreRound(
      this.roundNumber, this.playerCount, this.tricksThisRound, this.totalTricks
    );

    return {
      playerCount: this.playerCount,
      roundNumber: this.roundNumber,
      roundName: ROUND_NAMES[this.roundNumber],
      totalTricks: this.totalTricks,
      tricksTaken: this.tricksThisRound.length,
      phase: this.phase,
      dealerSeat: this.dealerSeat,
      currentLeader: this.currentLeader,
      currentTurn: this.currentTurn,
      ledSuit: this.ledSuit,
      yourSeat: seatIndex,
      yourHand: mySeat.hand,
      legalCardIds: legal,
      canDiscard: legalDiscard,
      field: this.currentTrickPlays.map((p) => ({ seat: p.seat, card: p.card })),
      stock: this.phase === 'discard' ? this.stock : [],
      seats: this.seats.map((s) => ({
        seat: s.seat,
        name: s.name,
        connected: s.connected,
        handCount: s.hand.length,
        tricksWon: this.tricksThisRound.filter((t) => t.winnerSeat === s.seat).length,
      })),
      scores: this.scores,
      roundScores: Object.fromEntries(this.seats.map((s) => [s.seat, liveRoundPoints[s.seat] || 0])),
      roundHistory: this.roundHistory,
      trickWinnerSeat: this.phase === 'trick_complete' ? this.lastTrickWinner : null,
      rematchReady: Array.from(this.rematchReady),
    };
  }
}

module.exports = { GameState, TOTAL_ROUNDS };
