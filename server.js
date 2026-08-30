const path = require('path');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { GameState } = require('./game/state');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));
app.get('/ping', (req, res) => res.status(204).end());

let game = null; // single fixed game for the whole server, created on first "create_game"
const socketBySeat = new Map(); // seat index -> socket.id
const TRICK_PAUSE_MS = 1600;

function broadcastState() {
  if (!game) return;
  for (const [seat, socketId] of socketBySeat.entries()) {
    const socket = io.sockets.sockets.get(socketId);
    if (socket) socket.emit('state', game.viewForSeat(seat));
  }
}

function sendSetupState(socket) {
  if (!game) {
    socket.emit('need_setup', { stage: 'create' });
    return;
  }
  socket.emit('need_setup', {
    stage: 'seat',
    playerCount: game.playerCount,
    openSeats: game.openSeats(),
    seats: game.seats.map((s) => ({ seat: s.seat, name: s.name })),
  });
}

io.on('connection', (socket) => {
  let mySeat = null;

  socket.on('rejoin', ({ token }) => {
    if (!game) return sendSetupState(socket);
    const seat = game.findSeatByToken(token);
    if (!seat) return sendSetupState(socket);
    mySeat = seat.seat;
    socketBySeat.set(mySeat, socket.id);
    game.setConnected(mySeat, true);
    socket.emit('seat_claimed', { token, seat: mySeat });
    broadcastState();
  });

  socket.on('create_game', ({ playerCount, name }) => {
    if (game) return sendSetupState(socket);
    if (![3, 4].includes(playerCount)) return socket.emit('error_message', 'Player count must be 3 or 4.');
    game = new GameState(playerCount);
    const token = game.claimSeat(0, name || 'Player 1');
    mySeat = 0;
    socketBySeat.set(mySeat, socket.id);
    socket.emit('seat_claimed', { token, seat: mySeat });
    broadcastState();
  });

  socket.on('claim_seat', ({ seatIndex, name }) => {
    if (!game) return sendSetupState(socket);
    const token = game.claimSeat(seatIndex, name || `Player ${seatIndex + 1}`);
    if (!token) return sendSetupState(socket);
    mySeat = seatIndex;
    socketBySeat.set(mySeat, socket.id);
    socket.emit('seat_claimed', { token, seat: mySeat });
    broadcastState();
  });

  socket.on('rename', ({ name }) => {
    if (!game || mySeat === null) return;
    const result = game.renameSeat(mySeat, name);
    if (result.error) socket.emit('error_message', result.error);
    broadcastState();
  });

  socket.on('discard', ({ cardIds }) => {
    if (!game || mySeat === null) return;
    const result = game.discardCards(mySeat, cardIds);
    if (result.error) socket.emit('error_message', result.error);
    broadcastState();
  });

  socket.on('play_card', ({ cardId }) => {
    if (!game || mySeat === null) return;
    const result = game.playCard(mySeat, cardId);
    if (result.error) socket.emit('error_message', result.error);
    broadcastState();
    if (result.trickComplete) {
      setTimeout(() => {
        if (!game) return;
        game.advanceTrick();
        broadcastState();
      }, TRICK_PAUSE_MS);
    }
  });

  socket.on('play_again', () => {
    if (!game || mySeat === null) return;
    const result = game.markReadyForRematch(mySeat);
    if (result.error) socket.emit('error_message', result.error);
    broadcastState();
  });

  socket.on('disconnect', () => {
    if (game && mySeat !== null) {
      game.setConnected(mySeat, false);
      broadcastState();
    }
  });

  sendSetupState(socket);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Kinga listening on port ${PORT}`));
