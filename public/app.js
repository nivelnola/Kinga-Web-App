const socket = io();

const SUIT_SYMBOL = { S: '♠', H: '♥', D: '♦', C: '♣' };
const RED_SUITS = ['H', 'D'];

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
const TOTAL_ROUNDS = 8;

const ROUND_RULES = {
  1: 'Standard rules apply. Each trick taken is worth -4 (3p) / -2 (4p) to whoever takes it.',
  2: 'Hearts cannot be discarded to the stock, and cannot be led unless a player has no other suit. Each Heart taken is worth -5 (3p) / -2 (4p).',
  3: 'Jacks cannot be discarded to the stock. Each Jack taken is worth -10 (3p) / -4 (4p).',
  4: 'Queens cannot be discarded to the stock. Each Queen taken is worth -10 (3p) / -4 (4p).',
  5: 'Standard rules apply. Only the last two tricks of the round score, at -20 (3p) / -8 (4p) each.',
  6: 'The King of Hearts (the Kinga) cannot be discarded, and must be played if a player can’t follow suit. Hearts cannot be led unless a player has no other suit. Only the Kinga scores, worth -40 (3p) / -16 (4p).',
  7: 'All categories from Rounds 1-6 apply at once (base values), except the Kinga is not forced. A single trick can score in multiple categories.',
  8: 'All categories from Rounds 1-6 apply at once, doubled and positive. A single trick can score in multiple categories.',
};

const RULES_HTML = `
<section>
  <h3>Overview</h3>
  <p>Kinga is a trick-taking game for 3 or 4 players, played over 8 rounds with different scoring contracts. A standard deck trimmed to 7-through-Ace (32 cards) is used.</p>
</section>
<section>
  <h3>Dealing &amp; Play</h3>
  <p>Each round the dealer deals out the hands. In a 3-player game, two cards are set aside as a stock; the player after the dealer takes the stock into their hand, discards two cards face-down, then leads the first trick. In a 4-player game there is no stock; the player after the dealer leads immediately.</p>
  <p>The first card played to a trick sets its suit &mdash; everyone else must follow suit if able. The highest card of the led suit wins the trick.</p>
</section>
<section>
  <h3>Rounds</h3>
  <table>
    <tr><th>#</th><th>Round</th><th>Rule</th></tr>
    ${Object.keys(ROUND_NAMES).map((n) => `<tr><td>${n}</td><td>${ROUND_NAMES[n]}</td><td>${ROUND_RULES[n]}</td></tr>`).join('')}
  </table>
</section>
<section>
  <h3>Scoring</h3>
  <p>Each round's points are split among the players who took the scoring cards, and the game is zero-sum: Round 8 doubles and flips Round 7's categories to positive. After all 8 rounds, highest total score wins.</p>
</section>
`;

const screens = {
  create: document.getElementById('setup-create'),
  seat: document.getElementById('setup-seat'),
  game: document.getElementById('game'),
  gameOver: document.getElementById('game-over'),
};

function showScreen(name) {
  for (const el of Object.values(screens)) el.classList.add('hidden');
  screens[name].classList.remove('hidden');
}

function getToken() {
  return localStorage.getItem('kinga_token');
}
function setToken(token) {
  localStorage.setItem('kinga_token', token);
}

socket.on('connect', () => {
  socket.emit('rejoin', { token: getToken() });
});

socket.on('need_setup', (data) => {
  if (data.stage === 'create') {
    showScreen('create');
  } else {
    showScreen('seat');
    renderSeatList(data);
  }
});

socket.on('seat_claimed', ({ token }) => {
  setToken(token);
  showScreen('game');
});

socket.on('error_message', (msg) => {
  const el = document.getElementById('status-msg');
  el.textContent = msg;
  setTimeout(() => { if (el.textContent === msg) el.textContent = ''; }, 3000);
});

socket.on('state', (view) => {
  if (view.phase === 'game_over') {
    showScreen('gameOver');
    renderGameOver(view);
  } else {
    showScreen('game');
    renderGame(view);
  }
});

