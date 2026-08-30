const socket = io();

const SUIT_SYMBOL = { S: '♠', H: '♥', D: '♦', C: '♣' };
const RED_SUITS = ['H', 'D'];

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

function renderCardEl(card, { legal, selected, onClick }) {
  const el = document.createElement('div');
  const label = cardLabel(card);
  el.className = 'card' + (label.red ? ' red' : '') + (legal === false ? ' illegal' : '') + (selected ? ' selected' : '');
  el.innerHTML = `<div>${label.rank}</div><div>${label.suit}</div>`;
  if (onClick) el.addEventListener('click', onClick);
  return el;
}

function renderGame(view) {
  document.getElementById('round-info').textContent =
    `Round ${view.roundNumber}/8: ${view.roundName} — trick ${view.tricksTaken + (view.phase === 'trick' ? 1 : 0)}/${view.totalTricks}`;

  const turnSeat = view.phase === 'discard' ? view.currentLeader : view.currentTurn;
  const turnName = view.seats.find((s) => s.seat === turnSeat)?.name || '';
  document.getElementById('turn-info').textContent =
    turnSeat === view.yourSeat ? "Your turn" : turnSeat !== null ? `Waiting on ${turnName}` : '';

  const seatsRow = document.getElementById('seats-row');
  seatsRow.innerHTML = '';
  for (const s of view.seats) {
    const chip = document.createElement('div');
    chip.className = 'seat-chip' +
      (s.seat === view.yourSeat ? ' you' : '') +
      (s.seat === turnSeat ? ' current-turn' : '');
    const dot = `<span class="dot ${s.connected ? 'connected' : 'disconnected'}"></span>`;
    const dealerTag = s.seat === view.dealerSeat ? ' (dealer)' : '';
    chip.innerHTML = `${dot}<strong>${s.name || '(empty)'}</strong>${dealerTag}<br/>Cards: ${s.handCount} &nbsp; Tricks: ${s.tricksWon} &nbsp; Score: ${view.scores[s.seat] ?? 0}`;
    seatsRow.appendChild(chip);
  }

  const field = document.getElementById('field');
  field.innerHTML = '';
  if (view.field.length === 0) {
    field.innerHTML = '<em>No cards played yet this trick.</em>';
  } else {
    for (const play of view.field) {
      const wrap = document.createElement('div');
      wrap.className = 'field-card';
      const name = view.seats.find((s) => s.seat === play.seat)?.name || '';
      wrap.appendChild(renderCardEl(play.card, {}));
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
      hand.appendChild(renderCardEl(card, { legal, selected: isSelected, onClick }));
      continue;
    }
    if (view.phase === 'trick' && view.currentTurn === view.yourSeat) {
      legal = view.legalCardIds.includes(card.id);
      if (legal) onClick = () => socket.emit('play_card', { cardId: card.id });
    } else {
      legal = undefined;
    }
    hand.appendChild(renderCardEl(card, { legal, onClick }));
  }

  renderScoreboard(view);
}

function renderScoreboard(view) {
  const table = document.getElementById('score-table');
  const names = view.seats.map((s) => s.name || `Seat ${s.seat + 1}`);
  let html = '<tr><th>Round</th>' + names.map((n) => `<th>${n}</th>`).join('') + '</tr>';
  for (const entry of view.roundHistory) {
    html += `<tr><td>${entry.roundNumber}. ${entry.roundName}</td>` +
      view.seats.map((s) => `<td>${entry.perSeatPoints[s.seat] ?? 0}</td>`).join('') + '</tr>';
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
}

document.getElementById('discard-submit-btn').addEventListener('click', () => {
  if (selectedForDiscard.length === 2) {
    socket.emit('discard', { cardIds: selectedForDiscard });
    selectedForDiscard = [];
  }
});

// Keep the Render free-tier instance warm through mid-game breaks, as long as
// a tab stays open.
setInterval(() => { fetch('/ping').catch(() => {}); }, 60000);
