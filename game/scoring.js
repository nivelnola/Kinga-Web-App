// Round definitions: which scoring categories are active each round, and the
// player-count-specific point value for each category.
//
// Category costs (3-player), per Rules.md:
//   allTricks: -4   hearts: -5   lads: -10   ladies: -10   lastTwo: -20   kinga: -40
// Category costs (4-player):
//   allTricks: -2   hearts: -2   lads: -4    ladies: -4    lastTwo: -8    kinga: -16
// Round 7 uses the base (negative) costs across all categories at once.
// Round 8 doubles every cost and flips the sign positive.

const BASE_COSTS = {
  3: { allTricks: -4, hearts: -5, lads: -10, ladies: -10, lastTwo: -20, kinga: -40 },
  4: { allTricks: -2, hearts: -2, lads: -4, ladies: -4, lastTwo: -8, kinga: -16 },
};

const ROUND_CATEGORIES = {
  1: ['allTricks'],
  2: ['hearts'],
  3: ['lads'],
  4: ['ladies'],
  5: ['lastTwo'],
  6: ['kinga'],
  7: ['allTricks', 'hearts', 'lads', 'ladies', 'lastTwo', 'kinga'],
  8: ['allTricks', 'hearts', 'lads', 'ladies', 'lastTwo', 'kinga'],
};

const ROUND_NAMES = {
  1: 'All Tricks',
  2: 'Hearts',
  3: 'Jacks (Lads)',
  4: 'Queens (Ladies)',
  5: 'Last Two Tricks',
  6: 'King of Hearts (The Kinga)',
  7: 'Negative Melee',
  8: 'Positive Melee',
};

function costsForRound(roundNumber, playerCount) {
  const base = BASE_COSTS[playerCount];
  if (roundNumber !== 8) return base;
  const doubled = {};
  for (const key of Object.keys(base)) doubled[key] = base[key] * -2;
  return doubled;
}

function isKinga(card) {
  return card.suit === 'H' && card.rank === 'K';
}

// tricks: ordered array of { winnerSeat, cards: [card, ...] } for the whole round.
// Returns { perSeatPoints: {seat: points}, breakdown: [{trickIndex, winnerSeat, categoryPoints, total}] }
function scoreRound(roundNumber, playerCount, tricks) {
  const categories = ROUND_CATEGORIES[roundNumber];
  const costs = costsForRound(roundNumber, playerCount);
  const perSeatPoints = {};
  const breakdown = [];
  const totalTricks = tricks.length;

  tricks.forEach((trick, index) => {
    const isLastTwo = index >= totalTricks - 2;
    const categoryPoints = {};
    let trickTotal = 0;

    for (const category of categories) {
      let points = 0;
      if (category === 'allTricks') {
        points = costs.allTricks;
      } else if (category === 'lastTwo') {
        points = isLastTwo ? costs.lastTwo : 0;
      } else if (category === 'hearts') {
        const count = trick.cards.filter((c) => c.suit === 'H').length;
        points = count * costs.hearts;
      } else if (category === 'lads') {
        const count = trick.cards.filter((c) => c.rank === 'J').length;
        points = count * costs.lads;
      } else if (category === 'ladies') {
        const count = trick.cards.filter((c) => c.rank === 'Q').length;
        points = count * costs.ladies;
      } else if (category === 'kinga') {
        const count = trick.cards.filter(isKinga).length;
        points = count * costs.kinga;
      }
      if (points !== 0) categoryPoints[category] = points;
      trickTotal += points;
    }

    perSeatPoints[trick.winnerSeat] = (perSeatPoints[trick.winnerSeat] || 0) + trickTotal;
    breakdown.push({ trickIndex: index, winnerSeat: trick.winnerSeat, categoryPoints, total: trickTotal });
  });

  return { perSeatPoints, breakdown };
}

module.exports = { scoreRound, costsForRound, ROUND_CATEGORIES, ROUND_NAMES, isKinga };
