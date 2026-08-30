const { isKinga } = require('./scoring');
const { rankValue } = require('./deck');

const HEARTS_LEAD_RESTRICTED_ROUNDS = [2, 6, 7, 8];
const KINGA_FORCED_ROUNDS = [6]; // forced-Kinga-play only applies in Round 6, not the melee rounds

const DISCARD_RESTRICTED_ROUNDS = {
  hearts: [2, 7, 8],
  lads: [3, 7, 8],
  ladies: [4, 7, 8],
  kinga: [6, 7, 8],
};

function canDiscardToStock(card, roundNumber) {
  if (card.suit === 'H' && DISCARD_RESTRICTED_ROUNDS.hearts.includes(roundNumber)) return false;
  if (card.rank === 'J' && DISCARD_RESTRICTED_ROUNDS.lads.includes(roundNumber)) return false;
  if (card.rank === 'Q' && DISCARD_RESTRICTED_ROUNDS.ladies.includes(roundNumber)) return false;
  if (isKinga(card) && DISCARD_RESTRICTED_ROUNDS.kinga.includes(roundNumber)) return false;
  return true;
}

// Cards a player is allowed to play, given their hand, the suit led this
// trick (null if they are leading), and the current round number.
function legalPlays(hand, ledSuit, roundNumber) {
  if (ledSuit === null) {
    // Leading the trick.
    const heartsRestricted = HEARTS_LEAD_RESTRICTED_ROUNDS.includes(roundNumber);
    const hasNonHeart = hand.some((c) => c.suit !== 'H');
    if (heartsRestricted && hasNonHeart) {
      const nonHearts = hand.filter((c) => c.suit !== 'H');
      return nonHearts.length > 0 ? nonHearts : hand;
    }
    return hand;
  }

  const followSuit = hand.filter((c) => c.suit === ledSuit);
  if (followSuit.length > 0) return followSuit;

  // Can't follow suit.
  if (KINGA_FORCED_ROUNDS.includes(roundNumber)) {
    const kinga = hand.find(isKinga);
    if (kinga) return [kinga];
  }
  return hand;
}

function isLegalPlay(card, hand, ledSuit, roundNumber) {
  const legal = legalPlays(hand, ledSuit, roundNumber);
  return legal.some((c) => c.id === card.id);
}

function trickWinner(trickCards, ledSuit) {
  // trickCards: [{ seat, card }], in play order. trickCards[0] led the trick.
  let winner = trickCards[0];
  for (const entry of trickCards.slice(1)) {
    if (entry.card.suit === ledSuit && rankValue(entry.card.rank) > rankValue(winner.card.rank)) {
      winner = entry;
    }
  }
  return winner.seat;
}

module.exports = { canDiscardToStock, legalPlays, isLegalPlay, trickWinner, HEARTS_LEAD_RESTRICTED_ROUNDS, KINGA_FORCED_ROUNDS };
