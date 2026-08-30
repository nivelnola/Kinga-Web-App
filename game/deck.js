const SUITS = ['S', 'H', 'D', 'C']; // Spades, Hearts, Diamonds, Clubs
const RANKS = ['7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const RANK_VALUE = Object.fromEntries(RANKS.map((r, i) => [r, i]));

function cardId(suit, rank) {
  return `${rank}${suit}`;
}

function buildDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank, id: cardId(suit, rank) });
    }
  }
  return deck;
}

function shuffle(deck) {
  const cards = deck.slice();
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

function rankValue(rank) {
  return RANK_VALUE[rank];
}

function isHigherCard(a, b) {
  // Assumes same suit; returns true if a beats b.
  return rankValue(a.rank) > rankValue(b.rank);
}

module.exports = { SUITS, RANKS, buildDeck, shuffle, rankValue, isHigherCard, cardId };
