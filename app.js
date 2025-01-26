const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = 3002;

let players = {};
let scores = [0, 0];
let turn = 0;
let waitingForPlayers = true;
let previousGuess = null;

app.use(express.static('public'));

// Define route mappings
const pages = ['/', '/games', '/movies', '/playlist', '/advice', '/about', '/login'];
pages.forEach((route) => {
    app.get(route, (req, res) => {
        res.sendFile(path.join(__dirname, `public${route === '/' ? '/index' : route}.html`));
    });
});

io.on('connection', (socket) => {
    console.log(`A user connected: ${socket.id}`);

    socket.on('joinGame', () => {
        if (players[socket.id]) {
            socket.emit('message', 'You have already joined the game.');
            return;
        }

        if (Object.keys(players).length < 2) {
            players[socket.id] = Object.keys(players).length + 1;
            socket.emit('playerNumber', players[socket.id]);
            console.log(`Player ${players[socket.id]} joined: ${socket.id}`);

            if (Object.keys(players).length === 2) {
                waitingForPlayers = false;
                io.emit('message', "Both players connected. Player 1's turn to guess a number.");
                io.emit('gameReady', true);
            } else {
                socket.emit('message', 'Waiting for another player to join...');
            }
        } else {
            socket.emit('message', 'Game is full.');
            socket.disconnect();
        }
    });

    socket.on('playerChoice', (number) => {
        if (waitingForPlayers || Object.keys(players).length < 2) {
            socket.emit('message', 'Waiting for both players to connect...');
            return;
        }

        const currentPlayer = Object.keys(players)[turn % 2];
        if (socket.id !== currentPlayer) {
            socket.emit('message', "It's not your turn!");
            return;
        }

        if (previousGuess === null) {
            previousGuess = number;
            io.to(Object.keys(players).find(id => id !== socket.id)).emit('message', 'Your turn to guess the number.');
        } else {
            const opponentId = Object.keys(players).find(id => id !== socket.id);
            if (number === previousGuess) {
                scores[players[socket.id] - 1] += 2;
            } else {
                scores[players[opponentId] - 1] += 1;
            }

            previousGuess = null;
            turn++;
            io.emit('updateScore', scores);
            io.emit('message', `Player ${turn % 2 + 1}'s turn to guess.`);

            if (scores.some(score => score >= 20)) {
                const winner = scores[0] >= 20 ? 'Player 1' : 'Player 2';
                io.emit('gameOver', winner);
                resetGame();
            }
        }
    });

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
        if (players[socket.id]) {
            delete players[socket.id];
            resetGame();
            io.emit('message', 'A player has disconnected. Waiting for a new player...');
        }
    });
});

function resetGame() {
    players = {};
    scores = [0, 0];
    turn = 0;
    waitingForPlayers = true;
    previousGuess = null;
}

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});