document.getElementById('rules-modal-body').innerHTML = RULES_HTML;
document.getElementById('rules-btn').addEventListener('click', () => {
  document.getElementById('round-rules-popover').classList.add('hidden');
  document.getElementById('rules-modal').classList.remove('hidden');
});
document.getElementById('rules-close-btn').addEventListener('click', () => {
  document.getElementById('rules-modal').classList.add('hidden');
});
document.getElementById('rules-modal').addEventListener('click', (e) => {
  if (e.target.id === 'rules-modal') document.getElementById('rules-modal').classList.add('hidden');
});

document.getElementById('round-rules-btn').addEventListener('click', (e) => {
  e.stopPropagation();
  document.getElementById('round-rules-popover').classList.toggle('hidden');
});
document.addEventListener('click', () => {
  document.getElementById('round-rules-popover').classList.add('hidden');
});

let audioCtx = null;
function playTurnChime() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const now = audioCtx.currentTime;
    [880, 1320].forEach((freq, i) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const start = now + i * 0.12;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.2, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.25);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(start);
      osc.stop(start + 0.3);
    });
  } catch (e) { /* audio unavailable */ }
}

function isDangerous(card, view) {
  const { roundNumber, tricksTaken, totalTricks } = view;
  if (roundNumber === 2) return card.suit === 'H';
  if (roundNumber === 3) return card.rank === 'J';
  if (roundNumber === 4) return card.rank === 'Q';
  if (roundNumber === 6) return card.suit === 'H' && card.rank === 'K';
  if (roundNumber === 5) return tricksTaken >= totalTricks - 2;
  return false; // Rounds 1, 7, 8: too many simultaneous categories to usefully highlight.
}

function getHintMode() {
  return localStorage.getItem('kinga_hint_mode') === 'on';
}
const hintToggle = document.getElementById('hint-toggle');
hintToggle.checked = getHintMode();
hintToggle.addEventListener('change', () => {
  localStorage.setItem('kinga_hint_mode', hintToggle.checked ? 'on' : 'off');
  if (lastView) renderGame(lastView);
});

let lastView = null;
let renamingOpen = false;
document.getElementById('create-game-btn').addEventListener('click', () => {
  const name = document.getElementById('create-name').value.trim() || 'Player 1';
  const playerCount = parseInt(document.getElementById('create-player-count').value, 10);
  socket.emit('create_game', { playerCount, name });
});

function renderSeatList(data) {
  const list = document.getElementById('seat-list');
  list.innerHTML = '';
  for (let i = 0; i < data.playerCount; i++) {
    const seatInfo = data.seats.find((s) => s.seat === i);
    const div = document.createElement('div');
    const isOpen = data.openSeats.includes(i);
    div.className = 'seat-option' + (isOpen ? '' : ' taken');
    div.textContent = isOpen ? `Seat ${i + 1} (open)` : `Seat ${i + 1}: ${seatInfo.name}`;
    if (isOpen) {
      div.addEventListener('click', () => {
        const name = document.getElementById('seat-name').value.trim() || `Player ${i + 1}`;
        socket.emit('claim_seat', { seatIndex: i, name });
      });
    }
    list.appendChild(div);
  }
}

let selectedForDiscard = [];

function cardLabel(card) {
  return { rank: card.rank, suit: SUIT_SYMBOL[card.suit], red: RED_SUITS.includes(card.suit) };
}

function renderCardEl(card, { legal, selected, onClick, dangerous }) {
  const el = document.createElement('div');
  const label = cardLabel(card);
  el.className = 'card' + (label.red ? ' red' : '') + (legal === false ? ' illegal' : '') +
    (selected ? ' selected' : '') + (dangerous ? ' dangerous' : '');
  el.innerHTML = `<div>${label.rank}</div><div>${label.suit}</div>`;
  if (onClick) el.addEventListener('click', onClick);
  return el;
}

let lastTurnSeat = undefined;

