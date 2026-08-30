const crypto = require('crypto');

function generateToken() {
  return crypto.randomBytes(16).toString('hex');
}

function createSeats(playerCount) {
  return Array.from({ length: playerCount }, (_, seat) => ({
    seat,
    name: null,
    token: null,
    connected: false,
    hand: [],
  }));
}

module.exports = { generateToken, createSeats };