function renderGame(view) {
  lastView = view;
  document.getElementById('round-info').textContent =
    `Round ${view.roundNumber}/8: ${view.roundName} — trick ${view.tricksTaken + (view.phase === 'trick' ? 1 : 0)}/${view.totalTricks}`;
  document.getElementById('round-rules-popover').innerHTML =
    `<h3>Round ${view.roundNumber}: ${view.roundName}</h3><p>${ROUND_RULES[view.roundNumber] || ''}</p>`;

  const turnSeat = view.phase === 'discard' ? view.currentLeader : view.currentTurn;
  const turnName = view.seats.find((s) => s.seat === turnSeat)?.name || '';
  if (view.phase === 'trick_complete') {
    const winnerName = view.seats.find((s) => s.seat === view.trickWinnerSeat)?.name || '';
    document.getElementById('turn-info').textContent = `${winnerName} takes the trick!`;
  } else {
    document.getElementById('turn-info').textContent =
      turnSeat === view.yourSeat ? "Your turn" : turnSeat !== null ? `Waiting on ${turnName}` : '';
  }

  if (turnSeat === view.yourSeat && lastTurnSeat !== view.yourSeat) {
    playTurnChime();
  }
  lastTurnSeat = turnSeat;

  const seatsRow = document.getElementById('seats-row');
  seatsRow.innerHTML = '';
  renamingOpen = false;
  for (const s of view.seats) {
    const chip = document.createElement('div');
    chip.className = 'seat-chip' +
      (s.seat === view.yourSeat ? ' you' : '') +
      (s.seat === turnSeat ? ' current-turn' : '');
    const dot = `<span class="dot ${s.connected ? 'connected' : 'disconnected'}"></span>`;
    const dealerTag = s.seat === view.dealerSeat ? ' (dealer)' : '';
    const isYou = s.seat === view.yourSeat;
    const nameRow = document.createElement('div');
    nameRow.className = 'seat-name-row';
    nameRow.innerHTML = `${dot}<strong>${s.name || '(empty)'}</strong>${dealerTag}`;
    if (isYou) {
      const editBtn = document.createElement('button');
      editBtn.className = 'rename-btn';
      editBtn.title = 'Change your name';
      editBtn.textContent = '✏️';
      editBtn.addEventListener('click', () => openRenameForm(chip, s.name));
      nameRow.appendChild(editBtn);
    }
    chip.appendChild(nameRow);
    const stats = document.createElement('div');
    stats.innerHTML = `Cards: ${s.handCount} &nbsp; Tricks: ${s.tricksWon}<br/>` +
      `Round: ${view.roundScores[s.seat] ?? 0} <span class="total-score">(Total: ${view.scores[s.seat] ?? 0})</span>`;
    chip.appendChild(stats);
    seatsRow.appendChild(chip);
  }

  const hintOn = getHintMode();
  const field = document.getElementById('field');
  field.innerHTML = '';
  if (view.field.length === 0) {
    field.innerHTML = '<em>No cards played yet this trick.</em>';
  } else {
    for (const play of view.field) {
      const wrap = document.createElement('div');
      wrap.className = 'field-card' + (play.seat === view.trickWinnerSeat ? ' winning' : '');
      const name = view.seats.find((s) => s.seat === play.seat)?.name || '';
      wrap.appendChild(renderCardEl(play.card, { dangerous: hintOn && isDangerous(play.card, view) }));
      const label = document.createElement('div');
      label.textContent = name;
      wrap.appendChild(label);
      field.appendChild(wrap);
    }
  }

  const discardBtn = document.getElementById('discard-submit-btn');
  if (view.canDiscard) {
    discardBtn.classList.remove('hidden');
    discardBtn.disabled = selectedForDiscard.length !== 2;
  } else {
    discardBtn.classList.add('hidden');
    selectedForDiscard = [];
  }

  const hand = document.getElementById('hand');
  hand.innerHTML = '';
  const sorted = view.yourHand.slice().sort((a, b) => a.suit.localeCompare(b.suit) || a.rank.localeCompare(b.rank));
  for (const card of sorted) {
    let legal;
    let onClick = null;
    const dangerous = hintOn && isDangerous(card, view);
    if (view.canDiscard) {
      legal = true;
      const isSelected = selectedForDiscard.includes(card.id);
      onClick = () => {
        if (isSelected) {
          selectedForDiscard = selectedForDiscard.filter((id) => id !== card.id);
        } else if (selectedForDiscard.length < 2) {
          selectedForDiscard.push(card.id);
        }
        renderGame(view);
      };
      hand.appendChild(renderCardEl(card, { legal, selected: isSelected, onClick, dangerous }));
      continue;
    }
    if (view.phase === 'trick' && view.currentTurn === view.yourSeat) {
      legal = view.legalCardIds.includes(card.id);
      if (legal) onClick = () => socket.emit('play_card', { cardId: card.id });
    } else if (view.phase === 'trick_complete') {
      legal = false;
    } else {
      legal = undefined;
    }
    hand.appendChild(renderCardEl(card, { legal, onClick, dangerous }));
  }

  renderScoreboard(view);
}

function openRenameForm(chip, currentName) {
  if (renamingOpen) return;
  renamingOpen = true;
  const form = document.createElement('div');
  form.className = 'rename-form';
  form.innerHTML = `<input type="text" maxlength="20" value="${(currentName || '').replace(/"/g, '&quot;')}" />` +
    `<button type="button">Save</button>`;
  chip.appendChild(form);
  const input = form.querySelector('input');
  input.focus();
  input.select();
  const submit = () => {
    const name = input.value.trim();
    if (name) socket.emit('rename', { name });
    form.remove();
    renamingOpen = false;
  };
  form.querySelector('button').addEventListener('click', submit);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submit();
    if (e.key === 'Escape') { form.remove(); renamingOpen = false; }
  });
}

function renderScoreboard(view) {
  const table = document.getElementById('score-table');
  const names = view.seats.map((s) => s.name || `Seat ${s.seat + 1}`);
  let html = '<tr><th>Round</th>' + names.map((n) => `<th>${n}</th>`).join('') + '</tr>';
  for (let roundNumber = 1; roundNumber <= TOTAL_ROUNDS; roundNumber++) {
    const entry = view.roundHistory.find((h) => h.roundNumber === roundNumber);
    html += `<tr><td>${roundNumber}. ${ROUND_NAMES[roundNumber]}</td>` +
      view.seats.map((s) => `<td>${entry ? (entry.perSeatPoints[s.seat] ?? 0) : '---'}</td>`).join('') + '</tr>';
  }
  html += '<tr><th>Total</th>' + view.seats.map((s) => `<th>${view.scores[s.seat] ?? 0}</th>`).join('') + '</tr>';
  table.innerHTML = html;
}

function renderGameOver(view) {
  const table = document.getElementById('final-table');
  const ranked = view.seats
    .map((s) => ({ name: s.name || `Seat ${s.seat + 1}`, score: view.scores[s.seat] ?? 0 }))
    .sort((a, b) => b.score - a.score);
  let html = '<tr><th>Rank</th><th>Player</th><th>Score</th></tr>';
  ranked.forEach((r, i) => {
    html += `<tr><td>${i + 1}</td><td>${r.name}</td><td>${r.score}</td></tr>`;
  });
  table.innerHTML = html;

  const youReady = view.rematchReady.includes(view.yourSeat);
  const playAgainBtn = document.getElementById('play-again-btn');
  playAgainBtn.disabled = youReady;
  playAgainBtn.textContent = youReady ? 'Waiting on others…' : 'Play Again';

  const readyNames = view.rematchReady
    .map((seat) => view.seats.find((s) => s.seat === seat)?.name || `Seat ${seat + 1}`);
  document.getElementById('rematch-status').textContent =
    readyNames.length > 0 ? `Ready: ${readyNames.join(', ')}` : '';
}

document.getElementById('play-again-btn').addEventListener('click', () => {
  socket.emit('play_again');
});

document.getElementById('discard-submit-btn').addEventListener('click', () => {
  if (selectedForDiscard.length === 2) {
    socket.emit('discard', { cardIds: selectedForDiscard });
    selectedForDiscard = [];
  }
});

// Keep the Render free-tier instance warm through mid-game breaks, as long as
// a tab stays open.
setInterval(() => { fetch('/ping').catch(() => {}); }, 60000);
